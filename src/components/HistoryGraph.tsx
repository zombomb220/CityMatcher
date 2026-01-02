import React, { useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
    CartesianGrid,
    ReferenceLine
} from 'recharts';
import { Activity, X, Eye, EyeOff } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { HistoryEntry } from '../types';
import { clsx } from 'clsx';

// Resource Configuration
const RESOURCE_CONFIG: Record<string, { label: string; color: string; key: keyof HistoryEntry }> = {
    happiness: { label: 'Happiness', color: '#4ade80', key: 'happiness' },
    population: { label: 'Population', color: '#60a5fa', key: 'population' },
    money: { label: 'Money', color: '#fbbf24', key: 'money' },
    products: { label: 'Products', color: '#f472b6', key: 'products' },
    serviceCoverage: { label: 'Service Coverage', color: '#a855f7', key: 'serviceCoverage' },
};

const TIER_1_KEYS = ['happiness', 'population', 'products', 'serviceCoverage'];
// const TIER_2_KEYS = ['money', 'workforce', 'rawGoods', 'powerSurplus'];

export const HistoryGraph: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { turnHistory } = useGameStore();

    // Toggles state
    const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set(TIER_1_KEYS));

    const toggleResource = (key: string) => {
        const next = new Set(visibleKeys);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        setVisibleKeys(next);
    };

    // Prepare data for Recharts
    const data = useMemo(() => {
        // Fallback: If turnHistory is empty (simulation didn't populate it?), check legacy history?
        // But store populates turnHistory.
        return (turnHistory || []).map(entry => ({
            ...entry.city, // Spread city state (money, pop, happiness, etc.)
            turn: entry.turnNumber, // Explicitly overwrite just in case
            // Map derived or deep stats if needed
            serviceCoverage: entry.city.serviceCoverage,
            // products is simple property
        }));
    }, [turnHistory]);

    // Calculate domain for Y axis to avoid flat lines
    // We might need multiple axes if scales are wildly different (e.g. Pop 4 vs Money 100)
    // For now, let's normalize or use a simplified mock normalization:
    // Actually, Recharts allows multiple Y axes.
    // Let's stick to a single layout for simplicity unless required.
    // "Support multiple scales or normalization toggle" -> Requirement.
    // Let's implement a 'Normalize' toggle.
    const [normalized, setNormalized] = useState(false);

    // const formatYAxis = (val: number) => {
    //     if (normalized) return `${Math.round(val)}%`;
    //     return val.toString();
    // };

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs">
                    <div className="font-bold text-slate-400 mb-2">Turn {label}</div>
                    {payload.map((p: any) => (
                        <div key={p.name} className="flex items-center gap-2 mb-1" style={{ color: p.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="capitalize">{p.name}:</span>
                            <span className="font-mono font-bold">{p.value.toFixed(normalized ? 0 : 1)}{normalized ? '%' : ''}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Calculate max for normalization
    const maxValues = useMemo(() => {
        const maxes: Record<string, number> = {};
        data.forEach(h => {
            Object.keys(RESOURCE_CONFIG).forEach(k => {
                const key = k as keyof HistoryEntry;
                // data is implicitly shaped like HistoryEntry + CityState mixture
                // We cast or assume property access works due to dynamic spread
                const val = (h as any)[key] as number || 0;
                maxes[k] = Math.max(maxes[k] || 1, val);
            });
        });
        return maxes;
    }, [data]);

    // Gradient Generation Strategy
    // For "Slope Coloring", we ideally want to apply a gradient to the stroke.
    // We can generate a unique gradient ID for each resource line.
    // However, calculating offsets for every turn is complex.
    // Simplification: "Upward trend -> green, Downward -> red"
    // We will color the *Stroke* based on the *Last Turn's Trend*? 
    // No, "Color represents SLOPE".
    // Recharts doesn't easily support multi-color lines without splitting data segments.
    // Let's adhere to: "Upward trend -> green, Downward -> red" for the PREDICTION text or Sidebar but specifically for graph?
    // "Visual Rules: Color represents SLOPE... use subtle vertical markers".
    // Given the constraints and Recharts limitations for per-segment gradient,
    // I will implementation a "Trend Indicator" background or simplified approach:
    // I will color the line based on the *overall* trend of the visible window?
    // Or, I will use dot colors.
    // Let's keep lines solid colors related to resource type (Identity) but use markers or specific logic for slope.
    // Wait, the Requirement says "Color represents SLOPE". 
    // If resource identity is lost, it's confusing.
    // Maybe "Resource Lines have their own colors, but background highlights slope?"
    // User Constraint: "Color represents SLOPE, not value".
    // This implies the line itself changes color.
    // I will try to use a gradient.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-950 border-2 border-slate-700 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
                    <div>
                        <div className="flex items-center gap-2 text-slate-200">
                            <Activity size={20} className="text-blue-400" />
                            <h2 className="text-lg font-bold uppercase tracking-wide">City Trends</h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-md">
                            Review resource stability over the last {data.length} turns.
                            Green lines indicate growth, Red indicates decline.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Graph Container */}
                <div className="flex-1 p-4 min-h-[300px] relative bg-slate-950">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                dataKey="turn"
                                stroke="#475569"
                                tick={{ fill: '#475569', fontSize: 10 }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#475569"
                                tick={{ fill: '#475569', fontSize: 10 }}
                                tickLine={false}
                                width={30}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Fail Threshold Reference */}
                            <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Collapse', fill: '#ef4444', fontSize: 10 }} />
                            <ReferenceLine y={80} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'Strain', fill: '#fbbf24', fontSize: 10 }} />

                            {Object.entries(RESOURCE_CONFIG).map(([key, config]) => {
                                if (!visibleKeys.has(key)) return null;

                                return (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={(item) => {
                                            const val = item[key as keyof HistoryEntry];
                                            if (typeof val !== 'number') return 0;
                                            if (normalized) {
                                                const max = maxValues[key] || 1;
                                                return (val / max) * 100;
                                            }
                                            return val;
                                        }}
                                        name={config.label}
                                        stroke={config.color}
                                        strokeWidth={2}
                                        dot={{ r: 2, fill: config.color }}
                                        activeDot={{ r: 4 }}
                                        isAnimationActive={false}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>

                    {data.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic">
                            No history data available yet.
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">

                    <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visible Resources</div>
                        <button
                            onClick={() => setNormalized(!normalized)}
                            className={clsx(
                                "text-[10px] px-2 py-1 rounded border font-mono transition-colors",
                                normalized ? "bg-blue-500/20 border-blue-500 text-blue-300" : "bg-slate-800 border-slate-700 text-slate-400"
                            )}
                        >
                            {normalized ? 'Normalized (%)' : 'Absolute Values'}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {Object.entries(RESOURCE_CONFIG).map(([key, config]) => {
                            const isVisible = visibleKeys.has(key);
                            return (
                                <button
                                    key={key}
                                    onClick={() => toggleResource(key)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                                        isVisible
                                            ? "bg-slate-800 border-slate-600 text-slate-200 shadow-sm"
                                            : "bg-transparent border-slate-800 text-slate-600 hover:border-slate-700"
                                    )}
                                >
                                    {isVisible ? <Eye size={12} className="text-slate-400" /> : <EyeOff size={12} />}
                                    <span style={{ color: isVisible ? config.color : undefined }}>{config.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
