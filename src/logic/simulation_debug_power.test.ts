
import { describe, it, expect, vi } from 'vitest';
import { runSimulation } from './simulation';
import { BuildingType } from '../types';
import { STARTING_CITY } from '../config/buildingStats';
import { createGrid } from './grid';

vi.mock('../config/buildingStats', () => import('../test/mockGameData'));

describe('Simulation Power Debug', () => {
    it('should generate power from a T1 Power Plant', () => {
        const grid = createGrid();
        const city = { ...STARTING_CITY, money: 100 };

        // Place Power T1 (Wind Turbine). Produces 3 Power.
        grid[0][0].tile = { id: 'p1', type: BuildingType.Power, tier: 1, stars: 0 };

        const { stats, city: newCity } = runSimulation(grid, city);

        // Check Capacity (Step 1)
        expect(newCity.powerCapacity).toBe(3);

        // Check Available (Step 3)
        // Nothing consumes it.
        expect(newCity.powerAvailable).toBe(3);

        // Check stats
        expect(stats.powerProduced).toBe(3);
    });
});
