
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
            rawGoodsAvailable: 0
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
        // Add Power Plant T1 (Produces 3 Power, Costs 1 Money).

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

        const initialMoney = city.money;
        const { city: nextCity, stats } = runSimulation(grid, city);

        // Check Logic:
        // 1. Production: Power Plant -> +3 Power. Money -1 (Upkeep).
        // 2. Consumption: Warehouse uses 3 Power. Enabled.
        // 3. Storage: Excess 16 (40-24). Rate 0.5 -> +8 Money.
        // Net Money: Initial - 1 (Power) + 8 (Export) = Initial + 7.

        // Check Export Log
        const exportEntry = stats.breakdown.find(b => b.source.includes('Export'));
        expect(exportEntry).toBeDefined();
        expect(exportEntry?.amount).toBe(8);

        expect(nextCity.money).toBe(initialMoney - 1 + 8);
        expect(grid[0][0].tile!.storage![ResourceType.Products]).toBe(24);
    });
});
