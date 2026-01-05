import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CityConfig, CityProgress, CityExportData } from '../types/metaTypes';

// Initial Configuration for Cities (The "Levels")
import metaLayout from '../config/metaLayout.json';

// Initial Configuration for Cities (The "Levels")
export const CITY_CONFIGS_DATA: Record<string, CityConfig> = metaLayout as unknown as Record<string, CityConfig>;

// Aliasing for compatibility if used elsewhere
export const CITY_CONFIGS = CITY_CONFIGS_DATA;

interface MetaState {
    cityProgress: Record<string, CityProgress>;
    globalUnlocks: string[];

    // Actions
    updateCityProgress: (cityId: string, exports: CityExportData) => void;
    getCityConfig: (cityId: string) => CityConfig | undefined;
    isNodeUnlocked: (cityId: string) => boolean;
}

export const useMetaStore = create<MetaState>()(
    persist(
        (set, get) => ({
            cityProgress: Object.values(CITY_CONFIGS_DATA).reduce((acc, config) => {
                if (config.debug_initial_progress) {
                    acc[config.id] = {
                        cityId: config.id,
                        bestExports: {
                            money: 0, raw_goods: 0, products: 0, power: 0,
                            happiness: 0, population: 0, turns: 0, completed: false,
                            ...config.debug_initial_progress.bestExports
                        },
                        unlockedThresholdIds: config.debug_initial_progress.unlockedThresholdIds || [],
                        runCount: config.debug_initial_progress.runCount || 0,
                        completed: config.debug_initial_progress.completed || false
                    };
                }
                return acc;
            }, {} as Record<string, CityProgress>),
            globalUnlocks: [],

            getCityConfig: (cityId) => CITY_CONFIGS_DATA[cityId],

            isNodeUnlocked: (cityId) => {
                // 1. Alpha Prime is always unlocked
                if (cityId === 'city_01_plains') return true;

                // 2. Check if any COMPLETED city connects to this one
                const state = get();
                const allConfigs = Object.values(CITY_CONFIGS_DATA);

                for (const config of allConfigs) {
                    // If this config connects to our target cityId
                    if (config.connections?.includes(cityId)) {
                        // Check if the source city is completed
                        const progress = state.cityProgress[config.id];
                        if (progress?.completed) {
                            return true;
                        }
                    }
                }

                return false;
            },

            updateCityProgress: (cityId, exports) => {
                set((state) => {
                    const config = CITY_CONFIGS_DATA[cityId];
                    if (!config) return state;

                    const currentProgress = state.cityProgress[cityId] || {
                        cityId,
                        bestExports: {
                            money: 0, raw_goods: 0, products: 0, power: 0,
                            happiness: 0, population: 0, turns: 0, completed: false
                        },
                        unlockedThresholdIds: [],
                        runCount: 0
                    };

                    // 1. Update Best Exports
                    const newBestExports = { ...currentProgress.bestExports };
                    newBestExports.money = Math.max(newBestExports.money, exports.money);
                    newBestExports.raw_goods = Math.max(newBestExports.raw_goods, exports.raw_goods);
                    newBestExports.products = Math.max(newBestExports.products, exports.products);
                    newBestExports.power = Math.max(newBestExports.power, exports.power);
                    newBestExports.happiness = Math.max(newBestExports.happiness, exports.happiness);

                    // 2. Check Unlocks
                    const newUnlocks = [...currentProgress.unlockedThresholdIds];

                    config.thresholds.forEach(threshold => {
                        if (newUnlocks.includes(threshold.id)) return; // Already unlocked

                        const bestValueToCheck = newBestExports[threshold.resource] as number;
                        if (bestValueToCheck >= threshold.value) {
                            newUnlocks.push(threshold.id);
                        }
                    });

                    // 3. Update Completion Status
                    // specific logic: If you have unlocked ANY threshold, the city is "completed" enough to progress.
                    // Or we could require a specific "Victory" threshold. For now, any threshold > 0.
                    const isCompleted = newUnlocks.length > 0;

                    return {
                        cityProgress: {
                            ...state.cityProgress,
                            [cityId]: {
                                ...currentProgress,
                                bestExports: newBestExports,
                                unlockedThresholdIds: newUnlocks,
                                runCount: currentProgress.runCount + 1,
                                completed: isCompleted
                            }
                        }
                    };
                });
            }
        }),
        {
            name: 'city-matcher-meta-storage',
        }
    )
);
