import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useMetaStore } from '../../store/metaStore';
import { calculateRunExports } from '../../logic/meta/exportEvaluator';

// Note: In the store, finishCityRun(id) already calculated and saved the run.
// This screen should primarily DISPLAY the results.
// Ideally, the 'completed' state in gameStore preserves the city state so we can read it.

export const RunSummaryScreen: React.FC = () => {
    const { city, activeCityId, resetGame } = useGameStore();
    const metaStore = useMetaStore();

    // We re-calculate purely for display purposes, or we could have stored 'lastRunResults' in the store.
    // Re-calculating is safe as city state hasn't been cleared yet.
    const exports = calculateRunExports(city);

    // Get unlocked thresholds for this specific run?
    // The meta store tracks *all* unlocks.
    // To show "New Unlocks", we would need to know what was unlocked *before*.
    // Or we could check which thresholds match *this specific run's* exports
    // vs the *stored best* exports.
    // If this run's export >= threshold AND it wasn't unlocked before... 
    // Complexity: The store updates immediately on finish.
    // So `metaStore.cityProgress` acts as "After".
    // We might miss the animation of "New Unlock".
    // For MVP, just list "Rewards Earned" based on current exports meeting criteria.

    const config = activeCityId ? metaStore.getCityConfig(activeCityId) : null;

    if (!config) return <div>Error: No active city config.</div>;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            color: '#fff'
        }}>
            <div style={{
                background: '#1a1a1a',
                padding: '3rem',
                borderRadius: '16px',
                maxWidth: '600px',
                width: '100%',
                border: '1px solid #333'
            }}>
                <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '2.5rem' }}>City Export Complete</h1>
                <p style={{ textAlign: 'center', color: '#888', marginBottom: '2rem' }}>
                    Production report for {config.name}
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <div className="stat-box" style={{ background: '#222', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Money Exported</div>
                        <div style={{ fontSize: '1.8rem', color: '#FFD700' }}>${exports.money}</div>
                    </div>
                    <div className="stat-box" style={{ background: '#222', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Power Surplus</div>
                        <div style={{ fontSize: '1.8rem', color: '#00BFFF' }}>{exports.power} MW</div>
                    </div>
                    <div className="stat-box" style={{ background: '#222', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Products Shipped</div>
                        <div style={{ fontSize: '1.8rem', color: '#FF8C00' }}>{exports.products}</div>
                    </div>
                    <div className="stat-box" style={{ background: '#222', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Raw Materials</div>
                        <div style={{ fontSize: '1.8rem', color: '#CD853F' }}>{exports.raw_goods}</div>
                    </div>
                </div>

                <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Thresholds Met</h3>
                <div style={{ marginBottom: '2rem' }}>
                    {config.thresholds.map(t => {
                        const met = exports[t.resource] >= t.value;
                        return (
                            <div key={t.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.5rem',
                                opacity: met ? 1 : 0.5,
                                color: met ? '#4CAF50' : '#666'
                            }}>
                                <span>{t.resource.toUpperCase()} &ge; {t.value}</span>
                                <span>{t.reward.description}</span>
                                {met && <span>✓</span>}
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={resetGame}
                    style={{
                        width: '100%',
                        padding: '1.2rem',
                        background: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Return to Meta Map
                </button>
            </div>
        </div>
    );
};
