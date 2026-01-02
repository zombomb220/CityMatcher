
import { describe, it, expect, vi } from 'vitest';
import { runSimulation } from './simulation';
import { createGrid } from './grid';
import { BuildingType, ResourceType } from '../types';
import { STARTING_CITY } from '../config/buildingStats';

vi.mock('../config/buildingStats', () => import('../test/mockGameData'));

describe('Simulation Product Consumption Tracking', () => {
    it('should track product consumption in netChanges breakdown', () => {
        const grid = createGrid();
        // Setup:
        // 2 Shops T1 (Star 1) -> Produce 4 Products. Req 2 RawGoods.
        // 2 Res T1 (Star 1) -> Produce 2 Pop.

        // Inject resources for Shops to run
        const city = {
            ...STARTING_CITY,
            money: 100,
            population: 0,
            workforceAvailable: 0,
            rawGoodsAvailable: 10, // Plenty of stock
            powerAvailable: 0,
        };

        grid[0][0].tile = { id: 's1', type: BuildingType.Shop, tier: 1, stars: 0 };
        grid[0][1].tile = { id: 's2', type: BuildingType.Shop, tier: 1, stars: 0 };
        grid[1][0].tile = { id: 'r1', type: BuildingType.Residential, tier: 1, stars: 0 };
        grid[1][1].tile = { id: 'r2', type: BuildingType.Residential, tier: 1, stars: 0 };

        const { stats, city: newCity } = runSimulation(grid, city);

        // Expectation:
        // Production: 4 Products.
        // Consumption: 2 Pop * 1 = 2 Products.
        // Final Products: 2.
        expect(newCity.productsAvailable).toBe(2);

        // Breakdown check
        const consumption = stats.breakdown.find(b => b.resource === ResourceType.Products && b.amount < 0);

        expect(consumption).toBeDefined();
        expect(consumption?.amount).toBe(-2);

        // Net Change = 4 - 2 = 2
        // If consumption wasn't tracked, this would be 4.
        expect(stats.netChanges[ResourceType.Products]).toBe(2);
    });
});
