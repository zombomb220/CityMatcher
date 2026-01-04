import React from 'react';
import { BuildingType } from '../types';
import type { Tile as TileType } from '../types';
import { Home, Factory, ShoppingBag, Zap, AlertTriangle, Briefcase, Package, Users, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';

import { ProductionOverlay } from './ProductionOverlay';

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
            {/* Production Overlay */}
            {isSelected && (
                <ProductionOverlay tile={tile} />
            )}
        </div>
    );
};
