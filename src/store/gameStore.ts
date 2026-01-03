import { create } from 'zustand';
import type { Cell, CityState, TurnSnapshot } from '../types';
import { createGrid } from '../logic/grid';
import { executePlaceBuilding } from '../logic/actions';
import { STARTING_CITY, BLUEPRINT_SLOT_COSTS } from '../config/buildingStats';

interface GameState {
    grid: Cell[][];
    city: CityState;
    heldBlueprintId: string | null;
    gameState: 'playing' | 'gameover';
    turnHistory: TurnSnapshot[];

    // Actions
    resetGame: () => void;
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


export const useGameStore = create<GameState>((set) => ({
    grid: createGrid(),
    city: { ...STARTING_CITY }, // Note: STARTING_CITY now includes blueprintState
    heldBlueprintId: null,
    gameState: 'playing',
    turnHistory: [],

    resetGame: () => {
        set({
            grid: createGrid(),
            city: { ...STARTING_CITY },
            heldBlueprintId: null,
            gameState: 'playing',
            turnHistory: [],
        });
    },

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
                    gameState: result.gameState!,
                    turnHistory: [...state.turnHistory, result.snapshot!]
                };
            }
            return state;
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
            // Formula: Base * Multiplier ^ (Slots - InitialSlots?)
            // Or just use count.
            // "Increasing cost per slot".

            // Simplification: Base + (ExtraSlots * Base * Multiplier)
            // Or exponential.

            // Let's use linear scaling for simplicity with the planned JSON.
            // JSON: base: 10, multiplier: 1.5.
            // Cost = Base * (Multiplier ^ (currentSlots - 5))? Assuming 5 is start.
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
