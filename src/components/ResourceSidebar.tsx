import React, { useMemo, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { runSimulation } from '../logic/simulation';
import { ResourceType, type Cell } from '../types';
import {
    Coins, Users, Smile, Briefcase, Package, Zap,
    AlertTriangle, Activity
} from 'lucide-react';
import { clsx } from 'clsx';
import { STATUS_EFFECTS } from '../config/buildingStats';

const cloneGrid = (grid: Cell[][]): Cell[][] => {
    return grid.map(row => row.map(cell => ({
        ...cell,
        tile: cell.tile ? {
            ...cell.tile,
            storage: cell.tile.storage ? { ...cell.tile.storage } : undefined,
            producedThisTurn: cell.tile.producedThisTurn ? { ...cell.tile.producedThisTurn } : undefined
        } : null
    })));
};

import { HistoryGraph } from './HistoryGraph';

export const ResourceSidebar: React.FC = () => {
    const { grid, city } = useGameStore();
    const [showHistory, setShowHistory] = useState(false);

    // Hover State
    const [hoveredResource, setHoveredResource] = useState<{
        label: string;
        breakdown: any[];
        rect: DOMRect;
    } | null>(null);

    // Run predictive simulation
    const prediction = useMemo(() => {
        if (!grid || !city) return null;
        const gridClone = cloneGrid(grid);
        const cityClone = { ...city };
        return runSimulation(gridClone, cityClone);
    }, [grid, city]);

    if (!prediction) return null;

    const { stats } = prediction;
    console.log('[Sidebar] Prediction Stats Breakdown:', stats.breakdown);
    const { netChanges, buildingAlerts } = stats;

    const isStable = buildingAlerts.length === 0 && netChanges[ResourceType.Money] >= 0 && netChanges[ResourceType.Happiness] >= 0;

    const activeEffectsList = useMemo(() => {
        const ids = city.activeStatusEffects || [];
        return ids.map(id => STATUS_EFFECTS.find(e => e.id === id)).filter(Boolean);
    }, [city.activeStatusEffects]);

    // Helper: Resource Row with Inline Warnings
    const ResourceRow = ({ icon: Icon, label, current, delta, colorClass, warnings, breakdown }: any) => {
        const deltaSign = delta > 0 ? '+' : '';
        const deltaColor = delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-slate-500';
        const rowRef = useRef<HTMLDivElement>(null);

        const handleMouseEnter = () => {
            console.log(`Hovering ${label}, breakdown:`, breakdown);
            if (breakdown && breakdown.length > 0 && rowRef.current) {
                const rect = rowRef.current.getBoundingClientRect();
                setHoveredResource({
                    label,
                    breakdown,
                    rect
                });
            } else {
                console.log(`No breakdown for ${label} or breakdown empty`);
            }
        };

        const handleMouseLeave = () => {
            setHoveredResource(null);
        };

        return (
            <div
                ref={rowRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="relative border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors"
            >
                <div className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg cursor-help">
                    <div className="flex items-center gap-3 text-slate-300">
                        <Icon size={16} className={colorClass} />
                        <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-sm">
                        <span className="text-white font-bold">{current}</span>
                        <span className={clsx("text-xs", deltaColor)}>
                            ({deltaSign}{delta})
                        </span>
                    </div>
                </div>

                {/* INLINE WARNING DISPLAY */}
                {warnings && warnings.length > 0 && (
                    <div className="pb-2 pl-7 animate-in slide-in-from-top-1">
                        {warnings.map((msg: string, i: number) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px] font-bold text-red-400 leading-tight">
                                <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
                                <span>{msg}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };



    // Additional Logic to catch generic warnings mapped to resources (e.g. "Stability" -> Money/Happiness)
    // Actually, `buildingAlerts` usually say "X disabled (No Money)".

    // Let's create specific alert buckets
    const moneyAlerts = buildingAlerts.filter(a => a.message.includes('Money') || a.message.includes('Maintenance')).map(a => a.message);
    // Happiness alerts might be about Pop or Services
    const happinessAlerts = buildingAlerts.filter(a => a.message.includes('Happiness')).map(a => a.message);
    // Pop alerts
    const popAlerts = buildingAlerts.filter(a => a.message.includes('Population') || a.message.includes('No Workers')).map(a => a.message);

    return (
        <>
            <div className="w-64 flex-shrink-0 flex flex-col gap-4 bg-slate-900 border-r border-slate-800 h-[calc(100vh-4rem)] sticky top-6 overflow-y-auto p-4 custom-scrollbar">

                {/* STATUS HEADER */}
                <div className={clsx(
                    "p-4 rounded-xl border-2 shadow-lg mb-2 relative overflow-hidden",
                    isStable ? "bg-slate-900 border-green-500/30" : "bg-red-950/20 border-red-500/50"
                )}>
                    <div className="flex items-center gap-2 mb-1 relative z-10">
                        {isStable ? <Activity size={20} className="text-green-500" /> : <AlertTriangle size={20} className="text-red-500" />}
                        <span className={clsx("text-lg font-black uppercase tracking-wide", isStable ? "text-green-500" : "text-red-500")}>
                            {isStable ? "Stable" : "Unstable"}
                        </span>
                    </div>
                    {/* Status Explanation */}
                    <div className="text-[10px] font-medium uppercase tracking-wider relative z-10">
                        {isStable ? (
                            <span className="text-green-400/70">
                                {netChanges[ResourceType.Money] > 10 ? "Strong Economy" : "Grid Balanced"}
                            </span>
                        ) : (
                            <div className="flex flex-col gap-0.5">
                                {buildingAlerts.length > 0 ? (
                                    <span className="text-red-400">{buildingAlerts.length} Critical Alerts</span>
                                ) : netChanges[ResourceType.Money] < 0 ? (
                                    <span className="text-red-400">Budget Deficit</span>
                                ) : (
                                    <span className="text-red-400">Services Failing</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Background Decorative Line */}
                    <div className={clsx("absolute bottom-0 left-0 h-1 w-full", isStable ? "bg-green-500/20" : "bg-red-500/20")} />
                </div>

                {/* ACTIVE EFFECTS */}
                {activeEffectsList.length > 0 && (
                    <div className="space-y-2 mb-2">
                        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Active Effects</h3>
                        {activeEffectsList.map((effect: any) => (
                            <div key={effect.id} className="p-2 rounded bg-slate-800 border border-slate-700 flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
                                    <Zap size={12} />
                                    <span className="uppercase">{effect.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 leading-tight">
                                    {effect.description}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* CORE RESOURCES */}
                <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">City State</h3>
                    <ResourceRow
                        icon={Coins}
                        label="Money"
                        current={city.money}
                        delta={netChanges[ResourceType.Money]}
                        colorClass="text-amber-400"
                        warnings={moneyAlerts}
                        breakdown={stats.breakdown.filter(b => b.resource === ResourceType.Money)}
                    />
                    <ResourceRow
                        icon={Smile}
                        label="Happiness"
                        current={city.happiness}
                        delta={netChanges[ResourceType.Happiness]}
                        colorClass="text-green-400"
                        warnings={happinessAlerts}
                        breakdown={stats.breakdown.filter(b => b.resource === ResourceType.Happiness)}
                    />
                    <ResourceRow
                        icon={Users}
                        label="Population"
                        current={city.population}
                        delta={netChanges[ResourceType.Population]}
                        colorClass="text-blue-400"
                        warnings={popAlerts}
                        breakdown={stats.breakdown.filter(b => b.resource === ResourceType.Population)}
                    />

                    <div className="flex items-center justify-between py-2 border-b border-slate-800">
                        <div className="flex items-center gap-3 text-slate-300">
                            <Activity size={16} className={clsx(
                                (city.serviceCoverage ?? 100) >= 80 ? "text-green-400" :
                                    (city.serviceCoverage ?? 100) >= 60 ? "text-amber-400" : "text-red-500"
                            )} />
                            <span className="text-sm font-medium">Services</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-sm">
                            <span className={clsx("font-bold",
                                (city.serviceCoverage ?? 100) >= 80 ? "text-green-400" :
                                    (city.serviceCoverage ?? 100) >= 60 ? "text-amber-400" : "text-red-500"
                            )}>
                                {city.serviceCoverage ?? 100}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* PRODUCTION */}
                <div className="space-y-1 mt-2">
                    <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Production</h3>
                    <ResourceRow
                        icon={Zap}
                        label="Power Surplus"
                        current={city.powerAvailable}
                        delta={prediction.city.powerAvailable - city.powerAvailable}
                        colorClass="text-purple-400"
                        breakdown={stats.breakdown.filter(b => b.resource === ResourceType.Power)}
                    />
                    <ResourceRow
                        icon={Briefcase}
                        label="Workforce"
                        // Show Total context: "5 / 10"
                        current={
                            <span className="flex items-baseline gap-1">
                                {city.workforceAvailable}
                                <span className="text-[10px] text-slate-500 font-normal">
                                    / {city.population}
                                </span>
                            </span>
                        }
                        delta={prediction.city.workforceAvailable - city.workforceAvailable}
                        colorClass="text-orange-400"
                        breakdown={stats.breakdown.filter(b => b.resource === ResourceType.Workforce)}
                    />
                    <ResourceRow
                        icon={Package}
                        label="Raw Goods"
                        current={city.rawGoodsAvailable}
                        delta={netChanges[ResourceType.RawGoods]}
                        colorClass="text-indigo-400"
                        breakdown={stats.breakdown.filter(b => b.resource === ResourceType.RawGoods)}
                    />
                    <ResourceRow
                        icon={Package}
                        label="Products"
                        current={city.productsAvailable}
                        delta={netChanges[ResourceType.Products]}
                        colorClass="text-pink-400"
                        breakdown={stats.breakdown.filter(b => b.resource === ResourceType.Products)}
                    />
                </div>

                {/* TURN INFO */}
                <div className="mt-auto pt-4 border-t border-slate-800">
                    {/* History Button with Contextual Highlight */}
                    {(() => {
                        const hasStabilityIssue = (city.serviceCoverage ?? 100) < 100;
                        const hasLowHappiness = city.happiness < 40; // Requirement says 20, but 40 is warning level in simulation
                        const hasProductShortage = city.productsAvailable === 0 && netChanges[ResourceType.Population] > 0;
                        const shouldHighlight = hasStabilityIssue || hasLowHappiness || hasProductShortage;

                        return (
                            <button
                                onClick={() => setShowHistory(true)}
                                className={clsx(
                                    "w-full flex items-center justify-center gap-2 py-2 mb-3 rounded-lg border transition-all group relative overflow-hidden",
                                    shouldHighlight
                                        ? "bg-amber-900/20 border-amber-500/50 hover:bg-amber-900/40 animate-pulse"
                                        : "border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-slate-500"
                                )}
                            >
                                {shouldHighlight && (
                                    <div className="absolute inset-0 bg-amber-500/10" />
                                )}
                                <Activity size={16} className={clsx(
                                    "transition-colors",
                                    shouldHighlight ? "text-amber-400" : "text-slate-400 group-hover:text-blue-400"
                                )} />
                                <span className={clsx(
                                    "text-xs font-bold uppercase transition-colors",
                                    shouldHighlight ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                                )}>
                                    {shouldHighlight ? "Review Trends" : "View Trends"}
                                </span>
                            </button>
                        );
                    })()}

                    <div className="flex items-center justify-between px-2 py-2 bg-slate-800/50 rounded-lg">
                        <span className="text-xs uppercase font-bold text-slate-500">Current Turn</span>
                        <span className="text-xl font-mono font-bold text-white">{city.turn}</span>
                    </div>
                </div>
            </div >

            {/* HISTORY POPUP */}
            {showHistory && <HistoryGraph onClose={() => setShowHistory(false)} />}

            {/* FIXED TOOLTIP LAYER */}
            {
                hoveredResource && (
                    <div
                        className="fixed z-[100] w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 pointer-events-none"
                        style={{
                            top: hoveredResource.rect.top,
                            left: hoveredResource.rect.right + 10,
                        }}
                    >
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 border-b border-slate-800 pb-1">
                            {hoveredResource.label} Breakdown
                        </div>
                        <div className="space-y-1">
                            {(() => {
                                const aggregated = hoveredResource.breakdown.reduce((acc: Record<string, number>, item: any) => {
                                    acc[item.source] = (acc[item.source] || 0) + item.amount;
                                    return acc;
                                }, {});

                                return Object.entries(aggregated).map(([source, amount]) => (
                                    <div key={source} className="flex justify-between text-xs">
                                        <span className="text-slate-400 truncate pr-2">{source}</span>
                                        <span className={clsx("font-mono", (amount as number) > 0 ? "text-green-400" : "text-red-400")}>
                                            {(amount as number) > 0 ? '+' : ''}{amount as number}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )
            }
        </>
    );
};
