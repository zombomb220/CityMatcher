import { create } from 'zustand';
import type { Cell, CityState, TurnSnapshot } from '../types';
import { createGrid } from '../logic/grid';
import { executePlaceBuilding } from '../logic/actions';
import { STARTING_CITY, BLUEPRINT_SLOT_COSTS } from '../config/buildingStats';
import { useMetaStore } from './metaStore';
import { calculateRunExports } from '../logic/meta/exportEvaluator';
import { BLUEPRINTS } from '../config/blueprints';

interface GameState {
    grid: Cell[][];
    city: CityState;
    heldBlueprintId: string | null;
    gameState: 'playing' | 'gameover' | 'completed'; // Added 'completed'
    turnHistory: TurnSnapshot[];
    error: string | null;

    activeCityId: string | null; // NEW: Track which city scenario we are playing

    // Actions
    resetGame: () => void;
    startCityRun: (cityId: string) => void; // NEW: Start a specific city
    finishCityRun: () => void; // NEW: End run and save to meta

    clearError: () => void;
    selectBlueprint: (id: string) => void;
    placeBuilding: (r: number, c: number) => void;
    clearNewUnlocks: () => void;
    toggleUpkeep: (r: number, c: number) => void;

    buyBlueprintSlot: () => void;
}

const cloneGrid = (grid: Cell[][]): Cell[][] => {
    return grid.map(row => row.map(cell => ({
        ...cell,
        tile: cell.tile ? { ...cell.tile } : null
    })));
};


export const useGameStore = create<GameState>((set, get) => ({
    grid: createGrid(),
    city: { ...STARTING_CITY }, // Note: STARTING_CITY now includes blueprintState
    heldBlueprintId: null,
    gameState: 'playing',
    turnHistory: [],
    error: null,
    activeCityId: null,

    resetGame: () => {
        set({
            grid: createGrid(),
            city: { ...STARTING_CITY },
            heldBlueprintId: null,
            gameState: 'playing',
            turnHistory: [],
            error: null,
            activeCityId: null
        });
    },

    startCityRun: (cityId: string) => {
        const metaStore = useMetaStore.getState();
        const config = metaStore.getCityConfig(cityId);

        const initialCity = { ...STARTING_CITY };

        // 1. Apply Base Config
        if (config) {
            initialCity.money = config.baseBudget;
        }

        // 2. Apply Global Rewards from Meta Progression
        // Iterate through ALL cities and their thresholds.
        // If unlocked, apply reward.
        const allCities = Object.values(metaStore.cityProgress);
        allCities.forEach(cityProgress => {
            const cityConfig = metaStore.getCityConfig(cityProgress.cityId);
            if (!cityConfig) return;

            cityProgress.unlockedThresholdIds.forEach(tId => {
                const threshold = cityConfig.thresholds.find(t => t.id === tId);
                if (!threshold) return;

                const r = threshold.reward;
                if (r.type === 'budget_bonus') {
                    // Accumulate Starting Budget
                    initialCity.money += (r.value as number);
                } else if (r.type === 'modifier') {
                    const modName = r.value as string;
                    // Map modifier names to actual mechanics
                    if (modName === 'solar_efficiency' || modName === 'solar_eff') {
                        initialCity.solarEfficiencyMultiplier = (initialCity.solarEfficiencyMultiplier || 1) + 0.25; // +25%
                    } else if (modName === 'pop_growth') {
                        initialCity.popGrowthMultiplier = (initialCity.popGrowthMultiplier || 1) + 0.10; // +10%
                    } else if (modName === 'upkeep_red') {
                        initialCity.upkeepMultiplier = (initialCity.upkeepMultiplier || 1) - 0.10; // -10%
                    } else if (modName === 'export_rate') {
                        initialCity.exportRateMultiplier = (initialCity.exportRateMultiplier || 1) + 0.15; // +15%
                    }

                } else if (r.type === 'unlock_node') {
                    // Already unlocked? Or unlock globally?
                    // "Unlock Supermarket".
                    // Add to blueprintState.unlockedIds if not present.
                    const bpId = r.value as string;

                    // FILTER: Only add if it is a valid Blueprint.
                    // Some 'unlock_node' rewards are for Map Nodes (e.g. "city_02_hills"), which are not blueprints.
                    if (BLUEPRINTS[bpId]) {
                        if (!initialCity.blueprintState.unlockedIds.includes(bpId)) {
                            initialCity.blueprintState.unlockedIds.push(bpId);
                        }
                    }
                }
            });
        });

        set({
            grid: createGrid(),
            city: initialCity,
            heldBlueprintId: null,
            gameState: 'playing',
            turnHistory: [],
            error: null,
            activeCityId: cityId
        });
    },

    finishCityRun: () => {
        const state = get();
        if (!state.activeCityId) return;

        // 1. Calculate Exports
        const exports = calculateRunExports(state.city);

        // 2. Save to Meta
        useMetaStore.getState().updateCityProgress(state.activeCityId, exports);

        // 3. Update State
        set({ gameState: 'completed' });
    },

    clearError: () => set({ error: null }),

    clearNewUnlocks: () => {
        set((state) => ({
            city: {
                ...state.city,
                blueprintState: {
                    ...state.city.blueprintState,
                    newUnlocks: []
                }
            }
        }));
    },

    selectBlueprint: (id: string) => {
        set({ heldBlueprintId: id });
    },

    placeBuilding: (r: number, c: number) => {
        set((state) => {
            if (state.gameState !== 'playing') return state;
            if (!state.heldBlueprintId) return state;

            const result = executePlaceBuilding(
                state.city,
                state.grid,
                state.turnHistory,
                r,
                c,
                state.heldBlueprintId
            );

            if (result.success) {
                return {
                    grid: result.newGrid!,
                    city: result.newCity!,
                    heldBlueprintId: null,
                    gameState: result.gameState === 'gameover' ? 'gameover' : 'playing', // preserve logic
                    turnHistory: [...state.turnHistory, result.snapshot!],
                    error: null // Clear any previous error
                };
            } else {
                return {
                    error: result.failureReason || "Failed to place building."
                };
            }
        });
    },

    toggleUpkeep: (r: number, c: number) => {
        set((state) => {
            const newGrid = cloneGrid(state.grid);
            const tile = newGrid[r][c].tile;

            // Only toggle if building exists and is enabled (or can be enabled?)
            // Actually, keep it simple. Toggle flag. Simulation handles the rest.
            if (tile) {
                // If it's currently disabled, we can still mark it for upkeep next turn?
                // Yes.
                tile.upkeepPaid = !tile.upkeepPaid;
            }
            return { grid: newGrid };
        });
    },

    buyBlueprintSlot: () => {
        set((state) => {
            const currentSlots = state.city.blueprintState.maxSlots;
            // Formula: Base * (Multiplier ^ (Slots - InitialSlots))
            // Let's assume start is 5 (STARTING_CITY.blueprintState.maxSlots).
            const extra = Math.max(0, currentSlots - 5);
            const cost = Math.floor(BLUEPRINT_SLOT_COSTS.base * Math.pow(BLUEPRINT_SLOT_COSTS.multiplier, extra));

            if (state.city.money >= cost) {
                return {
                    city: {
                        ...state.city,
                        money: state.city.money - cost,
                        blueprintState: {
                            ...state.city.blueprintState,
                            maxSlots: currentSlots + 1
                        }
                    }
                };
            }
            return state;
        });
    },
}));
