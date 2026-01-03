import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Tile } from './Tile';
import { clsx } from 'clsx';
import { getCoordsInRadius } from '../logic/grid';
import { BUILDING_STATS } from '../config/buildingStats';
import gameData from '../config/gameData.json';

export const Grid: React.FC = () => {
    const { grid, placeBuilding, gameState, heldBlueprintId, city } = useGameStore();
    const canPlace = !!heldBlueprintId && !city.blueprintState.hasPlacedThisTurn;

    const [hoveredPos, setHoveredPos] = React.useState<{ r: number, c: number } | null>(null);
    const [selectedPos, setSelectedPos] = React.useState<{ r: number, c: number } | null>(null);

    // Two separate sets for visual distinction
    const influenceOverlay = React.useMemo(() => {
        const inspectorSet = new Set<string>();
        const ghostSet = new Set<string>();

        // 1. Inspector: Show radius of SELECTED or HOVERED building
        // Priority: Union both? Or just show both.

        // Add Selected
        if (selectedPos) {
            const selectedCell = grid[selectedPos.r][selectedPos.c];
            if (selectedCell.tile) {
                const stats = BUILDING_STATS[selectedCell.tile.type][selectedCell.tile.tier as unknown as '1' | '2' | '3'];
                const radius = stats.influenceRadius || 2;
                const coords = getCoordsInRadius(grid.length, selectedPos.r, selectedPos.c, radius);
                coords.forEach(t => inspectorSet.add(`${t.r},${t.c}`));
            }
        }

        // Add Hovered (if valid tile)
        if (hoveredPos) {
            const hoveredCell = grid[hoveredPos.r][hoveredPos.c];
            if (hoveredCell.tile) {
                const stats = BUILDING_STATS[hoveredCell.tile.type][hoveredCell.tile.tier as unknown as '1' | '2' | '3'];
                const radius = stats.influenceRadius || 2;
                const coords = getCoordsInRadius(grid.length, hoveredPos.r, hoveredPos.c, radius);
                coords.forEach(t => inspectorSet.add(`${t.r},${t.c}`));
            }
        }

        // 2. Ghost: If holding a blueprint, show PREVIEW radius around cursor
        if (heldBlueprintId && canPlace && hoveredPos) {
            const bp = (gameData.blueprints as any)[heldBlueprintId];
            if (bp) {
                const type = bp.buildingType;
                const tier = bp.tier;
                // Fix: tier is number, keys are strings.
                const stats = BUILDING_STATS[type as keyof typeof BUILDING_STATS][String(tier) as '1' | '2' | '3'];

                if (stats) {
                    const radius = stats.influenceRadius !== undefined ? stats.influenceRadius : 2;
                    const ghostCoords = getCoordsInRadius(grid.length, hoveredPos.r, hoveredPos.c, radius);
                    ghostCoords.forEach(t => ghostSet.add(`${t.r},${t.c}`));
                }
            }
        }

        return { inspectorSet, ghostSet };
    }, [hoveredPos, selectedPos, grid, heldBlueprintId, canPlace, gameData]);

    return (
        <div className="grid grid-cols-7 gap-2 bg-slate-800 p-4 rounded-xl shadow-2xl w-fit mx-auto border border-slate-700">
            {grid.map((row) => (
                <React.Fragment key={`row-${row[0].r}`}>
                    {row.map((cell) => {
                        const isInfluenced = influenceOverlay.inspectorSet.has(`${cell.r},${cell.c}`);
                        const isGhost = influenceOverlay.ghostSet.has(`${cell.r},${cell.c}`);
                        const isHovered = hoveredPos?.r === cell.r && hoveredPos?.c === cell.c;
                        const isSelected = selectedPos?.r === cell.r && selectedPos?.c === cell.c;

                        return (
                            <div
                                key={`${cell.r}-${cell.c}`}
                                onClick={() => {
                                    if (cell.tile) {
                                        // Select building on click (toggle if same)
                                        if (isSelected) {
                                            setSelectedPos(null);
                                        } else {
                                            setSelectedPos({ r: cell.r, c: cell.c });
                                        }
                                    } else if (canPlace) {
                                        placeBuilding(cell.r, cell.c);
                                    } else {
                                        // Deselect if clicking empty space
                                        setSelectedPos(null);
                                    }
                                }}
                                onMouseEnter={() => setHoveredPos({ r: cell.r, c: cell.c })}
                                onMouseLeave={() => setHoveredPos(null)}
                                className={clsx(
                                    "w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center transition-colors relative",
                                    !cell.tile && canPlace ? "bg-slate-700 hover:bg-slate-600 cursor-pointer border-2 border-slate-600 border-dashed" : "bg-slate-800",
                                    !cell.tile && !canPlace ? "border border-slate-700 opacity-50" : "",
                                    gameState === 'gameover' && "pointer-events-none opacity-80",
                                    // Overlays
                                    isInfluenced && !isHovered && "ring-2 ring-blue-500/50 bg-blue-900/20",
                                    // Ghost: High Opacity Green
                                    isGhost && "bg-emerald-500/60",
                                    // Ghost Ring: Solid Border for max visibility
                                    isGhost && "border-2 border-emerald-400"
                                )
                                    // Removing the default border if isGhost to avoid conflict, relying on the overlay border
                                    .replace(isGhost ? "border-slate-700" : "", "")
                                    .replace(isGhost ? "border-slate-600" : "", "")}
                            >
                                {cell.tile && (
                                    <Tile
                                        tile={cell.tile}
                                        isInfluenced={isInfluenced}
                                        isGhost={isGhost}
                                        isHovered={isHovered}
                                        isSelected={isSelected}
                                    />
                                )}
                            </div>
                        )
                    })}
                </React.Fragment>
            ))}
        </div>
    );
};
