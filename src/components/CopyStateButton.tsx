import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { type TurnSnapshot, BuildingType } from '../types';

const CopyStateButton: React.FC = () => {
    const turnHistory = useGameStore(state => state.turnHistory);
    const [status, setStatus] = useState<string>('');

    const formatHistory = (history: TurnSnapshot[]): string => {
        const totalTurns = history.length;
        const versionString = "v0.1.0"; // Placeholder or import from config if available

        let output = `=== FULL GAME STATE ===\n`;
        output += `Turns: ${totalTurns}\n`;
        output += `ResolverVersion: ${versionString}\n`;

        history.forEach(snapshot => {
            const { turnNumber, action, city, grid, stats } = snapshot;

            output += `\n--------------------\n`;
            output += `TURN ${turnNumber}\n`;
            output += `Action: ${action}\n\n`;

            // Resources
            output += `Resources:\n`;
            output += `Pop: ${city.population} (Happiness: ${city.happiness})\n`;
            output += `Workforce: ${city.workforceAvailable} / Unemployed: ${city.unemployed}\n`;
            output += `Raw Goods: ${city.rawGoodsAvailable} / Products: ${city.productsAvailable}\n`;
            output += `Money=${city.money}  Power=${stats.powerProduced} (Used=${stats.powerConsumed})  StabilityDebt=${city.stabilityDebt}\n`;
            output += `Economics: Tax=${stats.popTaxRevenue || 0}  FixedCosts=${stats.fixedCostsTotal || 0}  UpkeepTotal=${stats.upkeepCostsTotal || 0}\n`;


            // Buildings
            output += `Buildings:\n`;
            const buildings: string[] = [];
            // Sort building output for consistency? The grid iteration order is stable.
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[0].length; c++) {
                    const t = grid[r][c].tile;
                    if (t) {
                        buildings.push(`${t.type}_T${t.tier}(${t.stars}★${t.upkeepPaid ? '+U' : ''})`);
                    }
                }
            }
            output += buildings.join(' ') + '\n\n';

            // PowerGrid
            const utilPercent = Math.round(stats.powerUtilization * 100);
            output += `PowerGrid:\n`;
            output += `Produced=${stats.powerProduced}  Used=${stats.powerConsumed}  Utilization=${utilPercent}%  Stars=${stats.powerStars}★\n\n`;

            // StarAllocation
            // We need to re-scan grid in snapshot to find who has star 2/3
            const star2List: string[] = [];
            const star3List: string[] = [];
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[0].length; c++) {
                    const t = grid[r][c].tile;
                    if (t) {
                        // The Request format says: "BuildingType_Tier(stars)" in Buildings section.
                        // Ideally here we want human readable "Factory_T1" or unique ID?
                        // Let's use `${t.type}_T${t.tier}`. Duplicate names OK?
                        // "granted to: {commaSeparatedList}" usually implies a list of beneficiaries.
                        // Let's include coordinates to be precise if needed, or just types if it's summary.
                        // Given implementation rules "exact per-turn format below", but sample says "{commaSeparatedList or "none"}".
                        // I will use `Type_Tier` for brevity, as coordinates aren't strictly asked for but are useful.
                        // Let's stick to Type_Tier.
                        if (t.stars >= 2 && t.type !== BuildingType.Power) star2List.push(`${t.type}_T${t.tier}`);
                        if (t.stars >= 3 && t.type !== BuildingType.Power) star3List.push(`${t.type}_T${t.tier}`);

                    }
                }
            }
            output += `StarAllocation:\n`;
            output += `⭐⭐ granted to: ${star2List.length > 0 ? star2List.join(', ') : "none"}\n`;
            output += `⭐⭐⭐ granted to: ${star3List.length > 0 ? star3List.join(', ') : "none"}\n\n`;

            // Blueprints
            output += `Blueprints:\n`;
            output += `ActiveSlots=${city.blueprintState.activeSlots.length}/${city.blueprintState.maxSlots}\n`;
            // Unlocked IDs
            output += `Unlocked=[${city.blueprintState.unlockedIds.join(', ')}]\n`;
        });

        return output;
    };

    const handleCopy = async () => {
        const text = formatHistory(turnHistory);
        try {
            await navigator.clipboard.writeText(text);
            setStatus('Full game state copied');
            setTimeout(() => setStatus(''), 2000);
        } catch (err) {
            console.error('Failed to copy keys', err);
            setStatus('Failed to copy');
        }
    };

    return (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {status && <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>{status}</span>}
            <button
                onClick={handleCopy}
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#4ade80',
                    color: '#064e3b',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                }}
            >
                Copy Full Game State
            </button>
        </div>
    );
};

export default CopyStateButton;
