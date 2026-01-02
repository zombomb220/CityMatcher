import React from 'react';
import type { StatusEffectAction, StatusEffectActionType } from '../../../types';
import { Trash2 } from 'lucide-react';

interface EffectActionEditorProps {
    action: StatusEffectAction;
    onChange: (updated: StatusEffectAction) => void;
    onRemove: () => void;
}

const ACTION_TYPES: StatusEffectActionType[] = ['productionMultiplier', 'resourceDelta', 'capacityModifier', 'disableBuilding'];

export const EffectActionEditor: React.FC<EffectActionEditorProps> = ({ action, onChange, onRemove }) => {

    const handleChange = (field: keyof StatusEffectAction, value: any) => {
        onChange({ ...action, [field]: value });
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
                <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Type</label>
                    <select
                        value={action.type}
                        onChange={(e) => handleChange('type', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                        {ACTION_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                {/* TARGET */}
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Target</label>
                    <input
                        type="text"
                        value={action.target}
                        onChange={(e) => handleChange('target', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        placeholder="Resource or Tag"
                    />
                </div>

                {/* VALUE */}
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Value</label>
                    <input
                        type="number"
                        value={action.value ?? 0}
                        onChange={(e) => handleChange('value', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        step={0.1}
                    />
                </div>
            </div>
        </div>
    );
};
