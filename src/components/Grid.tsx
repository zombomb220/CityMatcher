import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Tile } from './Tile';
import { clsx } from 'clsx';

export const Grid: React.FC = () => {
    const { grid, placeBuilding, toggleUpkeep, gameState, heldBlueprintId, city } = useGameStore();
    const canPlace = !!heldBlueprintId && !city.blueprintState.hasPlacedThisTurn;

    return (
        <div className="grid grid-cols-7 gap-2 bg-slate-800 p-4 rounded-xl shadow-2xl w-fit mx-auto border border-slate-700">
            {grid.map((row) => (
                <React.Fragment key={`row-${row[0].r}`}>
                    {row.map((cell) => (
                        <div
                            key={`${cell.r}-${cell.c}`}
                            onClick={() => {
                                if (cell.tile) {
                                    toggleUpkeep(cell.r, cell.c);
                                } else if (canPlace) {
                                    placeBuilding(cell.r, cell.c);
                                }
                            }}
                            className={clsx(
                                "w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center transition-colors",
                                !cell.tile && canPlace ? "bg-slate-700 hover:bg-slate-600 cursor-pointer border-2 border-slate-600 border-dashed" : "bg-slate-800",
                                !cell.tile && !canPlace ? "border border-slate-700 opacity-50" : "",
                                gameState === 'gameover' && "pointer-events-none opacity-80"
                            )}
                        >
                            {cell.tile && (
                                <Tile tile={cell.tile} />
                            )}
                        </div>
                    ))}
                </React.Fragment>
            ))}
        </div>
    );
};
