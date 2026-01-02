import { create } from 'zustand';
import type { Cell, CityState, TurnSnapshot } from '../types';
import { createGrid, resolveMerge } from '../logic/grid';
import { runSimulation } from '../logic/simulation';
import { STARTING_CITY, BLUEPRINT_SLOT_COSTS } from '../config/buildingStats';
import { BLUEPRINTS } from '../config/blueprints';

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
            if (state.city.blueprintState.hasPlacedThisTurn) return state; // Only 1 per turn
            const blueprintId = state.heldBlueprintId;
            if (!blueprintId) return state;

            const blueprint = BLUEPRINTS[blueprintId];
            if (!blueprint) return state;

            // Check Build Cost Affordability
            const buildCost = blueprint.buildCost || 0;
            if (state.city.money < buildCost) return state; // Cannot afford

            // 1. Deep Clone Grid
            const newGrid = cloneGrid(state.grid);
            const cell = newGrid[r][c];

            // 2. Validate move
            if (cell.tile) return state;

            // 3. Place Tile
            cell.tile = {
                id: Math.random().toString(36).substr(2, 9),
                type: blueprint.buildingType,
                tier: blueprint.tier,
                stars: 0,
            };

            // 4. Resolve Merges
            resolveMerge(newGrid, r, c);

            // 5. Run Simulation & Advance Turn
            // Apply construction cost BEFORE simulation runs
            const cityAfterCost = { ...state.city, money: state.city.money - buildCost };
            const { city: newCity, stats } = runSimulation(newGrid, cityAfterCost);

            // Mark turn used (but runSimulation advanced turn count? We should verify)
            // Original `runSimulation` returned newCity and we did `newCity.turn += 1` manually in store.
            // Let's keep that pattern.
            newCity.turn += 1;

            // Allow placing next turn (Wait, hasPlacedThisTurn should be TRUE now, reset on NEXT turn start?)
            // Actually, "Player places exactly ONE building per turn".
            // So we set hasPlacedThisTurn = true.
            // But when does it reset? 
            // The turn advances IMMEDIATELY after placement in this current loop? 
            // "Merge rules remain unchanged... One action per turn".
            // If the turn increments immediately, then hasPlacedThisTurn should be FALSE for the NEW turn.
            // So effectively, we just successfully advanced the turn.
            newCity.blueprintState.hasPlacedThisTurn = false;

            // 6. Check Win/Lose
            // 6. Check Win/Lose
            let newGameState: 'playing' | 'gameover' = 'playing';
            if (newCity.happiness <= 0) newGameState = 'gameover';
            // Service Coverage Collapse: < 60% triggers "Collapse" state, but prompt says "loss condition begins".
            // "Buildings disable, loss condition begins". 
            // Usually this means it's a fail state if it persists or maybe instant fail? 
            // "Why is my city about to fail?" -> Implies it's not instant gameover but leads to it?
            // "Coverage < 60% Collapse: Buildings disable, loss condition begins".
            // Let's make it strict for now or check if we want immediate Game Over.
            // "A player should be able to answer... Why is my city about to fail?"
            // If < 60% disables buildings -> Population drops -> Happiness drops -> Game Over.
            // So we don't necessarily force Game Over immediately on < 60%, 
            // but the "Collapse" phase in simulation will handle the death spiral.
            // However, if we want a hard kill like Stability Debt:
            // Stability Debt was ">= 3". 
            // Let's stick to the prompt: "Buildings disable, loss condition begins".
            // So we TRUST the simulation to kill the player via Happiness or other means if they stay in Collapse.
            // But let's keep a hard floor if needed. For now, removing the StabilityDebt check.

            // Service Coverage Collapse: < 60% leads to "Collapse" state (buildings disable).
            // We rely on the simulation's happiness penalties to eventually trigger Game Over if unaddressed.


            const hasEmpty = newGrid.some(row => row.some(c => c.tile === null));
            if (!hasEmpty && newGameState === 'playing') {
                newGameState = 'gameover';
            }

            // SNAPSHOT
            const snapshot: TurnSnapshot = {
                turnNumber: state.city.turn, // Record the Turn Number we just finished (e.g. Turn 1 action leads to State Turn 2 start... wait)
                // "Gather the COMPLETE turn history from Turn 1 through the current turn."
                // "Action: {humanReadableAction}"
                // If I am on Turn 1, and I place a building.
                // The snapshot should describe "Turn 1".
                // The STATE in the snapshot should be the Resulting state? "Use END-OF-TURN snapshots only."
                // Yes. So if I start Turn 1, Place, I get State (Turn 2 Start).
                // The snapshot is for "Turn 1".
                // turnNumber: state.city.turn, // <-- Removed duplicate
                action: `Placed ${blueprint.name} at (${r}, ${c})`,
                city: newCity, // Immutable snapshot of result
                grid: newGrid, // Immutable snapshot of result
                stats: stats,
                timestamp: Date.now()
            };

            return {
                grid: newGrid,
                city: newCity,
                heldBlueprintId: null, // Deselect after placement
                gameState: newGameState,
                turnHistory: [...state.turnHistory, snapshot]
            };
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
