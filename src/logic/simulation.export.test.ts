
import { describe, it, expect, beforeEach } from 'vitest';
import { runSimulation } from './simulation';
import { createGrid } from './grid';
import { BuildingType, ResourceType } from '../types';
import type { CityState, Cell } from '../types';
import { STARTING_CITY } from '../config/buildingStats';
import { v4 as uuidv4 } from 'uuid';

describe('Export Economy Validation', () => {
    let city: CityState;
    let grid: Cell[][];

    beforeEach(() => {
        city = {
            ...STARTING_CITY,
            money: 100,
            productsAvailable: 0,
            rawGoodsAvailable: 0,
            workforceAvailable: 10, // Ensure workforce for Warehouse T3
        };
        grid = createGrid();
    });

    it('should overflow and WASTE goods without Export Hub (Warehouse T2)', () => {
        // Setup: Warehouse T2 (No Export capability)
        // High storage (above 24).
        // Expect: Storage capped at 24. Money UNCHANGED.

        grid[0][0].tile = {
            id: uuidv4(),
            type: BuildingType.Warehouse,
            tier: 2,
            stars: 1,
            storage: {
                [ResourceType.Products]: 40
            }
        };

        const initialMoney = city.money;
        const { city: nextCity } = runSimulation(grid, city);

        // Check Storage Cap
        expect(grid[0][0].tile!.storage![ResourceType.Products]).toBe(24);

        // Check Money (Should be SAME as initial, no export income)
        expect(nextCity.money).toBe(initialMoney);
    });

    it('should EXPORT excess goods with Export Hub (Warehouse T3)', () => {
        // Setup: Warehouse T3 (Export Hub).
        // High storage (above 24).
        // REQUIREMENT: Must have POWER to function.
        // REQUIREMENT: Must have WORKFORCE to function (Warehouse T3 needs 3 Workforce).
        // Add Power Plant T1 (Produces 9 Power, Costs 1 Money).
        // Add Residential T1 x2 (Produces 4 Pop -> 4 Workforce). Costs 0. Tax +1.

        grid[0][0].tile = {
            id: uuidv4(),
            type: BuildingType.Warehouse,
            tier: 3,
            stars: 1,
            storage: {
                [ResourceType.Products]: 40
            }
        };

        grid[0][1].tile = {
            id: uuidv4(),
            type: BuildingType.Power,
            tier: 1,
            stars: 1
        };

        // Residential 1 (Placed far away to prevent consuming products)
        grid[6][6].tile = {
            id: uuidv4(),
            type: BuildingType.Residential,
            tier: 1,
            stars: 1
        };

        // Residential 2
        grid[6][5].tile = {
            id: uuidv4(),
            type: BuildingType.Residential,
            tier: 1,
            stars: 1
        };

        const initialMoney = city.money;
        const { city: nextCity, stats } = runSimulation(grid, city);

        // Check Logic:
        // 1. Production: 
        //    Power Plant (Star 1) -> +9 Power. 
        //    Residential -> +4 Pop.
        // 2. Consumption: 
        //    Power Plant upgrades to Star 3 (Money 100 > 20). 
        //    Cost: 20 Money.
        //    Warehouse uses 6 Power (Star 2). (Available 9 - 2 Res = 7 > 6).
        //    Residential uses 1 Power each (2 total).
        //    Total Power Used: 8. Available 9.
        // 3. Storage: Excess 16. Rate 0.5 -> +8 Money.
        // 4. Penalties:
        //    Tax: +1.
        //    Maintenance: 0.
        // Net Money: Initial - 20 (Power Upgrade) + 1 (Tax) + 8 (Export) = Initial - 11.
        // 100 - 11 = 89.

        // Check Export Log
        const exportEntry = stats.breakdown.find(b => b.source.includes('Export'));
        expect(exportEntry).toBeDefined();
        expect(exportEntry?.amount).toBe(8);

        expect(nextCity.money).toBe(initialMoney - 20 + 1 + 8);
        expect(grid[0][0].tile!.storage![ResourceType.Products]).toBe(24);
    });
});
