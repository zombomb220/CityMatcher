
import { describe, it, expect, beforeEach } from 'vitest';
import { runSimulation } from './simulation';
import { createGrid } from './grid';
import { BuildingType, ResourceType } from '../types';
import type { Cell, CityState } from '../types';
// import gameData from '../config/gameData.json';

// Minimal City State
const INITIAL_CITY = {
    money: 100,
    population: 0,
    happiness: 100,
    workforceAvailable: 0,
    rawGoodsAvailable: 0,
    productsAvailable: 0,
    powerAvailable: 0,
    powerCapacity: 0,
    jobsCapacity: 0,
    unemployed: 0,
    turn: 0,
    stabilityDebt: 0,
    activeStatusEffects: [],
    history: [],
    blueprintState: {
        unlockedIds: [],
        activeSlots: [],
        maxSlots: 3,
        hasPlacedThisTurn: false,
        newUnlocks: []
    }
};

describe('Localized Simulation Engine', () => {
    let grid: Cell[][];
    let city: CityState;

    beforeEach(() => {
        grid = createGrid();
        city = JSON.parse(JSON.stringify(INITIAL_CITY));
    });

    it('should allow Power to enable nearby Residential', () => {
        // Place Power at 0,0
        // Place Res at 0,1 (Dist 1)

        grid[0][0].tile = {
            id: 'p1',
            type: BuildingType.Power,
            tier: 1,
            stars: 0,
            storage: {}
        };

        grid[0][1].tile = {
            id: 'r1',
            type: BuildingType.Residential,
            tier: 1,
            stars: 0,
            storage: {}
        };

        // Config: Power T1 produces 3 Power. Res T1 needs 1 Power. Influence Radius >= 1.

        const result = runSimulation(grid, city);

        expect(result.stats.netChanges[ResourceType.Power]).toBe(3); // Produced

        // Res should be active (Stars >= 1)
        const resTile = grid[0][1].tile;
        expect(resTile.stars).toBeGreaterThanOrEqual(1);
    });

    it('should NOT allow Power to enable far away Residential', () => {
        // Place Power at 0,0
        // Place Res at 6,6 (Dist > 4)

        grid[0][0].tile = { id: 'p1', type: BuildingType.Power, tier: 1, stars: 0 };
        grid[6][6].tile = { id: 'r1', type: BuildingType.Residential, tier: 1, stars: 0 };

        runSimulation(grid, city);

        // Res needs Power. Power has Radius 3 (T1). Distance is 6 (Chebyshev).
        // Should Fail.
        const resTile = grid[6][6].tile;
        expect(resTile.stars).toBe(0);
        expect(resTile.disabled).toBe(true);
    });

    it('should chain production in the same turn (Power -> Factory)', () => {
        // Power (0) -> Factory (2).
        // Fac needs Power.

        grid[2][2].tile = { id: 'p1', type: BuildingType.Power, tier: 1, stars: 0 };
        grid[2][3].tile = { id: 'f1', type: BuildingType.Factory, tier: 1, stars: 0 };

        // Add implicit workforce (Factory needs 1 Workforce)
        // We can cheat by adding stored workforce? Or just adding a Residence?
        // Let's Add Residence (1)

        grid[2][1].tile = { id: 'r1', type: BuildingType.Residential, tier: 1, stars: 0 }; // Produces Pop
        // Wait, Res produces Population (Global).
        // Does Simulation derive Workforce from Pop?
        // In this new engine, Workforce is NOT explicit local resource in Design Doc?
        // "Residential T1... Produces: Population, Happiness"
        // "Factory T1... Base: Power, Workforce"
        // Where does Workforce come from? GLOBAL?
        // Design Doc: "Exceptions (global): Money... Blueprint unlock state... Turn counters".
        // Is Workforce global?
        // "Residential T1... Rating 2: Power >= 2 (local)".
        // If Workforce is local, Res must produce Workforce.

        // My code sets `nextCity.workforceAvailable = 0` and aggregates it.
        // But `trySatisfy` looks for LOCAL production.
        // Does Res produce `workforce`?
        // gameData: Res T1 produces { population: 1 }.
        // Factory T1 consumes { workforce: 1 }.
        // If Res produces Population but Fac consumes Workforce, there's a mismatch unless Population --> Workforce conversion happens.
        // In the old engine, `population` -> `workforce` conversion happened globally.
        // In LOCAL engine, if there is no global resource sharing, Factory cannot consume Workforce unless it is produced LOCALLY as "Workforce" resource.

        // ISSUE: Design Doc doesn't specify "Population -> Workforce" conversion.
        // "Residential... Produces: Population"
        // "Factory... Base Requirements: ... Workforce"
        // Assumption: Population converted to Workforce locally?
        // Or Res produces "Workforce" resource?
        // I should probably change Res to produce Workforce directly in gameData, or add a conversion step.
        // Or assumes "Population" IS "Workforce"?
        // Let's assume for this test that Res produces "workforce" or I patch gameData.
        // Actually, let's fix gameData to have Res produce Workforce alongside Population, OR assume Global Workforce.
        // But Design Doc says "Eliminate global resource pools".
        // So Res must produce Workforce LOCALLY.
    });
});
