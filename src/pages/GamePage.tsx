
import { BuildMenu } from '../components/BuildMenu';
import { Grid } from '../components/Grid';
import { ResourceSidebar } from '../components/ResourceSidebar';
import { useGameStore } from '../store/gameStore';
import { RotateCcw, PenTool } from 'lucide-react'; // Added PenTool for the icon
import { useNavigate } from 'react-router-dom';
import CopyStateButton from '../components/CopyStateButton';

export function GamePage() {
    const { gameState, resetGame } = useGameStore();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-6 sm:py-10 px-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 -z-10 opacity-50" />

            <header className="mb-6 flex flex-col items-center relative w-full max-w-4xl">
                {/* Designer Tools Button - Top Right */}
                <button
                    onClick={() => navigate('/designer')}
                    className="absolute right-0 top-0 flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg"
                >
                    <PenTool size={14} />
                    Designer Tools
                </button>

                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-1">
                    MERGECORE
                </h1>
                <p className="text-slate-400 text-sm">Minimalist city building with a satisfying merge flow.</p>
            </header>

            {/* Main Layout Area */}
            <div className="flex flex-row items-start justify-center gap-8 w-full max-w-7xl px-4">

                {/* Left: Resource Sidebar (Fixed Width) */}
                <ResourceSidebar />

                {/* Center: Grid */}
                <div className="flex-1 flex justify-center pt-10">
                    <Grid />
                </div>

                {/* Right: Build Menu & Controls */}
                <div className="flex flex-col gap-4 items-center w-64 pt-10 sticky top-6">
                    <BuildMenu />

                    <button
                        onClick={resetGame}
                        className="flex items-center gap-2 px-4 py-2 mt-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-bold transition-colors border border-slate-600 w-full justify-center"
                    >
                        <RotateCcw size={16} />
                        Restart
                    </button>

                    <div className="mt-4 w-full">
                        <CopyStateButton />
                    </div>
                </div>
            </div>

            {/* Game Over Overlay */}
            {gameState === 'gameover' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-800 border-2 border-red-500 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
                        <h2 className="text-3xl font-black text-white mb-2">GAME OVER</h2>
                        <p className="text-slate-300 mb-6">
                            Your city collapsed under debt or unhappiness.
                        </p>
                        <div className="text-4xl mb-6">🏙️💥</div>
                        <button
                            onClick={resetGame}
                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-lg"
                        >
                            Try Again
                        </button>
                        <div className="mt-4 flex justify-center">
                            <CopyStateButton />
                        </div>
                    </div>
                </div>
            )}

            <footer className="mt-12 text-slate-600 text-xs">
                v1.0 MVP • TypeScript • React • Zustand
            </footer>
        </div>
    );
}
