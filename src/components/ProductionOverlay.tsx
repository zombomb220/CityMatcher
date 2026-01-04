
import React, { useMemo, useState } from 'react';
import type { Tile as TileType } from '../types';
import { BUILDING_STATS } from '../config/buildingStats';
import { useGameStore } from '../store/gameStore';
import { Zap, Package, Users, Smile, DollarSign, Factory, Briefcase, Activity } from 'lucide-react';
import { clsx } from 'clsx';

interface ProductionOverlayProps {
    tile: TileType;
    onClose?: () => void;
}

// Minimalist Icon Mapping
const getResourceIcon = (res: string, size: number = 14) => {
    switch (res) {
        case 'power': return <Zap size={size} className="text-purple-400" />;
        case 'products': return <Package size={size} className="text-blue-400" />;
        case 'workforce': return <Briefcase size={size} className="text-amber-700" />; // Workforce Input
        case 'population': return <Users size={size} className="text-green-400" />;
        case 'happiness': return <Smile size={size} className="text-yellow-400" />;
        case 'money': return <DollarSign size={size} className="text-emerald-400" />;
        case 'raw_goods': return <Factory size={size} className="text-amber-400" />; // Using Factory icon for raw goods/materials
        case 'turn': return <Activity size={size} className="text-slate-400" />; // For 'Turn' requirement
        default: return <div className="w-3 h-3 bg-slate-500 rounded-full" />;
    }
};

const getResourceColor = (res: string) => {
    switch (res) {
        case 'power': return 'text-purple-300';
        case 'products': return 'text-blue-300';
        case 'workforce': return 'text-amber-300';
        case 'population': return 'text-green-300';
        case 'happiness': return 'text-yellow-300';
        case 'money': return 'text-emerald-300';
        case 'raw_goods': return 'text-amber-300';
        default: return 'text-slate-300';
    }
};

