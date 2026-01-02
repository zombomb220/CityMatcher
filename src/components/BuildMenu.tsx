import React from 'react';
import { useGameStore } from '../store/gameStore';
import { BLUEPRINTS } from '../config/blueprints';
import { clsx } from 'clsx';
import { Lock, Zap, Briefcase, ShoppingBag, Home } from 'lucide-react';
import type { Blueprint } from '../types';

export const BuildMenu: React.FC = () => {
    const { city, heldBlueprintId, selectBlueprint, clearNewUnlocks } = useGameStore();
    const { unlockedIds, maxSlots, newUnlocks } = city.blueprintState;

    const lockedBlueprints = Object.values(BLUEPRINTS).filter(bp => !unlockedIds.includes(bp.id));
    const activeBlueprints = unlockedIds.map(id => BLUEPRINTS[id]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'Residential': return <Home size={16} />;
            case 'Factory': return <Briefcase size={16} />;
            case 'Shop': return <ShoppingBag size={16} />;
            case 'Power': return <Zap size={16} />;
            default: return null;
        }
    };

    const [activeTab, setActiveTab] = React.useState<'build' | 'research'>('build');
    const hasLockedItems = lockedBlueprints.length > 0;

    return (
        <div className="w-full max-w-sm flex flex-col gap-4 relative">
            {/* Unlock Notification Overlay */}
            {newUnlocks && newUnlocks.length > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                    <div className="bg-slate-800 border-2 border-amber-500 rounded-xl p-6 w-full max-w-md text-center shadow-2xl relative overflow-hidden">
                        {/* Shimmer effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

                        <div className="text-4xl mb-2">🎉</div>
                        <h3 className="text-amber-500 font-black text-xl uppercase tracking-wider mb-4">Research Complete!</h3>

                        <div className="flex flex-col gap-2 mb-4">
                            {newUnlocks.map((id, i) => {
                                if (id === '__SLOT_UPGRADE__') {
                                    return (
                                        <div key={i} className="bg-emerald-500/20 border border-emerald-500 p-2 rounded text-emerald-300 font-bold text-sm">
                                            Creating Space...<br />
                                            <span className="text-white text-base">Blueprint Slot Unlocked!</span>
                                        </div>
                                    );
                                }
                                const bp = BLUEPRINTS[id];
                                if (!bp) return null;
                                return (
                                    <div key={id} className="bg-slate-700/50 p-2 rounded flex items-center gap-3 text-left">
                                        <div className="text-amber-400">{getIcon(bp.buildingType)}</div>
                                        <div>
                                            <div className="text-white font-bold text-sm">{bp.name}</div>
                                            <div className="text-[10px] text-slate-400">Unlocked</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={clearNewUnlocks}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-colors"
                        >
                            Awesome!
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex p-1 bg-slate-800 rounded-lg border border-slate-700">
                <button
                    onClick={() => setActiveTab('build')}
                    className={clsx(
                        "flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all",
                        activeTab === 'build'
                            ? "bg-slate-600 text-white shadow"
                            : "text-slate-400 hover:text-slate-200"
                    )}
                >
                    Blueprints
                </button>
                <button
                    onClick={() => setActiveTab('research')}
                    className={clsx(
                        "flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all flex items-center justify-center gap-2",
                        activeTab === 'research'
                            ? "bg-slate-600 text-white shadow"
                            : "text-slate-400 hover:text-slate-200"
                    )}
                >
                    Research
                    {hasLockedItems && <Lock size={10} className="opacity-50" />}
                </button>
            </div>

            {/* Content: Active Slots (Build Tab) */}
            {activeTab === 'build' && (
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl animate-in slide-in-from-left-2 duration-200">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-slate-200 font-bold text-sm uppercase tracking-wide">
                            Available ({unlockedIds.length}/{maxSlots})
                        </h3>
                        {city.blueprintState.hasPlacedThisTurn && (
                            <span className="text-xs text-amber-400 font-medium">Turn Used</span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        {activeBlueprints.map((bp) => (
                            <button
                                key={bp.id}
                                onClick={() => !city.blueprintState.hasPlacedThisTurn && selectBlueprint(bp.id)}
                                className={clsx(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-all text-left relative",
                                    heldBlueprintId === bp.id
                                        ? "bg-blue-500/20 border-blue-500 ring-1 ring-blue-500"
                                        : "bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500",
                                    city.blueprintState.hasPlacedThisTurn && "opacity-50 cursor-not-allowed grayscale"
                                )}
                            >
                                <div className={clsx("p-2 rounded-md bg-slate-800",
                                    heldBlueprintId === bp.id ? "text-blue-400" : "text-slate-400"
                                )}>
                                    {getIcon(bp.buildingType)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-200 text-sm">{bp.name}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                        Tier {bp.tier} {bp.buildingType}
                                    </div>
                                </div>
                            </button>
                        ))}
                        {Array.from({ length: maxSlots - activeBlueprints.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="p-3 rounded-lg border border-slate-700 border-dashed bg-slate-800/50 flex items-center justify-center text-slate-600 text-xs font-medium">
                                Empty Slot
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content: Locked Blueprints (Research Tab) */}
            {activeTab === 'research' && (
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl animate-in slide-in-from-right-2 duration-200">
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wide mb-3">Locked Technology</h3>
                    <div className="grid gap-2">
                        {lockedBlueprints.map((bp) => (
                            <div key={bp.id} className="group relative p-3 rounded-lg border border-slate-700 bg-slate-900/50 flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                                <div className="p-2 rounded-md bg-slate-800 text-slate-600">
                                    <Lock size={14} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-300 text-sm">{bp.name}</span>
                                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">T{bp.tier}</span>
                                    </div>
                                    {/* Unlock Conditions Preview */}
                                    <div className="mt-1 text-[10px] text-slate-500">
                                        {formatUnlockConditions(bp)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {lockedBlueprints.length === 0 && (
                            <div className="text-center text-slate-600 text-xs italic py-8">
                                <div className="mb-2 text-2xl">✨</div>
                                All technology researched!
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper for formatting unlock conditions
function formatUnlockConditions(bp: Blueprint): string {
    if (!bp.unlockConditions || bp.unlockConditions.length === 0) return "Unknown";
    // Just show first group or summary
    const group = bp.unlockConditions[0][0]; // Simplified
    return group ? `${group.target} ${group.comparison} ${group.value}`.replace('_', ' ') : "Locked";
    // TODO: Improve formatting
}
