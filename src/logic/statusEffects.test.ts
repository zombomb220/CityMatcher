import { describe, it, expect, vi } from 'vitest';
import { runSimulation } from './simulation';
import { createGrid } from './grid';

import { BuildingType } from '../types';

// Mock config BEFORE import
vi.mock('../config/buildingStats', () => import('../test/mockGameData'));

import { STARTING_CITY } from '../config/buildingStats';

describe('Status Effects Logic', () => {
    it('should trigger Brownout when Power Capacity < Demand', () => {
        const grid = createGrid();
        // Setup scenarios where we have deficit

        grid[0][0].tile = { id: 'f1', type: BuildingType.Factory, tier: 1, stars: 0 };
        grid[0][1].tile = { id: 'f2', type: BuildingType.Factory, tier: 1, stars: 0 };
        // Add Residential support for Factories (need Workforce)
        grid[0][2].tile = { id: 'r1', type: BuildingType.Residential, tier: 1, stars: 0 };
        grid[0][3].tile = { id: 'r2', type: BuildingType.Residential, tier: 1, stars: 0 };

        const city = { ...STARTING_CITY };
        const { city: newCity } = runSimulation(grid, city);

        // Factories should be disabled (No Power).
        // Demand (2) > Capacity (0).
        // Expect 'brownout' in activeStatusEffects.

        expect(newCity.activeStatusEffects).toContain('brownout');
    });

    it('should apply Production Penalty during Brownout', () => {
        const grid = createGrid();
        const city = {
            ...STARTING_CITY,
            money: 100,
            population: 10,
            activeStatusEffects: ['brownout'] // Force active
        };

        // Factory T1: Produces 1 RawGoods Normally.
        // Brownout Effect: 0.75x Multiplier.
        // Result: 0.75. Math.floor(0.75) = 0.
        // Let's use something that produces 4.
        // Factory T2 (Star 1) -> 4 RawGoods.
        // Brownout -> 3 RawGoods.
        // BUT due to High Power (28), Factory T2 upgrades to Star 2 (needs 4 Power).
        // Star 2 Prod: 6.
        // Brownout: 6 * 0.75 = 4.5 -> 4.

        grid[0][0].tile = { id: 'f', type: BuildingType.Factory, tier: 2, stars: 0 };
        // Valid inputs (Power/Workforce).
        // Provide Power: Power T3 (Produces 28). Plenty.

        grid[0][1].tile = { id: 'p', type: BuildingType.Power, tier: 3, stars: 0 };
        // Factory requires Workforce. Add Residential support.
        grid[0][2].tile = { id: 'r', type: BuildingType.Residential, tier: 3, stars: 0 };

        const { city: newCity } = runSimulation(grid, city);

        expect(newCity.rawGoodsAvailable).toBe(3);
        expect(newCity.activeStatusEffects).not.toContain('brownout');
    });
});
