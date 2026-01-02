import { describe, it, expect } from 'vitest';
import { runSimulation } from './simulation';
import { BuildingType } from '../types';
import type { CityState, Cell } from '../types';

describe('Disabled Reason Logic', () => {
    const createEmptyGrid = (): Cell[][] => {
        const grid: Cell[][] = [];
        for (let r = 0; r < 3; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < 3; c++) {
                row.push({ r, c, tile: null });
            }
            grid.push(row);
        }
        return grid;
    };

    const initialCity: CityState = {
        powerCapacity: 0,
        jobsCapacity: 0,
        activeStatusEffects: [],
        money: 100,
        population: 0,
        happiness: 100,
        workforceAvailable: 0,
        rawGoodsAvailable: 0,
        productsAvailable: 0,
        powerAvailable: 0,
        unemployed: 0,
        turn: 1,
        stabilityDebt: 0,
        blueprintState: { unlockedIds: [], activeSlots: [], maxSlots: 3, hasPlacedThisTurn: false, newUnlocks: [] },
        history: []
    };


    it('should disable when power is missing (Hard Constraint)', () => {
        const grid = createEmptyGrid();
        grid[0][0].tile = { id: '1', type: BuildingType.Factory, tier: 1, stars: 0 };
        // Factory needs Workforce 1. Place Res T1 (Pop 1 -> Work 1)
        grid[0][1].tile = { id: 'res', type: BuildingType.Residential, tier: 1, stars: 1 };

        // City with 0 power
        const city = { ...initialCity, powerAvailable: 0 };
        const res = runSimulation(grid, city);

        const tile = grid[0][0].tile;
        expect(tile?.disabled).toBe(true);
        expect(tile?.disabledReason).toBe('power');
        expect(tile?.stars).toBe(0);
        // Since disabled, factory consumes 0.
        expect(res.city.powerAvailable).toBe(0);
    });

    it('should disable when population is missing (Hard Constraint)', () => {
        const grid = createEmptyGrid();
        // Use T2 Factory which requires Workforce 2
        grid[0][0].tile = { id: '1', type: BuildingType.Factory, tier: 2, stars: 0 };
        grid[0][1].tile = { id: '2', type: BuildingType.Power, tier: 1, stars: 0 }; // Power OK

        const city = { ...initialCity, workforceAvailable: 0 };
        const res = runSimulation(grid, city);

        const factory = grid[0][0].tile;
        expect(factory?.disabled).toBe(true);
        expect(factory?.disabledReason).toBe('workforce');
        expect(res.city.workforceAvailable).toBe(0);
    });
});
