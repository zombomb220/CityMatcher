
import type { CityState, Tile, Cell, Resources } from '../../types';
import { ResourceType } from '../../types';
import { BUILDING_STATS } from '../../config/buildingStats';
import { getTilesInRadius } from '../grid';

// Contract: Consumption Phase
// 1. Determine Needs (Base + Next Star?) -> No, just sustain current or try next?
//    - Plan: "Try to satisfy Star 1, then 2, then 3".
// 2. Find Sources (Neighbors)
//    - Priority: Neighbor.producedThisTurn > Neighbor.storage
// 3. Deduct & Finalize State

export const resolveConsumption = (
    city: CityState,
    grid: Cell[][],
    tiles: { r: number, c: number, tile: Tile }[],
    trackChange: (res: string, amt: number, src: string) => void,
    buildingAlerts: any[]
): { unmetPowerDemand: number } => {
    let unmetPowerDemand = 0;

    // Helper: Sort by Priority
    const sortedTiles = [...tiles].sort((a, b) => {
        const pA = BUILDING_STATS[a.tile.type]?.[String(a.tile.tier) as "1"]?.priority ?? 10;
        const pB = BUILDING_STATS[b.tile.type]?.[String(b.tile.tier) as "1"]?.priority ?? 10;
        return pA - pB || a.tile.id.localeCompare(b.tile.id);
    });

    for (const { r, c, tile } of sortedTiles) {
        const stats = BUILDING_STATS[tile.type]?.[String(tile.tier) as "1" | "2"];
        if (!stats) continue;

        const radius = stats.influenceRadius || 2;
        const neighbors = getTilesInRadius(grid, r, c, radius);

        // Sorting neighbors: Nearest first?
        // Let's sort by distance for consistent behavior.
        neighbors.sort((a, b) => {
            const distA = Math.max(Math.abs(a.r - r), Math.abs(a.c - c));
            const distB = Math.max(Math.abs(b.r - r), Math.abs(b.c - c));
            return distA - distB;
        });

        // Function to attempt satisfaction of a requirement set
        // Returns "Commit Function" if successful, "null" if failed
        const canSatisfy = (reqs: Resources): (() => void) | null => {
            if (!reqs) return () => { };

            const transactions: (() => void)[] = [];

            for (const [res, amount] of Object.entries(reqs)) {
                if (amount <= 0) continue;
                let needed = amount;

                // 1. Global Resources (Money, Power, Workforce)
                if (res === ResourceType.Money) {
                    if (city.money < needed) return null;
                    transactions.push(() => {
                        city.money -= needed;
                        trackChange(ResourceType.Money, -needed, tile.type);
                    });
                    continue;
                }
                if (res === ResourceType.Power) {
                    // Power is Global "Available" pool in City
                    if (city.powerAvailable < needed) return null;
                    // Power is capacity-based now (per previous context?), or consumed?
                    // "Power=9 (Used=0)". This implies consumption.
                    // So we track usage.
                    transactions.push(() => {
                        city.powerAvailable -= needed;
                        trackChange(ResourceType.Power, -needed, tile.type);
                    });
                    continue;
                }
                if (res === ResourceType.Workforce) {
                    // Workforce is capacity/pool based.
                    if (city.workforceAvailable < needed) return null;
                    transactions.push(() => {
                        city.workforceAvailable -= needed;
                        trackChange(ResourceType.Workforce, -needed, tile.type);
                    });
                    continue;
                }

                // 2. Local Resources (RawGoods, Products) -> Neighbors
                // Self Storage First
                if (tile.storage?.[res]) {
                    const take = Math.min(tile.storage[res]!, needed);
                    needed -= take;
                    transactions.push(() => {
                        tile.storage![res]! -= take;
                        trackChange(res, -take, tile.type);
                    });
                }

                if (needed <= 0) continue;

                // Neighbors
                for (const n of neighbors) {
                    if (needed <= 0) break;

                    // Priority 1: producedThisTurn
                    if (n.tile.producedThisTurn?.[res]) {
                        const take = Math.min(n.tile.producedThisTurn[res]!, needed);
                        needed -= take;
                        transactions.push(() => {
                            n.tile.producedThisTurn![res]! -= take;
                            trackChange(res, -take, tile.type);
                        });
                    }

                    if (needed <= 0) break;

                    // Priority 2: storage
                    if (n.tile.storage?.[res]) {
                        const take = Math.min(n.tile.storage[res]!, needed);
                        needed -= take;
                        transactions.push(() => {
                            n.tile.storage![res]! -= take;
                            trackChange(res, -take, tile.type);
                        });
                    }
                }

                if (needed > 0) return null; // Failed to satisfy
            }

            // Return master commit function
            return () => transactions.forEach(t => t());
        };

        // Star Logic: Try 3 -> 2 -> 1 -> Fail
        // If 0 stars previously, try 1.

        let targetStars = 0;
        let commitFn: (() => void) | null = null;
        let missingReason = "";

        // Determine potential max stars based on previous state?
        // Or always try max?
        // "Try Highest Possible"

        // Star 3
        if (stats.starRequirements?.["3"]) {
            const reqs3 = { ...stats.baseRequirements, ...stats.starRequirements["3"] };
            const commit3 = canSatisfy(reqs3);
            if (commit3) {
                targetStars = 3;
                commitFn = commit3;
            }
        }

        // Star 2 (if not 3)
        if (targetStars === 0 && stats.starRequirements?.["2"]) {
            const reqs2 = { ...stats.baseRequirements, ...stats.starRequirements["2"] };
            const commit2 = canSatisfy(reqs2);
            if (commit2) {
                targetStars = 2;
                commitFn = commit2;
            }
        }

        // Star 1 (Base) (if not 2 or 3)
        if (targetStars === 0) {
            const reqs1 = stats.baseRequirements || {};
            const commit1 = canSatisfy(reqs1);
            if (commit1) {
                targetStars = 1;
                commitFn = commit1;
            } else {
                // Determine missing reason from Base Reqs for UI
                missingReason = Object.keys(reqs1).find(r => !canSatisfy({ [r]: reqs1[r] as number })) || "Input";
            }
        }

        // Commit and Update
        if (targetStars > 0 && commitFn) {
            commitFn();
            tile.stars = targetStars;
            tile.disabled = false;
        } else {
            tile.stars = 0;
            tile.disabled = true;
            tile.disabledReason = `Missing ${missingReason}`;
            buildingAlerts.push({ id: tile.id, type: 'disable', message: `Missing ${missingReason}` });

            // Track Unmet Power Demand for Brownout Logic
            if (missingReason === ResourceType.Power || missingReason === 'power') {
                const basePower = stats.baseRequirements?.power || 0;
                unmetPowerDemand += basePower;
            }
        }
    }

    // Cleanup Zombie Production
    for (const { tile } of tiles) {
        if (tile.disabled) {
            // We accept Zombie Production for inertia (see notes above)
        }
    }

    return { unmetPowerDemand };
};