export const ProductionOverlay: React.FC<ProductionOverlayProps> = ({ tile }) => {
    const { city } = useGameStore();
    const [hoveredStar, setHoveredStar] = useState<number | null>(null);

    const stats = BUILDING_STATS[tile.type][tile.tier as unknown as '1' | '2' | '3'];
    const currentStars = tile.stars || 0;

    // Determine which "Level" we are visualizing
    // If hovering a star, show requirements for THAT star level.
    // If not, show requirements for CURRENT active level (or Level 1 if disabled? No, if disabled, show why).
    // Actually, if disabled (stars=0), we likely want to show Level 1 requirements so user knows how to fix it.
    const targetLevel = hoveredStar !== null ? hoveredStar : (currentStars === 0 ? 1 : currentStars);

    // Calculate Requirements for Target Level
    const requirements = useMemo(() => {
        const reqs: Record<string, number> = {};

        // Base Reqs (Always Needed)
        if (stats.baseRequirements) {
            Object.entries(stats.baseRequirements).forEach(([k, v]) => {
                reqs[k] = (reqs[k] || 0) + v;
            });
        }

        // Star Reqs (Additive up to Target Level)
        if (stats.starRequirements) {
            // If target is 2, add starReqs[2]. If 3, add starReqs[2] AND starReqs[3]? 
            // Game logic usually implies cumulative difficulty or replacing? 
            // Looking at `Tile.tsx`, it displayed "Base" + "Quality Cost (CurrentStars)".
            // It did NOT sum 1..Current. It just took `starRequirements[currentStars]`.
            // So: Total = Base + StarRows[TargetLevel] (if exists).

            // Wait, if I am Star 3, do I pay Star 2 cost? 
            // Tile.tsx line 187: `const reqs = stats.starRequirements?.[currentStars]`
            // It suggests discrete costs per level bucket.

            if (targetLevel > 1) {
                const starReq = stats.starRequirements[targetLevel as 2 | 3];
                if (starReq) {
                    Object.entries(starReq).forEach(([k, v]) => {
                        reqs[k] = (reqs[k] || 0) + v;
                    });
                }
            }
        }
        return reqs;
    }, [stats, targetLevel]);

    // Calculate Outputs for Target Level
    const outputs = useMemo(() => {
        // Outputs are defined in `produces[level]`
        return stats.produces?.[targetLevel as 1 | 2 | 3] || {};
    }, [stats, targetLevel]);

    // Helper to check availability
    const checkAvailability = (res: string, reqAmount: number) => {
        // 1. If building is ACTIVE and not hovering a future star, it's satisfied (mostly).
        //    Exceptions: If we are debugging why it's disabled.

        // Resource Sources:
        // - Global (Power, Money, Workforce Free?) -> city.xyzAvailable or city.money
        // - Local (Raw Goods) -> tile.storage

        let available = 0;
        let isSatisfied = false;

        if (res === 'power') {
            // For power, if we are consuming it, we HAVE it. 
            // If we are checking future, we check `city.powerAvailable`.
            // But `powerAvailable` is NET free power.
            // If I am already using 1 power, and I need 2 for next level.
            // My "Available" to upgrade is (Existing Allocation + Net Free).
            // But that's complex logic. 
            // Simplified: Show Net Free? Or just "Current / Req"?
            available = city.powerAvailable;
            // If I am currently effectively using it, it's implicitly available?
        } else if (res === 'money') {
            available = city.money;
        } else if (res === 'workforce') {
            available = city.workforceAvailable; // Unemployed? 
        } else if (res === 'raw_goods') {
            available = tile.storage?.['raw_goods'] || 0;
        } else if (res === 'products') {
            available = tile.storage?.['products'] || 0;
            // Note: Residental consumes products? Currently Residential consumes products for Star 2/3.
            // BUT Residential doesn't have storage usually? "Local storage unless directly interactive".
            // Actually `Tile.tsx` checks `tile.storage`.
            // If Residential consumes Global Products (Market logic?), wait.
            // `gameData` says Residential consumes products. Where from? 
            // If no shop, maybe they consume global `productsAvailable`.
            if (!tile.storage?.['products']) {
                available = city.productsAvailable;
            }
        } else if (res === 'population') {
            available = city.population;
        } else if (res === 'happiness') {
            available = city.happiness;
        }

        // Logic check
        // If we are ALREADY satisfying this level (currentStars >= targetLevel and not disabled), then ✅
        if (currentStars >= targetLevel && tile.stars !== 0) {
            isSatisfied = true;
            available = reqAmount; // Fake it to show "1/1" or similar
        } else {
            isSatisfied = available >= reqAmount;
        }

        return { available, isSatisfied };
    };

    return (
        <div className="absolute left-full pl-4 bottom-0 z-50 flex flex-col items-center pointer-events-auto">
            {/* The "Anchor" Line */}
            <div className="absolute right-full bottom-6 w-4 h-0.5 bg-slate-600/50" />

            {/* Container */}
            <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-slate-700/50 min-w-[200px] pointer-events-auto">

                {/* OUTPUTS (Top) - "Floats Up" */}
                {Object.keys(outputs).length > 0 && (
                    <div className="flex flex-col items-center mb-3 space-y-1 animate-in slide-in-from-bottom-2 fade-in duration-500">
                        {Object.entries(outputs).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-2 text-xs font-bold bg-slate-800/80 px-2 py-1 rounded-full border border-slate-700/50 shadow-sm">
                                <span className="text-emerald-400">↑</span>
                                {getResourceIcon(key)}
                                <span className={getResourceColor(key)}>{val}</span>
                                <span className="capitalize text-slate-400">{key.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Node Box */}
                <div className="flex flex-col gap-3">

                    {/* Header / Name (Minimal) */}
                    <div className="text-center border-b border-slate-800 pb-2">
                        <div className="font-bold text-slate-200 text-sm tracking-wide">{stats.produces ? "Production" : "Utility"}</div>
                    </div>

                    {/* INPUTS (Left/Center Flow) */}
                    <div className="space-y-1.5">
                        {Object.keys(requirements).length === 0 ? (
                            <div className="text-center text-slate-500 text-[10px] py-2">No Inputs Required</div>
                        ) : (
                            Object.entries(requirements).map(([key, reqAmount]) => {
                                const { available, isSatisfied } = checkAvailability(key, reqAmount);
                                // If blocked (hovering future level), show red X. If satisfied, show check? 
                                // Prompt: "Green = satisfied, Red = missing"
                                // "1 / 3 ❌"

                                return (
                                    <div key={key} className={clsx(
                                        "flex items-center justify-between text-xs px-2 py-1.5 rounded-md transition-colors",
                                        isSatisfied ? "bg-slate-800/50" : "bg-red-900/20 border border-red-900/30"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-red-400 font-bold">↓</span>
                                            {getResourceIcon(key)}
                                            <span className="text-slate-300 capitalize text-[11px]">{key.replace('_', ' ')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 pl-3">
                                            <span className={clsx("font-mono font-medium", isSatisfied ? "text-slate-400" : "text-red-400")}>
                                                {isSatisfied ? "" : `${Math.floor(available)} / `}{reqAmount}
                                            </span>
                                            {isSatisfied ? (
                                                <span className="text-green-500 text-[10px]">✅</span>
                                            ) : (
                                                <span className="text-red-500 text-[10px]">❌</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Star Rail (Bottom) */}
                    <div className="pt-2 flex justify-center items-center gap-1">
                        {[1, 2, 3].map((starLvl) => {
                            const isUnlocked = currentStars >= starLvl;

                            // Locked State: Hollow Circle or Dimmed Star
                            // Prompt: "● = current star level, ○ = locked star"
                            // "Star 2 should feel achievable... Star 3 aspirational"

                            return (
                                <div
                                    key={starLvl}
                                    className="relative group cursor-pointer p-1"
                                    onMouseEnter={() => setHoveredStar(starLvl)}
                                    onMouseLeave={() => setHoveredStar(null)}
                                >
                                    {/* Connector Line (Left of star if > 1) */}
                                    {starLvl > 1 && (
                                        <div className={clsx(
                                            "absolute top-1/2 right-full h-[1px] w-3 -translate-y-1/2 pointer-events-none",
                                            currentStars >= starLvl ? "bg-yellow-500/50" : "bg-slate-700"
                                        )} />
                                    )}

                                    {/* Star Dot */}
                                    <div className={clsx(
                                        "w-3 h-3 rounded-full transition-all duration-300 border",
                                        isUnlocked ? "bg-yellow-400 border-yellow-500 shadow-[0_0_8px_rgba(250,204,21,0.5)]" :
                                            "bg-transparent border-slate-600 hover:border-slate-400 scale-90"
                                    )}>
                                        {/* Inner active dot if unlocked? Already solid bg. */}
                                    </div>

                                    {/* Hover "Highlight" handled by parent state 'hoveredStar' affecting Inputs */}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
