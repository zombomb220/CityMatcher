
import { describe, it, expect } from 'vitest';
import { runSimulation } from './simulation';
import { BuildingType } from '../types';
import type { Tile, CityState } from '../types';

const createMockCity = (): CityState => ({
    powerCapacity: 0,
    jobsCapacity: 0,
    activeStatusEffects: [],
    money: 1000,
    population: 100,
    happiness: 50,
    workforceAvailable: 0,
    rawGoodsAvailable: 0,
    productsAvailable: 0,
    powerAvailable: 0,
    unemployed: 0,
    turn: 1,
    stabilityDebt: 0,
    blueprintState: {
        unlockedIds: [],
        activeSlots: [],
        maxSlots: 5,
        hasPlacedThisTurn: false,
        newUnlocks: []
    },
    history: []
});

const createTile = (type: BuildingType, r: number, c: number, tier: number = 1): any => ({
    r, c,
    tile: {
        id: `${type}_${r}_${c}`,
        type,
        tier,
        stars: 1,
        disabled: false
    } as Tile
});

describe('Simulation Robustness & Star Rules', () => {

    it('Baseline Scenario: 15 Turns of Evolution', () => {
        let city = createMockCity();
        let grid: any[][] = Array(7).fill(null).map(() => Array(7).fill({ tile: null }));

        const runTurn = () => {
            const gridCopy = JSON.parse(JSON.stringify(grid));
            const res = runSimulation(gridCopy, { ...city });
            city = res.city;
            for (let r = 0; r < 7; r++) {
                for (let c = 0; c < 7; c++) {
                    if (gridCopy[r][c].tile) {
                        grid[r][c].tile = gridCopy[r][c].tile;
                    }
                }
            }
            return res.stats;
        };

        // TURN 1: Place Power Plant.
        grid[0][0] = createTile(BuildingType.Power, 0, 0);
        runTurn();
        expect(grid[0][0].tile.stars).toBe(3);

        // TURN 2: Add Residential. 
        grid[0][1] = createTile(BuildingType.Residential, 0, 1);
        runTurn();

        // TURN 3: Add Factory (High Load).
        grid[0][2] = createTile(BuildingType.Factory, 0, 2);
        runTurn();

        // Power Plant T1 upgrades quickly with money
        expect(grid[0][0].tile.stars).toBe(3);

        // TURN 4: Expand. Add another Factory.
        grid[0][3] = createTile(BuildingType.Factory, 0, 3);
        runTurn();

        // Still 3.
        expect(grid[0][0].tile.stars).toBe(3);
    });
});
