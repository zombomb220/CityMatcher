import { useDesigner } from '../../../context/DesignerContext';
import { ResourceType, BuildingType } from '../../../types';
import { Plus, Trash2 } from 'lucide-react';

interface BuildingEditorProps {
    buildingType: string;
    tier: number;
}

export function BuildingEditor({ buildingType, tier }: BuildingEditorProps) {
    const { gameData, updateGameData } = useDesigner();

    // access safely
    // Cast buildingType to BuildingType key if valid, else handled safely
    const stats = gameData.buildingStats[buildingType as keyof typeof BuildingType]?.[tier];

    if (!stats) {
        return <div className="text-red-500">Error: Building stats not found for {buildingType} T{tier}</div>;
    }

    const updateStats = (newStats: Partial<typeof stats>) => {
        const newBuildingStats = {
            ...gameData.buildingStats,
            [buildingType]: {
                ...gameData.buildingStats[buildingType as keyof typeof BuildingType],
                [tier]: {
                    ...stats,
                    ...newStats
                }
            }
        };
        updateGameData({
            ...gameData,
            buildingStats: newBuildingStats as any // Type assertion needed for nested updates
        });
    };

    // Helper for Resource Input
    const ResourceInput = ({
        resources,
        onChange,
        label,
        allowRemove = true
    }: {
        resources: Record<string, number>,
        onChange: (r: Record<string, number>) => void,
        label?: string,
        allowRemove?: boolean
    }) => {
        const allTypes = Object.values(ResourceType);

        const addResource = () => {
            // Find first unused resource
            const used = Object.keys(resources);
            const next = allTypes.find(t => !used.includes(t)) || allTypes[0];
            onChange({ ...resources, [next]: 1 });
        };

        const updateKey = (oldKey: string, newKey: string) => {
            const val = resources[oldKey];
            const newRes = { ...resources };
            delete newRes[oldKey];
            newRes[newKey] = val;
            onChange(newRes);
        };

        const updateVal = (key: string, val: number) => {
            onChange({ ...resources, [key]: val });
        };

        const remove = (key: string) => {
            const newRes = { ...resources };
            delete newRes[key];
            onChange(newRes);
        };

        return (
            <div className="space-y-2">
                {label && <div className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                    <span>{label}</span>
                    <button onClick={addResource} className="text-emerald-500 hover:text-emerald-400">
                        <Plus size={14} />
                    </button>
                </div>}

                {Object.entries(resources).map(([res, val]) => (
                    <div key={res as string} className="flex items-center gap-2">
                        <select
                            value={res}
                            onChange={(e) => updateKey(res, e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white uppercase w-32"
                        >
                            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input
                            type="number"
                            value={val}
                            onChange={(e) => updateVal(res, parseInt(e.target.value) || 0)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white w-20"
                        />
                        {allowRemove && (
                            <button onClick={() => remove(res)} className="text-slate-600 hover:text-red-400">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}

                {Object.keys(resources).length === 0 && (
                    <div className="text-xs text-slate-600 italic py-1">None</div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-3xl font-black text-white">{buildingType}</h2>
                    <div className="flex gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-indigo-900 text-indigo-200 text-xs rounded font-bold uppercase">Tier {tier}</span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded font-bold uppercase">Priority: {stats.priority}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 uppercase font-bold">Priority</label>
                    <input
                        type="number"
                        value={stats.priority}
                        onChange={(e) => updateStats({ priority: parseInt(e.target.value) || 0 })}
                        className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center font-bold"
                    />
                </div>
            </div>

            {/* Base Requirements */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-emerald-500 rounded-sm"></span>
                    Base Enablement (⭐)
                </h3>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <div className="text-xs text-slate-500 mb-2">Requirements to function at minimum capacity</div>
                        <ResourceInput
                            resources={stats.baseRequirements}
                            onChange={(r) => updateStats({ baseRequirements: r })}
                            label="Requires"
                        />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 mb-2">Production at 1 Star</div>
                        <ResourceInput
                            resources={stats.produces[1]}
                            onChange={(r) => updateStats({ produces: { ...stats.produces, 1: r } })}
                            label="Produces"
                        />
                    </div>
                </div>
            </div>

            {/* Star Ladder */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-amber-500 rounded-sm"></span>
                    Star Ladder (Upgrades)
                </h3>

                {/* Star 2 */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative">
                    <div className="absolute top-4 right-4 text-4xl font-black text-slate-800 pointer-events-none select-none">2★</div>
                    <h4 className="font-bold text-amber-400 mb-4">Efficient (⭐⭐)</h4>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <ResourceInput
                                resources={stats.starRequirements?.[2] || {}}
                                onChange={(r) => updateStats({ starRequirements: { ...(stats.starRequirements || {}), 2: r } })}
                                label="Additional Costs"
                            />
                        </div>
                        <div className="pl-4 border-l border-slate-800">
                            <ResourceInput
                                resources={stats.produces[2]}
                                onChange={(r) => updateStats({ produces: { ...stats.produces, 2: r } })}
                                label="Total Production"
                            />
                        </div>
                    </div>
                </div>

                {/* Star 3 */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative">
                    <div className="absolute top-4 right-4 text-4xl font-black text-slate-800 pointer-events-none select-none">3★</div>
                    <h4 className="font-bold text-amber-400 mb-4">Optimal (⭐⭐⭐)</h4>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <ResourceInput
                                resources={stats.starRequirements?.[3] || {}}
                                onChange={(r) => updateStats({ starRequirements: { ...(stats.starRequirements || {}), 3: r } })}
                                label="Additional Costs"
                            />
                        </div>
                        <div className="pl-4 border-l border-slate-800">
                            <ResourceInput
                                resources={stats.produces[3]}
                                onChange={(r) => updateStats({ produces: { ...stats.produces, 3: r } })}
                                label="Total Production"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-xs text-slate-500 text-center pt-8">
                Changes apply instantly to the sandbox simulation.
            </div>
        </div>
    );
}
