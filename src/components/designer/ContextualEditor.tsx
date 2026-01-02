import { useDesigner } from '../../context/DesignerContext';
import { StatusEffectEditor } from './editors/StatusEffectEditor';
import { GlobalEditor } from './editors/GlobalEditor';
import { BuildingEditor } from './editors/BuildingEditor';

export function ContextualEditor() {
    const { selection } = useDesigner();

    if (!selection) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p>Select an item from the navigator</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto w-full pb-20">
            {selection.type === 'global' && <GlobalEditor />}
            {selection.type === 'statusEffects' && <StatusEffectEditor />}
            {selection.type === 'building' && (
                <BuildingEditor buildingType={selection.buildingType} tier={selection.tier} />
            )}
            {selection.type === 'blueprint' && (
                <div className="text-center mt-20 text-slate-500">
                    Blueprint Editor for {selection.id} (Coming Soon)
                </div>
            )}
            {selection.type === 'startingCity' && (
                <div className="text-center mt-20 text-slate-500">
                    Starting City Editor (Coming Soon)
                </div>
            )}
        </div>
    );
}
