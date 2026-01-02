import React from 'react';
import { BuildingType } from '../types';
import type { Tile as TileType } from '../types';
import { Home, Factory, ShoppingBag, Zap, AlertTriangle, Briefcase, Package, Users, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import { BUILDING_STATS } from '../config/buildingStats';

interface TileProps {
    tile: TileType;
    onClick?: () => void;
    className?: string; // Additional classes for the container
}

export const Tile: React.FC<TileProps> = ({ tile, onClick, className }) => {
    const stats = BUILDING_STATS[tile.type][tile.tier];
    const [showTooltip, setShowTooltip] = React.useState(false);
    const currentStars = tile.stars || 0;

    const getColors = (type: BuildingType) => {
        switch (type) {
            case BuildingType.Residential: return 'bg-green-500 border-green-700 text-white';
            case BuildingType.Factory: return 'bg-amber-600 border-amber-800 text-white';
            case BuildingType.Shop: return 'bg-blue-500 border-blue-700 text-white';
            case BuildingType.Power: return 'bg-purple-500 border-purple-700 text-white';
        }
    };

    const getIcon = (type: BuildingType) => {
        switch (type) {
            case BuildingType.Residential: return <Home size={20} />;
            case BuildingType.Factory: return <Factory size={20} />;
            case BuildingType.Shop: return <ShoppingBag size={20} />;
            case BuildingType.Power: return <Zap size={20} />;
        }
    };

    // --- Tooltip Logic ---


    // Requirements for NEXT level


    // Current Production - Safely handle missing tiers (fallback to T1 if active, or empty)
    const currentProd = currentStars > 0
        ? (stats.produces[currentStars as 1 | 2 | 3] || stats.produces[1] || {})
        : {};

    // Formatting helpers
    const formatRes = (res: Record<string, number>) => Object.entries(res).map(([k, v]) => `${k}:${v}`).join(', ');

    const producesStr = formatRes(currentProd);




    const getDisabledIcon = () => {
        if (!tile.disabledReason) return <AlertTriangle size={24} className="text-red-500 animate-pulse" />;

        switch (tile.disabledReason) {
            case 'power': return <Zap size={24} className="text-red-500 animate-pulse" />;
            case 'jobs': return <Briefcase size={24} className="text-red-500 animate-pulse" />;
            case 'goods': return <Package size={24} className="text-red-500 animate-pulse" />;
            case 'population': return <Users size={24} className="text-red-500 animate-pulse" />;
            case 'money': return <DollarSign size={24} className="text-red-500 animate-pulse" />;
            default: return <AlertTriangle size={24} className="text-red-500 animate-pulse opacity-80" />;
        }
    };

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className={clsx(
                "w-full h-full rounded-md border-b-4 relative cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-md select-none",
                className
            )}
        >
            {/* Main Content */}
            <div className={clsx(
                "w-full h-full flex flex-col items-center justify-center rounded-md relative", // Added relative for stars positioning
                getColors(tile.type),
                currentStars === 0 && "opacity-50 grayscale"
            )}>
                <div className="flex flex-col items-center">
                    {getIcon(tile.type)}
                    <span className="font-bold text-xs mt-0.5">Lvl {tile.tier}</span>
                </div>

                {/* Star Overlay */}
                {currentStars > 0 && (
                    <div className="absolute -top-1 -right-1 flex space-x-[-2px]">
                        {[...Array(currentStars)].map((_, i) => (
                            <div key={i} className="text-yellow-300 drop-shadow-md pb-1">★</div>
                        ))}
                    </div>
                )}

                {/* Upkeep Paid Overlay */}
                {tile.upkeepPaid && (
                    <div className="absolute -top-2 -left-2 bg-yellow-500 text-black rounded-full p-0.5 shadow-sm z-10 scale-75 border border-white">
                        <DollarSign size={14} strokeWidth={3} />
                    </div>
                )}
            </div>

            {/* Disabled Overlay */}
            {currentStars === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md pointer-events-none">
                    {getDisabledIcon()}
                </div>
            )}

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full mb-2 z-50 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none border border-slate-700 opacity-100 font-sans">
                    {/* Header */}
                    <div className="mb-2 border-b border-slate-700 pb-2 flex justify-between items-start">
                        <div>
                            <div className="font-bold text-sm text-slate-100">{tile.type}</div>
                            <div className="text-slate-400 text-[10px] uppercase tracking-wide">Tier {tile.tier} Architecture</div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className={clsx("font-bold text-[10px] px-1.5 py-0.5 rounded",
                                currentStars === 3 ? "bg-yellow-500/20 text-yellow-300" :
                                    currentStars === 2 ? "bg-blue-500/20 text-blue-300" :
                                        currentStars === 1 ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                            )}>
                                {tile.type === BuildingType.Power ? (
                                    currentStars === 3 ? "OVERLOADED" :
                                        currentStars === 2 ? "HIGH LOAD" :
                                            currentStars === 1 ? "ACTIVE" : "OFFLINE"
                                ) : (
                                    currentStars === 3 ? "OPTIMAL" :
                                        currentStars === 2 ? "EFFICIENT" :
                                            currentStars === 1 ? "STANDARD" : "DISABLED"
                                )}
                            </div>
                            {currentStars > 0 && <div className="text-yellow-500 text-[10px] mt-0.5">{currentStars}★ Quality</div>}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Status/Error for Disabled */}
                        {currentStars === 0 && (
                            <div className="p-2 bg-red-950/30 border border-red-900/50 rounded text-red-300 flex items-start gap-2">
                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="font-bold">Building Disabled</div>
                                    <div className="text-[10px] opacity-80">Missing: <span className="uppercase font-bold">{tile.disabledReason || "Unknown"}</span></div>
                                </div>
                            </div>
                        )}

                        {/* SECTION 1: PERFORMANCE (What you get) */}
                        {currentStars > 0 && producesStr && (
                            <div>
                                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Performance (Output)</div>
                                <div className="text-slate-200 bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
                                    {producesStr}
                                </div>
                            </div>
                        )}

                        {/* SECTION 2: BASE COST (Fixed) */}
                        <div className={clsx(currentStars === 0 && "opacity-50")}>
                            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Base Cost (Required)</div>
                            <div className="text-slate-300">
                                {formatRes(stats.baseRequirements) || <span className="text-slate-500 italic">None</span>}
                            </div>
                        </div>

                        {/* SECTION 3: STAR COST (Variable) */}
                        {currentStars > 1 && (
                            <div className="animate-in fade-in slide-in-from-left-1">
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-[9px] uppercase tracking-wider text-yellow-500/80 font-bold">
                                        {tile.type === BuildingType.Power ? "Grid Penalty" : "Quality Cost"} ({currentStars}★)
                                    </span>
                                </div>
                                <div className="text-yellow-200/90 bg-yellow-900/10 p-1.5 rounded border border-yellow-900/30">
                                    {(() => {
                                        const reqs = stats.starRequirements?.[currentStars as 2 | 3];
                                        return reqs ? formatRes(reqs) : <span className="italic">None</span>;
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* IDLE / OPTIONAL UPKEEP INFO */}
                        {stats.optionalUpkeep && (
                            <div className={clsx("p-1.5 rounded border", tile.upkeepPaid ? "bg-indigo-900/20 border-indigo-500/30" : "bg-slate-800/30 border-slate-700")}>
                                <div className="flex justify-between items-center text-xs">
                                    <span className={clsx("font-bold", tile.upkeepPaid ? "text-indigo-300" : "text-slate-400")}>
                                        Optional Boost {tile.upkeepPaid ? "(Active)" : "(Inactive)"}
                                    </span>
                                    <div className="flex items-center gap-1 text-[10px]">
                                        <span className="text-red-300">-{stats.optionalUpkeep.cost.money}g</span>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 pl-1 border-l-2 border-indigo-500/20">
                                    Effects:
                                    {stats.optionalUpkeep.effects.starBonus && <span className="block text-indigo-200">+{stats.optionalUpkeep.effects.starBonus} Star Level</span>}
                                    {stats.optionalUpkeep.effects.outputMultiplier && <span className="block text-indigo-200">x{stats.optionalUpkeep.effects.outputMultiplier} Output</span>}
                                </div>
                            </div>
                        )}

                        {/* SECTION 4: NEXT LEVEL */}
                        {/* Only show if we can upgrade AND we are not at 0 stars (which overrides with 'Disabled') */}
                        {currentStars > 0 && currentStars < 3 && (
                            <div className="pt-2 border-t border-slate-700/50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] uppercase tracking-wider text-blue-400 font-bold">
                                        Next Level ({currentStars + 1}★)
                                    </span>
                                    {tile.missingReqs ? (
                                        <span className="text-[10px] text-red-400 font-bold bg-red-950/30 px-1 rounded">MISSING: {tile.missingReqs.toUpperCase()}</span>
                                    ) : (
                                        <span className="text-[10px] text-green-400 font-bold">Ready for Upgrade</span>
                                    )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    Additional Cost: {stats.starRequirements && stats.starRequirements[(currentStars + 1) as 2 | 3] ? formatRes(stats.starRequirements[(currentStars + 1) as 2 | 3]) : "None"}
                                </div>
                            </div>
                        )}

                        {tile.type === BuildingType.Power && currentStars === 3 && (
                            <div className="pt-2 border-t border-red-900/30 text-red-400 text-[10px] italic text-center">
                                Warning: Grid is under high stress.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
