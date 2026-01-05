
import type { Cell, CityState, TurnSnapshot, Tile } from '../types';
import { runSimulation } from './resolvers';
import { BLUEPRINTS } from '../config/blueprints';
import { resolveMerge } from './grid';
// Removed unused uuid import

// We need a helper for ID generation if uuid is not available or too heavy
const generateId = () => Math.random().toString(36).substr(2, 9);

interface ActionPlaceResult {
    success: boolean;
    newGrid?: Cell[][];
    newCity?: CityState;
    snapshot?: TurnSnapshot;
    gameState?: 'playing' | 'gameover';
}

const cloneGrid = (grid: Cell[][]): Cell[][] => {
    return grid.map(row => row.map(cell => ({
        ...cell,
        tile: cell.tile ? { ...cell.tile } : null
    })));
};

interface ValidationResult {
    valid: boolean;
    reason?: string;
}

export const canExecutePlaceBuilding = (
    city: CityState,
    grid: Cell[][],
    r: number,
    c: number,
    blueprintId: string | null
): ValidationResult => {
    if (!blueprintId) return { valid: false, reason: "No blueprint selected." };
    if (city.blueprintState.hasPlacedThisTurn) return { valid: false, reason: "Already placed a building this turn." };

    const blueprint = BLUEPRINTS[blueprintId];
    if (!blueprint) return { valid: false, reason: "Invalid blueprint." };

    if (city.money < (blueprint.buildCost || 0)) return { valid: false, reason: `Not enough money (Need ${blueprint.buildCost}).` };

    if (grid[r][c].tile) return { valid: false, reason: "Space is occupied." };

    return { valid: true };
};

export const executePlaceBuilding = (
    currentCity: CityState,
    currentGrid: Cell[][],
    _turnHistory: TurnSnapshot[],
    r: number,
    c: number,
    blueprintId: string
): ActionPlaceResult & { failureReason?: string } => {
    // 1. Validate
    const validation = canExecutePlaceBuilding(currentCity, currentGrid, r, c, blueprintId);
    if (!validation.valid) {
        return { success: false, failureReason: validation.reason };
    }

    const blueprint = BLUEPRINTS[blueprintId];
    const buildCost = blueprint.buildCost || 0;

    // 2. Clone State
    const newGrid = cloneGrid(currentGrid);
    const cell = newGrid[r][c];

    // 3. Place Tile
    cell.tile = {
        id: generateId(),
        type: blueprint.buildingType,
        tier: blueprint.tier,
        stars: 0, // Starts at 0, or 1? Simulation resets to 1?
        // Wait, simulation `index.ts`: `t.stars = 1`.
        // So we can init with 1 here.
        // Actually, logic is: Place, Merge (Reset to 1), Run Sim.
        // Sim expects stars to be set.
    } as Tile;

    cell.tile.stars = 1; // Explicitly set to 1

    // 4. Resolve Merges
    resolveMerge(newGrid, r, c);

    // 5. Deduct Cost
    // We apply cost momentarily to input city for Sim?
    // "Apply construction cost BEFORE simulation runs"
    const cityAfterCost = { ...currentCity, money: currentCity.money - buildCost };

    // 6. Run Simulation
    const { city: newCity, stats } = runSimulation(newGrid, cityAfterCost);

    // 7. Advance Turn
    newCity.turn += 1;
    newCity.blueprintState.hasPlacedThisTurn = false; // Reset for next turn

    // 8. Check Game Over
    let newGameState: 'playing' | 'gameover' = 'playing';
    if (newCity.happiness <= 0) newGameState = 'gameover';

    const hasEmpty = newGrid.some(row => row.some(c => c.tile === null));
    if (!hasEmpty && newGameState === 'playing') {
        newGameState = 'gameover'; // Grid Full
    }

    // 9. Snapshot
    const snapshot: TurnSnapshot = {
        turnNumber: currentCity.turn,
        action: `Placed ${blueprint.name} at (${r}, ${c})`,
        city: newCity,
        grid: newGrid,
        stats: stats,
        timestamp: Date.now()
    };

    return {
        success: true,
        newGrid,
        newCity,
        snapshot,
        gameState: newGameState
    };
};
