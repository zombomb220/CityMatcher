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
    isInfluenced?: boolean;
    isHovered?: boolean;
    isGhost?: boolean;
    isSelected?: boolean;
}

export const Tile: React.FC<TileProps> = ({ tile, onClick, className, isInfluenced, isHovered, isGhost, isSelected }) => {
    const stats = BUILDING_STATS[tile.type][tile.tier as unknown as '1' | '2' | '3'];
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

    // Helper to identify resource locality
    const isLocal = (res: string) => !['money', 'population', 'happiness'].includes(res);

    // Formatting helpers
    const formatRes = (res: Record<string, number>) => Object.entries(res).map(([k, v]) =>
        `${k}:${v}${isLocal(k) ? ' (Local)' : ''}`
    ).join(', ');

    // ... (rest of icon logic)
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

    // Show tooltip if hovered primarily OR if part of influence chain? 
    // Usually only direct hover. Grid handles updating isHovered logic.
    // We rely on parent for hover state logic if needed, but for tooltip, local mouse enter works.

    return (
        <div
            onClick={onClick}
            className={clsx(
                "w-full h-full rounded-md border-b-4 relative cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-md select-none",
                className,
                // Influence/Selection Rings (Priority)
                isInfluenced && !isGhost && !isHovered && "ring-2 ring-blue-400 scale-95 opacity-90",
                isGhost && !isHovered && "ring-2 ring-emerald-400 scale-95",
                isHovered && "ring-2 ring-white z-10",

                // Star Level Visuals (if not selected/hovered to avoid clutter)
                !isHovered && !isInfluenced && !isGhost && currentStars === 3 && "shadow-[0_0_15px_rgba(234,179,8,0.5)] border-yellow-500",
                !isHovered && !isInfluenced && !isGhost && currentStars === 2 && "shadow-[0_0_8px_rgba(96,165,250,0.4)] border-blue-400"
            )}
        >
            {/* Main Content */}
            <div className={clsx(
                "w-full h-full flex flex-col items-center justify-center rounded-md relative",
                getColors(tile.type),
                currentStars === 0 && "opacity-50 grayscale",
                isGhost && "opacity-75" // Slight transparency for ghost overlap indication
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

                {/* Local Storage Indicator? (Optional nice to have) */}
                {tile.storage && Object.keys(tile.storage).some(k => (tile.storage?.[k] || 0) > 0) && (
                    <div className="absolute bottom-1 right-1 w-2 h-2 bg-blue-300 rounded-full shadow-sm animate-pulse" title="Has Stored Resources"></div>
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
            {isSelected && (
                <div className="absolute bottom-full mb-2 z-50 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none border border-slate-700 opacity-100 font-sans">
                    {/* Header */}
                    <div className="mb-2 border-b border-slate-700 pb-2 flex justify-between items-start">
                        <div>
                            <div className="font-bold text-sm text-slate-100">{tile.type}</div>
                            <div className="text-slate-400 text-[10px] uppercase tracking-wide">Tier {tile.tier} Architecture</div>
                            {stats.influenceRadius && <div className="text-blue-400 text-[9px] mt-0.5">Influence Radius: {stats.influenceRadius}</div>}
                        </div>
                        <div className="flex flex-col items-end">
                            {/* ... Status Badge ... */}
                            <div className={clsx("font-bold text-[10px] px-1.5 py-0.5 rounded",
                                currentStars === 3 ? "bg-yellow-500/20 text-yellow-300" :
                                    currentStars === 2 ? "bg-blue-500/20 text-blue-300" :
                                        currentStars === 1 ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                            )}>
                                {currentStars === 0 ? "DISABLED" : `${currentStars}★`}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {currentStars === 0 && (
                            <div className="p-2 bg-red-950/30 border border-red-900/50 rounded text-red-300 flex items-start gap-2">
                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="font-bold">Building Disabled</div>
                                    <div className="text-[10px] opacity-80">Reason: <span className="uppercase font-bold">{tile.disabledReason || "Unknown"}</span></div>
                                    {tile.missingReqs && <div className="text-[10px] opacity-80 mt-1">Missing: {tile.missingReqs}</div>}
                                </div>
                            </div>
                        )}

                        {/* Storage Check */}
                        {tile.storage && Object.keys(tile.storage).length > 0 && (
                            <div>
                                <div className="text-[9px] uppercase tracking-wider text-blue-400 font-bold mb-0.5">Local Storage</div>
                                <div className="text-slate-300 bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
                                    {formatRes(tile.storage as Record<string, number>)}
                                </div>
                            </div>
                        )}

                        {/* ... Sections ... */}

                        {/* SECTION 2: BASE COST (Fixed) */}
                        <div className={clsx(currentStars === 0 && "opacity-50")}>
                            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Base Cost (Required)</div>
                            <div className="text-slate-300">
                                {formatRes(stats.baseRequirements || {}) || <span className="text-slate-500 italic">None</span>}
                            </div>
                        </div>

                        {/* SECTION 3: STAR COST (Variable) */}
                        {currentStars > 1 && (
                            <div className="animate-in fade-in slide-in-from-left-1">
                                <div className="mb-0.5">
                                    <span className="text-[9px] uppercase tracking-wider text-yellow-500/80 font-bold">
                                        Quality Cost ({currentStars}★)
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

                        {/* SECTION 4: NEXT LEVEL */}
                        {currentStars > 0 && currentStars < 3 && (
                            <div className="pt-2 border-t border-slate-700/50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] uppercase tracking-wider text-blue-400 font-bold">
                                        Next Level ({currentStars + 1}★)
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    Additional Cost: {stats.starRequirements && stats.starRequirements[(currentStars + 1) as 2 | 3] ? formatRes(stats.starRequirements[(currentStars + 1) as 2 | 3]) : "None"}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
