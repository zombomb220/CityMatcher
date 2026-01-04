import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { DesignerProvider, useDesigner } from '../context/DesignerContext';
import { DesignerLayout } from '../components/designer/DesignerLayout';
import { ModelNavigator } from '../components/designer/ModelNavigator';
import { ContextualEditor } from '../components/designer/ContextualEditor';
import { SimulationDashboard } from '../components/designer/SimulationDashboard';

// Internal component to consume context
function DesignerContent() {
    const navigate = useNavigate();
    const { selection: _selection } = useDesigner();

    return (
        <DesignerLayout
            header={
                <div className="flex items-center justify-between px-6 h-full">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Back to Game"
                        >
                            <Home size={20} />
                        </button>
                        <h1 className="font-bold text-lg text-slate-200">
                            <span className="text-emerald-500">Mergecore</span> Designer
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                            Sandbox Mode
                        </span>
                    </div>
                </div>
            }
            leftPanel={
                <div className="overflow-y-auto h-full">
                    <ModelNavigator />
                </div>
            }
            centerPanel={
                <div className="h-full overflow-y-auto bg-slate-950 p-8">
                    <ContextualEditor />
                </div>
            }
            rightPanel={
                <div className="p-4 overflow-y-auto h-full space-y-4">
                    <SimulationDashboard />
                </div>
            }
        />
    );
}

export function DesignerPage() {
    return (
        <DesignerProvider>
            <DesignerContent />
        </DesignerProvider>
    );
}
