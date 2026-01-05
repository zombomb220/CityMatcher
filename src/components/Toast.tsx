import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const Toast: React.FC = () => {
    const error = useGameStore((state) => state.error);
    const clearError = useGameStore((state) => state.clearError);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                clearError();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error, clearError]);

    if (!error) return null;

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-xl backdrop-blur-sm border border-red-400 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                {error}
            </div>
        </div>
    );
};
