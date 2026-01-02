import React from 'react';
import type { StatusEffectTrigger, StatusEffectTriggerType } from '../../../types';
import { Trash2 } from 'lucide-react';

interface TriggerEditorProps {
    trigger: StatusEffectTrigger;
    onChange: (updated: StatusEffectTrigger) => void;
    onRemove: () => void;
}

const TRIGGER_TYPES: StatusEffectTriggerType[] = ['resource', 'stat', 'building_count', 'turn'];
const COMPARISONS = ['>=', '<=', '==', '>', '<'] as const;

export const TriggerEditor: React.FC<TriggerEditorProps> = ({ trigger, onChange, onRemove }) => {

    const handleChange = (field: keyof StatusEffectTrigger, value: any) => {
        onChange({ ...trigger, [field]: value });
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded p-3 flex flex-col gap-2 relative group">
            <button
                onClick={onRemove}
                className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 size={14} />
            </button>

            <div className="grid grid-cols-2 gap-2 pr-6">
                {/* TYPE */}
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Type</label>
                    <select
                        value={trigger.type}
                        onChange={(e) => handleChange('type', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                        {TRIGGER_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                {/* TARGET */}
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Target</label>
                    <input
                        type="text"
                        value={trigger.target}
                        onChange={(e) => handleChange('target', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {/* COMPARISON */}
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Comp</label>
                    <select
                        value={trigger.comparison}
                        onChange={(e) => handleChange('comparison', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                    >
                        {COMPARISONS.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* VALUE */}
                <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Value</label>
                    <input
                        type="text"
                        value={trigger.value}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            handleChange('value', isNaN(val) ? e.target.value : val);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        placeholder="Number or ID"
                    />
                </div>
            </div>

            {/* CONSECUTIVE TURNS (Optional) */}
            <div>
                <label className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={'consecutiveTurns' in trigger}
                        onChange={(e) => {
                            if (e.target.checked) handleChange('consecutiveTurns', 1);
                            else {
                                const { consecutiveTurns, ...rest } = trigger;
                                onChange(rest as StatusEffectTrigger);
                            }
                        }}
                    />
                    Consecutive Turns
                </label>
                {'consecutiveTurns' in trigger && (
                    <input
                        type="number"
                        value={trigger.consecutiveTurns}
                        onChange={(e) => handleChange('consecutiveTurns', parseInt(e.target.value))}
                        className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                )}
            </div>
        </div>
    );
};
