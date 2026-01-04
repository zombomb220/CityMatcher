import { describe, it, expect, vi } from 'vitest';
import { runSimulation } from './simulation';
import { BuildingType } from '../types';
import type { CityState, Cell } from '../types';
import { STARTING_CITY } from '../config/buildingStats';

// Mock game data to ensure consistent values for testing
vi.mock('../config/buildingStats', () => ({
    STARTING_CITY: {
        money: 0,
        population: 0,
        happiness: 100,
        turn: 0,
        workforceAvailable: 0,
        powerAvailable: 0,
        powerCapacity: 0,
        rawGoodsAvailable: 0,
        productsAvailable: 0,
        unemployed: 0,
        jobsCapacity: 0,
        serviceCoverage: 0,
        activeStatusEffects: [],
        blueprintState: {
            unlockedIds: [],
            newUnlocks: [],
            maxSlots: 99
        }
    },
    POPULATION_PARAMS: {
        productConsumptionRate: 0
    },
    STATUS_EFFECTS: []
}));

const createEmptyGrid = (): Cell[][] => {
    return Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) => ({ r, c, tile: null }))
    );
};

const setupCity = (money = 0, population = 0): CityState => ({
    ...STARTING_CITY,
    money,
    population,
    happiness: 100,
    turn: 1
});

describe('Tax and Power Balance', () => {

    it('collects tax from population', () => {
        const grid = createEmptyGrid();
        // Setup a city with population but no buildings
        const city = setupCity(100, 100);
        // Tax per pop is 0.25 (from gameData.json)
        // Expected Tax: 100 * 0.25 = 25
        // Maintenance per pop is 0.08
        // Expected Maint: 100 * 0.08 = 8
        // Net: +17

        const { city: nextCity, stats } = runSimulation(grid, city);

        // Check breakdown if available, or just net money
        const taxEntry = stats.breakdown.find(b => b.source === 'Tax');

        // Assertions - EXPECT TO FAIL initially if logic is missing
        expect(taxEntry).toBeDefined();
        expect(taxEntry?.amount).toBe(25);
        expect(nextCity.money).toBeGreaterThan(100);
    });

    it('charges for idle power', () => {
        const grid = createEmptyGrid();
        // Place multiple T1 Power Plants to generate excess power
        // T1 Power: Produces 3 Power. Needs Money 1.
        // We place 5 T1 Power Plants = 15 Power.
        for (let i = 0; i < 5; i++) {
            grid[0][i].tile = {
                id: `p1_${i}`,
                type: BuildingType.Power,
                tier: 1,
                stars: 1,
                upkeepPaid: true
            };
        }

        // Place 1 Residential to consume specific small amount?
        // Res T1 consumes 1 Power.
        grid[1][0].tile = {
            id: 'r1',
            type: BuildingType.Residential,
            tier: 1,
            stars: 1
        };

        const city = setupCity(1000, 10);
        // Money 1000 covers 5 Power Plants * 1 Money = 5 upkeep (base req).

        const { stats } = runSimulation(grid, city);

        // Produced: 5 * 3 = 15.
        // Consumed: 2 (Res T1 upgrades to Star 2! Consumes 2 Power).
        // Idle: 13.
        // Cost: 13 * 0.15 = 1.95 -> Floor 1.

        const idleEntry = stats.breakdown.find(b => b.source === 'Grid Inefficiency');

        expect(idleEntry).toBeDefined();
        expect(idleEntry?.amount).toBe(-1);
    });
});
