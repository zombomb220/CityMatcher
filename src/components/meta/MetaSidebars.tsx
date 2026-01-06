import React from 'react';
import { useMetaStore } from '../../store/metaStore';



interface RightSidebarProps {
    selectedCityId: string | null;
    onEnterCity: (cityId: string) => void;
    onClose: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ selectedCityId, onEnterCity, onClose }) => {
    const metaState = useMetaStore();
    const selectedNode = selectedCityId ? metaState.getCityConfig(selectedCityId) || null : null;

    if (!selectedNode) {
        return (
            <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 p-6 transform translate-x-full transition-transform">
                {/* Hidden state */}
            </div>
        );
    }

    const progress = metaState.cityProgress[selectedNode.id];
    const unlockedCount = progress ? progress.unlockedThresholdIds.length : 0;
    const totalThresholds = selectedNode.thresholds.length;

    return (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 p-6 text-slate-100 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold">{selectedNode.name}</h2>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>
            <p className="text-sm text-slate-400 mb-6">{selectedNode.description}</p>

            <div className="mb-6 bg-slate-800 p-4 rounded-lg">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-bold">Progress</div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                    <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${(unlockedCount / totalThresholds) * 100}%` }}
                    />
                </div>
                <div className="text-right text-xs text-slate-400">{unlockedCount} / {totalThresholds} Unlocks</div>
            </div>

            <div className="mb-6 bg-slate-800 p-4 rounded-lg">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-bold">Best Exports</div>
                {progress ? (
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-slate-400">Money</span>
                        <span className="text-right text-amber-400">${progress.bestExports.money}</span>

                        <span className="text-slate-400">Power</span>
                        <span className="text-right text-cyan-400">{progress.bestExports.power} MW</span>

                        <span className="text-slate-400">Goods</span>
                        <span className="text-right text-orange-400">{progress.bestExports.raw_goods + progress.bestExports.products}</span>
                    </div>
                ) : (
                    <div className="text-sm text-slate-500 italic">No historical data</div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto mb-6">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-bold">Rewards</div>
                <div className="space-y-2">
                    {selectedNode.thresholds.map(t => {
                        const isUnlocked = progress?.unlockedThresholdIds.includes(t.id);
                        return (
                            <div key={t.id} className={`p-2 rounded text-xs flex justify-between items-center ${isUnlocked ? 'bg-emerald-900/30 text-emerald-200' : 'bg-slate-800 text-slate-500'}`}>
                                <span>{t.reward.description}</span>
                                {isUnlocked && <span>✓</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <button
                onClick={() => onEnterCity(selectedNode.id)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg"
            >
                {progress ? 'Replay City' : 'Start City'}
            </button>
        </div>
    );
};

export const LeftSidebar: React.FC = () => {
    const metaState = useMetaStore();
    const cityCount = Object.keys(metaState.cityProgress).length;

    // Calculate global stats
    const totalMoneyExported = Object.values(metaState.cityProgress).reduce((acc, curr) => acc + curr.bestExports.money, 0);
    const totalUnlocks = Object.values(metaState.cityProgress).reduce((acc, curr) => acc + curr.unlockedThresholdIds.length, 0);

    return (
        <div className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900/90 backdrop-blur-sm border-r border-slate-700 p-6 text-slate-100 pointer-events-none">
            {/* Pointer events none allows clicking through to map if needed, but sidebar content needs pointer-events-auto */}
            <div className="pointer-events-auto h-full flex flex-col">
                <h1 className="text-xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-8">
                    MERGECORP OPERATIONS
                </h1>

                <div className="space-y-6">
                    <div>
                        <div className="text-xs uppercase text-slate-500 font-bold mb-1">Cities Founded</div>
                        <div className="text-2xl font-light">{cityCount}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase text-slate-500 font-bold mb-1">Total Wealth</div>
                        <div className="text-2xl font-light text-amber-400">${totalMoneyExported.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase text-slate-500 font-bold mb-1">Tech Unlocked</div>
                        <div className="text-2xl font-light text-emerald-400">{totalUnlocks}</div>
                    </div>
                </div>

                <div className="mt-auto text-xs text-slate-600">
                    Select a node to view details.
                </div>
            </div>
        </div>
    );
};
