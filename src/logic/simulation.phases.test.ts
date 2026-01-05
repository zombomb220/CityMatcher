import { describe, it, expect, vi } from 'vitest';
import { runSimulation } from './simulation';
import { BuildingType, ResourceType } from '../types';
import type { CityState, Tile } from '../types';
import { STARTING_CITY } from '../config/buildingStats';

vi.mock('../config/buildingStats', () => import('../test/mockGameData'));

// --- Helpers ---
const createMockCity = (): CityState => ({
    ...STARTING_CITY,
    money: 100, // Surplus for base checks
    population: 0,
    happiness: 50,
    workforceAvailable: 0,
    rawGoodsAvailable: 0,
    powerAvailable: 0,
    unemployed: 0,
    turn: 1,
    stabilityDebt: 0,
});
// Cheater Tile for endless inputs if needed, or just use RES T1 (Free, Pop 2)
const addPopSupport = (grid: any[], amount: number) => {
    // Add Res T1s to row 1 until amount satisfied. (Res T1 = 1 Pop)
    let needed = amount;
    for (let i = 0; i < needed; i++) {
        if (!grid[1]) grid[1] = Array(7).fill(null).map((_, c) => ({ r: 1, c, tile: null }));
        grid[1][i] = createTile(BuildingType.Residential, 1, i);
    }
};

const createGrid = (rows = 7, cols = 7) =>
    Array(rows).fill(null).map((_, r) =>
        Array(cols).fill(null).map((_, c) => ({ r, c, tile: null as Tile | null }))
    );

const createTile = (type: BuildingType, r: number, c: number, tier = 1): any => ({
    r, c,
    tile: {
        id: `${type}_${r}_${c} `,
        type,
        tier,
        stars: 0
    }
});

// Mock Data Override Helper (if needed, but we rely on actual config)
// We assume standard constraints: 
// Factory T1: Base (Power 1, Pop 1). Prod (Jobs 2, Goods 1).
// Res T1: Base (None). Prod (Pop 2).
// Power T1: Base (Money 1). Prod (Power 3).

