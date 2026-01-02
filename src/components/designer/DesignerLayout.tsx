import type { ReactNode } from 'react';

interface DesignerLayoutProps {
    header: ReactNode;
    leftPanel: ReactNode;
    centerPanel: ReactNode;
    rightPanel: ReactNode;
}

export function DesignerLayout({ header, leftPanel, centerPanel, rightPanel }: DesignerLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-slate-800 bg-slate-900 flex-none z-10">
                {header}
            </div>

            {/* Main Grid */}
            <div className="flex-1 grid grid-cols-[300px_1fr_400px] overflow-hidden">
                {/* Left Panel: Navigation */}
                <div className="border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden">
                    {leftPanel}
                </div>

                {/* Center Panel: Editor */}
                <div className="bg-slate-950 flex flex-col overflow-hidden relative">
                    {centerPanel}
                </div>

                {/* Right Panel: Simulation */}
                <div className="border-l border-slate-800 bg-slate-900/30 flex flex-col overflow-hidden">
                    {rightPanel}
                </div>
            </div>
        </div>
    );
}
