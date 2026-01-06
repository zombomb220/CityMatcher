import React from 'react';
import { CITY_CONFIGS_DATA } from '../../store/metaStore';
import { useMetaStore } from '../../store/metaStore';

interface MetaMapProps {
    onSelectNode: (cityId: string) => void;
    activeNodeId: string | null;
}

import galaxyBg from '../../assets/galaxy_bg.png';

export const MetaMap: React.FC<MetaMapProps> = ({ onSelectNode, activeNodeId }) => {
    const metaState = useMetaStore();
    const configs = Object.values(CITY_CONFIGS_DATA);

    // Map View State
    const [view, setView] = React.useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = React.useState(false);
    const lastPos = React.useRef({ x: 0, y: 0 });
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

    React.useLayoutEffect(() => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight
            });
        }
        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                setDimensions({
                    width: entries[0].contentRect.width,
                    height: entries[0].contentRect.height
                });
            }
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const clampView = (x: number, y: number, scale: number) => {
        if (dimensions.width === 0 || dimensions.height === 0) return { x, y, scale };

        // Background IS 200% of container.
        // Formula: Max Offset = Dimension * (Scale - 0.5)
        // If scale is 0.5, max offset is 0.
        // If scale is 1, max offset is 0.5 * Dimension.

        const maxX = Math.max(0, dimensions.width * (scale - 0.5));
        const maxY = Math.max(0, dimensions.height * (scale - 0.5));

        return {
            x: Math.min(maxX, Math.max(-maxX, x)),
            y: Math.min(maxY, Math.max(-maxY, y)),
            scale
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };

        setView(prev => clampView(prev.x + dx, prev.y + dy, prev.scale));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleZoom = (delta: number) => {
        setView(prev => {
            const newScale = Math.min(3, Math.max(0.6, prev.scale + delta)); // Min scale 0.6 to overlap slightly
            return clampView(prev.x, prev.y, newScale);
        });
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: '#0f172a', // Deep space fallback
                overflow: 'hidden',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={(e) => handleZoom(e.deltaY > 0 ? -0.1 : 0.1)} // Wheel zoom support
        >
            {/* Transform Container - The World */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}>
                {/* Background Image - Moves with map but deeper parallax? For now, 1:1 movement */}
                <div style={{
                    position: 'absolute',
                    top: '-50%', left: '-50%', width: '200%', height: '200%', // Larger bg to cover panning
                    backgroundImage: `url(${galaxyBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.4,
                    pointerEvents: 'none'
                }} />

                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
                >
                    {configs.flatMap(city => {
                        const fromX = city.coordinates.x;
                        const fromY = city.coordinates.y;

                        if (!city.connections) return [];

                        return city.connections.map(targetId => {
                            const target = CITY_CONFIGS_DATA[targetId];
                            if (!target) return null;

                            const isSourceUnlocked = metaState.isNodeUnlocked(city.id);
                            const isTargetUnlocked = metaState.isNodeUnlocked(targetId);
                            const bothUnlocked = isSourceUnlocked && isTargetUnlocked;

                            // if (!isSourceUnlocked) return null; // Logic removed to show all connections

                            return (
                                <line
                                    key={`${city.id}-${targetId}`}
                                    x1={`${fromX}%`} y1={`${fromY}%`}
                                    x2={`${target.coordinates.x}%`} y2={`${target.coordinates.y}%`}
                                    stroke={bothUnlocked ? "#fff" : "#444"}
                                    strokeWidth="3"
                                    strokeDasharray={bothUnlocked ? undefined : "8,4"}
                                    strokeOpacity={bothUnlocked ? 1 : 0.5}
                                    strokeLinecap="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            );
                        });
                    })}
                </svg>

                {/* Central Sun */}
                <div style={{
                    position: 'absolute',
                    left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80px', height: '80px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #FFD700 0%, #FF8C00 60%, rgba(255, 140, 0, 0) 100%)',
                    boxShadow: '0 0 60px rgba(255, 215, 0, 0.4)',
                    zIndex: 5,
                    pointerEvents: 'none'
                }} />

                {configs.map((city) => {
                    const progress = metaState.cityProgress[city.id];
                    const completed = progress?.completed;
                    const active = city.id === activeNodeId;

                    const isEnabled = metaState.isNodeUnlocked(city.id);
                    const tier = progress ? Math.min(3, progress.unlockedThresholdIds.length) : 0;
                    const size = 30 + (tier * 5); // Grow slightly with progress

                    return (
                        <div
                            key={city.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isEnabled) onSelectNode(city.id);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                left: `${city.coordinates.x}%`,
                                top: `${city.coordinates.y}%`,
                                transform: `translate(-50%, -50%) scale(${active ? 1.2 : 1})`,
                                width: `${size}px`,
                                height: `${size}px`,
                                borderRadius: '50%',
                                background: isEnabled ? (completed ? '#22c55e' : '#334155') : '#1e293b',
                                border: `3px solid ${active ? '#fff' : (isEnabled ? (completed ? '#86efac' : '#94a3b8') : '#475569')}`,
                                boxShadow: active
                                    ? '0 0 25px rgba(255,255,255,0.8), 0 0 10px rgba(56, 189, 248, 0.5)'
                                    : (isEnabled && !completed ? '0 0 15px rgba(148, 163, 184, 0.3)' : 'none'),
                                cursor: isEnabled ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                                opacity: isEnabled ? 1 : 0.6
                            }}
                        >
                            {/* Status Icon */}
                            {isEnabled ? (
                                completed ? (
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>✓</span>
                                ) : (
                                    <div style={{ width: '8px', height: '8px', background: '#aaa', borderRadius: '50%' }} />
                                )
                            ) : (
                                <span style={{ fontSize: '10px', color: '#555' }}>🔒</span>
                            )}

                            {/* Label below node */}
                            <div style={{
                                position: 'absolute',
                                top: '125%',
                                whiteSpace: 'nowrap',
                                fontSize: '11px',
                                color: active ? '#fff' : (isEnabled ? '#aaa' : '#444'),
                                fontWeight: active ? 'bold' : 'normal',
                                textShadow: '0 1px 2px black',
                                pointerEvents: 'none' // Don't block clicks
                            }}>
                                {city.name}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Map Controls */}
            <div style={{
                position: 'absolute',
                bottom: '20px', right: '20px',
                display: 'flex', flexDirection: 'column', gap: '8px',
                zIndex: 100
            }}>
                <button
                    onClick={() => handleZoom(0.2)}
                    style={{
                        width: '40px', height: '40px',
                        background: '#334155', border: '1px solid #475569', borderRadius: '8px',
                        color: 'white', fontSize: '20px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    +
                </button>
                <button
                    onClick={() => handleZoom(-0.2)}
                    style={{
                        width: '40px', height: '40px',
                        background: '#334155', border: '1px solid #475569', borderRadius: '8px',
                        color: 'white', fontSize: '20px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    -
                </button>
            </div>
        </div>
    );
};