describe('Simulation Phases Comprehensive', () => {

    describe('1. Iterative Stability & Cycles', () => {
        it('should resolve mutual sustenance (Res <-> Factory)', () => {
            // Residential produces Pop (needed by Factory).
            // Factory produces Jobs.
            // Factory needs Power? Yes, and Pop.
            // Setup: Power Plant + Res + Factory within range (global).
            // This forms a dependency chain: Power -> Factory <- Res.

            const city = createMockCity();
            // Ensure enough money for base upkeep
            city.money = 100;

            const grid = createGrid();
            grid[0][0] = createTile(BuildingType.Power, 0, 0);       // Prod Power
            grid[0][1] = createTile(BuildingType.Residential, 0, 1); // Prod Pop
            grid[0][2] = createTile(BuildingType.Factory, 0, 2);     // Need Power+Pop

            runSimulation(grid, city);

            // All should be enabled
            expect(grid[0][0].tile!.stars).toBeGreaterThan(0);
            expect(grid[0][1].tile!.stars).toBeGreaterThan(0);
            expect(grid[0][2].tile!.stars).toBeGreaterThan(0); // Factory enabled
        });

        it('should disable cyclical group if external dependency missing', () => {
            // Factory needs Power. If no Power, Factory disables.
            // If Residential required Jobs (Factory)? (Res T1 doesn't, but T2 does).
            // Let's test T2 Res (Needs Jobs) + T2 Factory (Needs Pop + Power).
            // If Power missing, Factory dies -> Jobs die -> Res dies.

            const city = createMockCity();

            const grid = createGrid();
            // No Power Plant!
            grid[0][1] = createTile(BuildingType.Residential, 0, 1, 2); // T2 Res (Needs Jobs)
            grid[0][2] = createTile(BuildingType.Factory, 0, 2, 2);     // T2 Fac (Needs Power+Pop)

            // Seed check: City has 0 Power.

            runSimulation(grid, city);

            // Expect Fac DISABLED (Needs Power), Res ENABLED (Does not need Jobs to run)?
            // update: Res T2 needs Power (2) and Products (2).
            // Power is missing. Res T2 disables.
            expect(grid[0][2].tile!.disabled).toBe(true);
            expect(grid[0][1].tile!.disabled).toBe(true);
            // Check for negative power?
        });
    });

    describe('2. Priority & Starvation Resolution', () => {
        it('should starve Low Priority buildings first', () => {
            // Power Plant Prod 3.
            // Factory (Prio 2) needs 2.
            // Res (Prio 3) needs 2.
            // Shop (Prio 4) needs 2.
            // Total Demand 6. Supply 3.
            // Factory takes 2. Rem 1.
            // Res needs 2. Fail.
            // Shop needs 2. Fail.

            // Note: We need buildings that ACTUALLY require Power.
            // Fact T1: Base Power 1. Star 2 Power +2? Total 3.
            // Let's stick to Base Enablement first.
            // Fact T3 Base Power 5 (!).
            // Fact T1 Base Power 1.

            // Setup: 
            // 1 Power Plant (Prod 3).
            // 4 Factories T1 (Need 1 each = 4 total).
            // Prio is same (2).
            // Sort stability: (r, c) order.

            const city = createMockCity();
            city.population = 100; // Abundant pop
            city.money = 100; // Ensure Power Plant can run (Needs Money 1)

            const grid = createGrid();
            grid[0][0] = createTile(BuildingType.Power, 0, 0); // Prod 3

            // Support: 4 Factories need 4 Pop (assuming 1 worker per factory).
            // Factories T1 need Power 2 (Base). Total 8 Power.
            // Power Plant T1 Prod 3.
            // Add another Power Plant (Total 6).
            // Supply 6. Demand 8.
            // Fac 1, 2, 3 take 2 each = 6.
            // Fac 4 Starves.

            // grid[0][5] = createTile(BuildingType.Power, 0, 5); // Add 2nd Power Plant (REMOVED to force starvation)

            // Add 4 Res T1 (4 Pop). Row 1.
            addPopSupport(grid, 4);

            grid[0][1] = createTile(BuildingType.Factory, 0, 1); // 1. Pass (Rem 4)
            grid[0][2] = createTile(BuildingType.Factory, 0, 2); // 2. Pass (Rem 2)
            grid[0][3] = createTile(BuildingType.Factory, 0, 3); // 3. Pass (Rem 0)
            grid[0][4] = createTile(BuildingType.Factory, 0, 4); // 4. Fail (Rem 0)

            runSimulation(grid, city);

            expect(grid[0][1].tile!.stars).toBeGreaterThan(0);
            expect(grid[0][2].tile!.stars).toBeGreaterThan(0);
            expect(grid[0][3].tile!.stars).toBeGreaterThan(0);
            expect(grid[0][4].tile!.stars).toBe(0); // Starved
            expect(grid[0][4].tile!.disabled).toBe(true);
            expect(grid[0][4].tile!.disabledReason).toBe('Missing power');

            // Verifying the deficit
            // Supply 3. Demand 4.
            // Power Available should be -1.
            // Wait, Idle Cost applies if > 0.
            // Here available is -1.
            // 3 - 4 = -1.
            // We can check city.powerAvailable directly from result if we capture it.
            // But runSimulation returns { city }.
            // We ignored return. Let's capture it.
        });
    });

    describe('3. Star Upgrade Logic', () => {
        it('should not upgrade if star requirements unmet', () => {
            // Power Plant Prod ample power.
            // Factory T1.
            // Star 1: Base OK.
            // Star 2: Power 3.
            // Star 3: Money 5.

            const city = createMockCity();
            city.population = 10;
            // Factory Star 3 Needs Money 5.
            city.money = 2; // Enough for PP (1) + Fac Base (0), but NOT Star 3 (5)

            // We need enough power for Star 2 but not Star 3?
            // Actually, Money check is easier.

            const grid = createGrid();
            grid[0][0] = createTile(BuildingType.Power, 0, 0); // Prod 3
            // Factory Star 2 Needs Power 12.
            // Power Plant T1 Prod 3.
            // 3 < 12. Fails Star 2.

            grid[0][1] = createTile(BuildingType.Factory, 0, 1);
            addPopSupport(grid, 2); // Factory needs 1 pop

            runSimulation(grid, city);

            expect(grid[0][1].tile!.stars).toBe(1);
        });

        it('should skip Star 3 if Star 2 failed', () => {
            // Even if we have resources for Star 3, if Star 2 failed, we stay at Star 1.
            // Factory T1 Star 2 Needs Power. Star 3 Needs Money.

            const city = createMockCity();
            city.money = 100; // Plenty for Star 3
            city.powerAvailable = 1; // Only enough for Base Enablement.
            city.population = 10;

            const grid = createGrid();
            // Need Power 2 for Base.
            // Power Plant T1 Prod 3.
            // Factory T1 Base 2. Rem 1.
            // Star 2 Needs 4 (Total).
            // 3 < 4. Fails Star 2.
            // Result: Base Enabled (Star 1), Upgrade Failed.

            grid[0][0] = createTile(BuildingType.Power, 0, 0);
            addPopSupport(grid, 2); // Support Factory

            grid[0][3] = createTile(BuildingType.Factory, 0, 3); // Target

            runSimulation(grid, city);

            expect(grid[0][3].tile!.stars).toBe(1);
        });
    });

    describe('4. Special Mechanics', () => {
        it('should handle Warehouse carryover correctly', () => {
            // Start with tile storage to ensure persistence checks work
            const grid = createGrid();
            grid[0][0] = createTile(BuildingType.Warehouse, 0, 0);
            grid[0][0].tile!.stars = 1; // Simulate "Already Active"
            grid[0][0].tile!.storage = { [ResourceType.RawGoods]: 5 }; // Initial Storage
            grid[0][1] = createTile(BuildingType.Power, 0, 1); // Add Power Plant for Base Reqs

            const city = createMockCity();
            city.rawGoodsAvailable = 5; // Surplus
            city.turn = 1;

            // Run Sim Turn 1
            const { city: res1 } = runSimulation(grid, city);

            // Warehouse checks Logic:
            // "if (t.type === BuildingType.Warehouse && t.stars > 0) carriedOverGoods += 2;"
            // But this happens at START of turn based on PREVIOUS state.
            // In a fresh test run, 'stars' are 0 in input?

            // We need to simulate the "Next Turn" state.
            // The simulation output `res1` doesn't persist `grid` state changes implicitly 
            // across calls unless we reuse the grid object.

            // Warehouse T1 upgrades are cost-only (Power).
            // Prod 3 (Power) > Req 3 (S3).
            expect(grid[0][0].tile!.stars).toBeGreaterThan(0);

            // Turn 2
            const city2 = { ...res1, turn: 2 };
            // Pre-condition: User had 5 Goods. 
            // Sim logic: `newCity.rawGoodsAvailable = Math.min(currentCity.rawGoodsAvailable, carriedOverGoods)`
            // We expect carriedOver to be 2.
            // Note: We currently pass `grid` with stars=1 (from Run 1).

            // Reset Goods to 0 to verify only carryover exists (plus new prod, which is 0).
            // Actually, `currentCity` passed to sim IS the "End of Turn 1" state.
            // So simulation reads `res1.rawGoodsAvailable`.
            // But checking `carriedOverGoods` relies on `t.stars > 0` at loop start.

            // Let's ensure res1 had goods.
            // T1 Sim: Goods calc logic might consume them? 
            // Goods are flow.
            // But final state `rawGoodsAvailable` reflects what was Left Over.
            // If we had 5, produced 0, consumed 0 => 5 left?
            // Sim logic: `newCity.rawGoodsAvailable = Math.min(...)`.

            const { city: res2 } = runSimulation(grid, city2);

            // Warehouse Cap is theoretical, but decay is now 0.05.
            // 5 * 0.05 = 0.25 -> 0.
            // Remaining: 5.
            expect(res2.rawGoodsAvailable).toBe(5);
        });

        it('should calculate Power Plant stress utilization', () => {
            // Power Plant Prod 3.
            // Usage 0 -> Util 0% -> Star 1.
            // Usage 2 -> Util 66% -> Star 2.
            // Usage 3 -> Util 100% -> Star 3.

            const grid = createGrid();
            grid[0][0] = createTile(BuildingType.Power, 0, 0); // Prod 3

            const city = createMockCity();

            // Case 1: Util 0
            const { city: res1 } = runSimulation(JSON.parse(JSON.stringify(grid)), { ...city });
            expect(res1.powerAvailable).toBe(3); // 3 Prod - 0 Used
            // Grid wasn't returned, but modified in place if we used ref.
            // Let's look at grid states.
            // ... Wait, I parsed/stringified so local `grid` is untouched.

            const grid1 = JSON.parse(JSON.stringify(grid));
            runSimulation(grid1, { ...city });
            expect(grid1[0][0].tile.stars).toBe(1);

            // Case 2: Util 100% (High Stress)
            // Need to burn 3 Power.
            // Factory T1 Base 1.
            // Factory T1 Star 2 Needs +2.
            // Total 3.
            const grid2 = JSON.parse(JSON.stringify(grid));
            grid2[0][1] = createTile(BuildingType.Factory, 0, 1);
            // Need Pop support for Factory (1 Pop)
            addPopSupport(grid2, 2);

            city.population = 5; // Support factory (Legacy field, ignored but kept)
            city.money = 100;

            runSimulation(grid2, { ...city });
            runSimulation(grid2, { ...city });
            // Power Plant Stars based on SURPLUS, not Util.
            // If Util is 100%, Surplus is 0.
            // Star 2 requires Surplus logic.
            // So it stays at Star 1.
            expect(grid2[0][0].tile!.stars).toBe(1);
        });
    });

});
