import type { Cell } from '../../types';
import { BuildingType } from '../../types';

interface DesignerGridProps {
    grid: Cell[][];
}

export function DesignerGrid({ grid }: DesignerGridProps) {
    return (
        <div className="grid gap-1 mb-4"
            style={{
                gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))`,
                maxWidth: '400px',
                margin: '0 auto'
            }}>
            {grid.map((row, r) => (
                row.map((cell, c) => {
                    const tile = cell.tile;
                    let bgColor = 'bg-slate-800';
                    let borderColor = 'border-slate-700';
                    let content = null;

                    if (tile) {
                        switch (tile.type) {
                            case BuildingType.Residential: bgColor = 'bg-emerald-900'; borderColor = 'border-emerald-700'; break;
                            case BuildingType.Factory: bgColor = 'bg-amber-900'; borderColor = 'border-amber-700'; break;
                            case BuildingType.Shop: bgColor = 'bg-blue-900'; borderColor = 'border-blue-700'; break;
                            case BuildingType.Power: bgColor = 'bg-purple-900'; borderColor = 'border-purple-700'; break;
                            case BuildingType.Warehouse: bgColor = 'bg-slate-600'; borderColor = 'border-slate-500'; break;
                        }

                        content = (
                            <div className="flex flex-col items-center justify-center h-full">
                                <span className="text-[10px] uppercase font-bold text-white leading-tight">
                                    {tile.type.slice(0, 3)}
                                </span>
                                <span className="text-xs font-black text-white">
                                    {tile.tier > 1 ? 'II'.repeat(tile.tier - 1) : 'I'}
                                </span>
                                <div className="flex gap-0.5 mt-0.5">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-1 h-1 rounded-full ${i < tile.stars ? 'bg-yellow-400' : 'bg-slate-600'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={`${r}-${c}`}
                            className={`aspect-square border ${borderColor} ${bgColor} rounded relative overflow-hidden transition-colors`}
                        >
                            {content}
                        </div>
                    );
                })
            ))}
        </div>
    );
}
