import { useDesigner } from '../../../context/DesignerContext';
import type { StatusEffect, StatusEffectTrigger, StatusEffectAction } from '../../../types';
import { Plus, Trash2, Zap } from 'lucide-react';
import { TriggerEditor } from './TriggerEditor';
import { EffectActionEditor } from './EffectActionEditor';

export function StatusEffectEditor() {
    console.log('StatusEffectEditor mounting');
    const { gameData, updateGameData } = useDesigner();

    // Safely access statusEffects, defaulting to []
    const effects = (gameData as any).statusEffects || [] as StatusEffect[];

    const updateEffects = (newEffects: StatusEffect[]) => {
        updateGameData({
            ...gameData,
            statusEffects: newEffects
        } as any);
    };

    const addEffect = () => {
        const newEffect: StatusEffect = {
            id: `effect_${Date.now()}`,
            name: 'New Effect',
            // description: 'Description here', // optional
            trigger: [],
            effects: [],
            duration: 'while_triggered',
            stacking: false
        };
        updateEffects([...effects, newEffect]);
    };

    const removeEffect = (index: number) => {
        const newEffects = [...effects];
        newEffects.splice(index, 1);
        updateEffects(newEffects);
    };

    const updateEffect = (index: number, updates: Partial<StatusEffect>) => {
        const newEffects = [...effects];
        newEffects[index] = { ...newEffects[index], ...updates };
        updateEffects(newEffects);
    };

    // --- Trigger Helpers ---
    const addTrigger = (effectIndex: number) => {
        const effect = effects[effectIndex];
        const newTrigger: StatusEffectTrigger = {
            type: 'resource',
            target: 'money',
            comparison: '<',
            value: 0
        };
        updateEffect(effectIndex, { trigger: [...effect.trigger, newTrigger] });
    };

    const updateTrigger = (effectIndex: number, triggerIndex: number, updated: StatusEffectTrigger) => {
        const effect = effects[effectIndex];
        const newTriggers = [...effect.trigger];
        newTriggers[triggerIndex] = updated;
        updateEffect(effectIndex, { trigger: newTriggers });
    };

    const removeTrigger = (effectIndex: number, triggerIndex: number) => {
        const effect = effects[effectIndex];
        const newTriggers = [...effect.trigger];
        newTriggers.splice(triggerIndex, 1);
        updateEffect(effectIndex, { trigger: newTriggers });
    };

    // --- Action Helpers ---
    const addAction = (effectIndex: number) => {
        const effect = effects[effectIndex];
        const newAction: StatusEffectAction = {
            type: 'resourceDelta',
            target: 'happiness',
            value: -5
        };
        updateEffect(effectIndex, { effects: [...effect.effects, newAction] });
    };

    const updateAction = (effectIndex: number, actionIndex: number, updated: StatusEffectAction) => {
        const effect = effects[effectIndex];
        const newActions = [...effect.effects];
        newActions[actionIndex] = updated;
        updateEffect(effectIndex, { effects: newActions });
    };

    const removeAction = (effectIndex: number, actionIndex: number) => {
        const effect = effects[effectIndex];
        const newActions = [...effect.effects];
        newActions.splice(actionIndex, 1);
        updateEffect(effectIndex, { effects: newActions });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-12">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-3xl font-black text-white flex items-center gap-3">
                    <Zap className="text-amber-400" size={32} />
                    Status Effects
                </h2>
                <button
                    onClick={addEffect}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-colors"
                >
                    <Plus size={16} /> New Effect
                </button>
            </div>

            <div className="space-y-4">
                {effects.map((effect: StatusEffect, index: number) => (
                    <div key={effect.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative group">
                        <button
                            onClick={() => removeEffect(index)}
                            className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={18} />
                        </button>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-500 text-xs uppercase font-bold mb-1">ID</label>
                                    <input
                                        type="text"
                                        value={effect.id}
                                        onChange={(e) => updateEffect(index, { id: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs uppercase font-bold mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={effect.name}
                                        onChange={(e) => updateEffect(index, { name: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-500 text-xs uppercase font-bold mb-1">Description</label>
                                <textarea
                                    value={effect.description || ''}
                                    onChange={(e) => updateEffect(index, { description: e.target.value })}
                                    className="w-full h-24 bg-slate-800 border-slate-700 rounded px-2 py-1 text-white text-sm resize-none"
                                />
                            </div>
                        </div>

                        {/* TRIGGERS */}
                        <div className="mb-6 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold uppercase text-amber-500">Triggers (All Required)</h3>
                                <button
                                    onClick={() => addTrigger(index)}
                                    className="text-[10px] flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-white transition-colors"
                                >
                                    <Plus size={12} /> Add Trigger
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {effect.trigger.map((trigger: StatusEffectTrigger, tIndex: number) => (
                                    <TriggerEditor
                                        key={tIndex}
                                        trigger={trigger}
                                        onChange={(updated) => updateTrigger(index, tIndex, updated)}
                                        onRemove={() => removeTrigger(index, tIndex)}
                                    />
                                ))}
                                {effect.trigger.length === 0 && (
                                    <div className="col-span-full text-center py-4 text-xs text-slate-600 italic">
                                        No triggers defined.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* EFFECTS */}
                        <div className="p-4 bg-slate-950/30 rounded-lg border border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold uppercase text-emerald-500">Effects (Applied)</h3>
                                <button
                                    onClick={() => addAction(index)}
                                    className="text-[10px] flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-white transition-colors"
                                >
                                    <Plus size={12} /> Add Effect Action
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {effect.effects.map((action: StatusEffectAction, aIndex: number) => (
                                    <EffectActionEditor
                                        key={aIndex}
                                        action={action}
                                        onChange={(updated) => updateAction(index, aIndex, updated)}
                                        onRemove={() => removeAction(index, aIndex)}
                                    />
                                ))}
                                {effect.effects.length === 0 && (
                                    <div className="col-span-full text-center py-4 text-xs text-slate-600 italic">
                                        No effects defined.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                ))}

                {effects.length === 0 && (
                    <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-xl border-dashed border-2 border-slate-800">
                        No status effects defined. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
