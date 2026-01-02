import { useDesigner } from '../../context/DesignerContext';
import { DesignerGrid } from './DesignerGrid';
import { BuildingType } from '../../types';
import { Play, RotateCcw, Clipboard } from 'lucide-react';
import { useState } from 'react';

export function SimulationDashboard() {
    const {
        sandboxCity,
        sandboxGrid,
        placeBuilding,
        nextTurn,
        resetCityOnly,
        simulationStats,
        gameData,
        resetSandbox
    } = useDesigner();

    const [copyStatus, setCopyStatus] = useState('');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(gameData, null, 4));
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus(''), 2000);
        } catch (e) {
            setCopyStatus('Error');
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header / Controls */}
            <div className="space-y-4 border-b border-slate-800 pb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sandbox Controls</h3>

                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => placeBuilding(BuildingType.Residential)} className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs font-bold text-white">Add Res</button>
                    <button onClick={() => placeBuilding(BuildingType.Factory)} className="px-2 py-1 bg-amber-700 hover:bg-amber-600 rounded text-xs font-bold text-white">Add Fac</button>
                    <button onClick={() => placeBuilding(BuildingType.Shop)} className="px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold text-white">Add Shop</button>
                    <button onClick={() => placeBuilding(BuildingType.Power)} className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs font-bold text-white">Add Power</button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={nextTurn}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-bold text-white"
                    >
                        <Play size={16} fill="currentColor" /> Next Turn
                    </button>
                    <button
                        onClick={resetCityOnly}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-slate-200"
                        title="Reset Sandbox City"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            </div>

            {/* Turn Info */}
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                <span className="text-sm font-bold text-slate-400">Turn {sandboxCity.turn}</span>
                <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 uppercase">Money</span>
                        <span className="text-sm font-mono text-emerald-400">${sandboxCity.money}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 uppercase">Pop</span>
                        <span className="text-sm font-mono text-blue-400">{sandboxCity.population}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 uppercase">Happ</span>
                        <span className="text-sm font-mono text-pink-400">{Math.round(sandboxCity.happiness)}%</span>
                    </div>
                </div>
            </div>

            {/* Grid Visualization */}
            <DesignerGrid grid={sandboxGrid} />

            {/* Simulation Stats */}
            {simulationStats && (
                <div className="bg-slate-900 p-4 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Power Grid</h4>

                    {/* Utilization Gauge */}
                    <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-purple-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, (simulationStats.powerUtilization || 0) * 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Used: {simulationStats.powerConsumed}</span>
                        <span>{Math.round((simulationStats.powerUtilization || 0) * 100)}%</span>
                        <span>Prod: {simulationStats.powerProduced}</span>
                    </div>

                    <div className="flex items-center gap-2 justify-center pt-2 border-t border-slate-800">
                        <span className="text-xs text-slate-500">Grid Status:</span>
                        <div className="flex">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <span key={i} className={`text-lg ${i < simulationStats.powerStars ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Warnings Area (Mockup) */}
            <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded text-amber-200 text-xs">
                <h4 className="font-bold mb-1 flex items-center gap-2">
                    <span className="text-amber-500">⚠</span> Balance Checks
                </h4>
                {simulationStats && simulationStats.powerUtilization > 0.9 && (
                    <p>High Power stress! Grid near max capacity.</p>
                )}
                {sandboxCity.money < 5 && (
                    <p>Low funds risk.</p>
                )}
                {(!simulationStats) && <p className="opacity-50">Run turn to see warnings.</p>}
            </div>

            {/* Data Actions */}
            <div className="border-t border-slate-800 pt-6 space-y-2">
                <button
                    onClick={handleCopy}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors"
                >
                    {copyStatus === 'Copied!' ? '✅ Copied!' : <><Clipboard size={14} /> Copy JSON to Clipboard</>}
                </button>

                <button
                    onClick={() => {
                        if (confirm('Discard all changes and reset to initial file data?')) {
                            resetSandbox();
                        }
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-red-900/50 text-red-400 hover:text-red-300 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors"
                >
                    <RotateCcw size={14} /> Reset All Data
                </button>
            </div>
        </div>
    );
}
