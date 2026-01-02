import { describe, it, expect, vi } from 'vitest';
import { runSimulation } from './simulation';
import { createGrid } from './grid';
import { BuildingType } from '../types';
import { STARTING_CITY } from '../config/buildingStats';

vi.mock('../config/buildingStats', () => import('../test/mockGameData'));

describe('Simulation Logic', () => {
    it('should execute the Production Pipeline (Res -> Factory -> Shop)', () => {
        const grid = createGrid();
        // Setup: 
        // Power T1 (Wind) -> Req: None (autonomous) or Money. 
        // Res T1 -> Prod: Pop 2.
        // Factory T1 -> Req: Workforce 1, Power 1. Prod: RawGoods 2.
        // Shop T1 -> Req: Workforce 1, RawGoods 1. Prod: Products 2.

        // Initial State: 
        // Money 50 (plenty).
        // Workforce 0 (will come from Res).
        // RawGoods 0.

        const city = {
            ...STARTING_CITY,
            money: 50,
            population: 0,
            workforceAvailable: 0,
            rawGoodsAvailable: 0,
            productsAvailable: 0,
            powerAvailable: 0,
            happiness: 100 // Ensure growth happens
        };

        grid[0][0].tile = { id: 'p', type: BuildingType.Power, tier: 1, stars: 0 };
        grid[0][1].tile = { id: 'r1', type: BuildingType.Residential, tier: 1, stars: 0 };
        grid[0][2].tile = { id: 'r2', type: BuildingType.Residential, tier: 1, stars: 0 }; // Needed for 2 workers
        grid[1][0].tile = { id: 'f', type: BuildingType.Factory, tier: 1, stars: 0 };
        grid[1][1].tile = { id: 's', type: BuildingType.Shop, tier: 1, stars: 0 };

        const { city: newCity } = runSimulation(grid, city);

        // Analysis:
        // 1. Base Flows:
        //    Power T1 -> +3 Power.
        //    Res T1 x2 -> +2 Workforce Capacity (Star 1). 
        //    Star Allocation upgrades r1 to Star 2 (Pop 2). Total Pop 3.
        // 2. Load Shedding Check:
        //    Demand:
        //      Factory: 1 Workforce.
        //      Shop: 1 Workforce.
        //    Supply: 2 (Capacity).
        //    Result: All Enabled. Supply 2 - Demand 2 = 0 Unemployed.

        expect(grid[0][0].tile?.disabled).toBe(false);
        expect(grid[0][1].tile?.disabled).toBe(false);
        expect(grid[0][2].tile?.disabled).toBe(false);
        expect(grid[1][0].tile?.disabled).toBe(false);
        expect(grid[1][1].tile?.disabled).toBe(false);

        // Production Results:
        // Shop produces 2 Products.
        // Population (3) consumes 3 Products. (Limited by AvailProduct=2?)
        // Factory produces 1 Raw Good. Shop consumes 1. Result 0.
        expect(newCity.productsAvailable).toBe(0);

        // Stock:
        expect(newCity.rawGoodsAvailable).toBe(0);

        // Employment:
        // Workforce 2. Demand 2. Unemployed 0.
        expect(newCity.unemployed).toBe(0);
    });

    it('should disable buildings during Workforce Shortage', () => {
        const grid = createGrid();
        // Ensure Population starts at 0 so Res T1 determines total supply (2)
        const city = { ...STARTING_CITY, money: 50, population: 0, workforceAvailable: 0 };

        // 3 Factories. Each needs 1 Workforce.
        // 1 Residential. Provides 2 Workforce.
        // Total Demand: 3. Total Supply: 2.
        grid[0][0].tile = { id: 'r', type: BuildingType.Residential, tier: 1, stars: 0 };
        grid[0][1].tile = { id: 'p1', type: BuildingType.Power, tier: 1, stars: 0 }; // Needed for Factories (Produces 3)
        grid[0][2].tile = { id: 'p2', type: BuildingType.Power, tier: 1, stars: 0 }; // Need 6 Power Total (3+3=6)

        grid[1][0].tile = { id: 'f1', type: BuildingType.Factory, tier: 2, stars: 0 };
        grid[1][1].tile = { id: 'f2', type: BuildingType.Factory, tier: 2, stars: 0 };
        grid[1][2].tile = { id: 'f3', type: BuildingType.Factory, tier: 2, stars: 0 };

        const { city: newCity } = runSimulation(grid, city);

        // Res T1 (Star 1) -> Pop 1.
        // Factory T2 (Star 1) -> Req 1 Work.
        // Total Supply 1. Total Demand 3.
        // Support 1 Factory. 2 Disabled.
        const factories = [grid[1][0].tile, grid[1][1].tile, grid[1][2].tile];
        const enabledCount = factories.filter(f => !f?.disabled).length;

        expect(enabledCount).toBe(1);

        expect(newCity.workforceAvailable).toBeGreaterThanOrEqual(0);
    });

    it('should maintain stable population across consecutive turns (Regression Test)', () => {
        const grid = createGrid();
        // Setup: 1 Residential Building.
        // Turn 1: Should produce 1 Pop.
        // Turn 2: Should still have 1 Pop (not 2).

        const city = { ...STARTING_CITY, money: 100, population: 0 };
        grid[0][0].tile = { id: 'r', type: BuildingType.Residential, tier: 1, stars: 0 };

        // Turn 1
        const { city: t1 } = runSimulation(grid, city);
        expect(t1.population).toBe(1);

        // Turn 2 (Feed t1 result back in)
        const { city: t2 } = runSimulation(grid, t1);

        // Regression Check: If double counting existed, this would be 2.
        expect(t2.population).toBe(1);
    });
});
