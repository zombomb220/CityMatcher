
import { describe, it, expect, beforeEach } from 'vitest';
import { executePlaceBuilding, canExecutePlaceBuilding } from './actions';
import { createGrid } from './grid';
import { STARTING_CITY } from '../config/buildingStats';
import { BLUEPRINTS } from '../config/blueprints';
import type { CityState, Cell } from '../types';

describe('Workshop Placement Repro', () => {
    let city: CityState;
    let grid: Cell[][];

    beforeEach(() => {
        city = { ...STARTING_CITY, money: 100 }; // Plenty of money
        grid = createGrid();
    });

    it('should allow placing a Residential building', () => {
        const canPlace = canExecutePlaceBuilding(city, grid, 0, 0, 'residential_t1');
        expect(canPlace).toBe(true);

        const result = executePlaceBuilding(city, grid, [], 0, 0, 'residential_t1');
        expect(result.success).toBe(true);
        expect(result.newGrid![0][0].tile?.type).toBe('Residential');
    });

    it('should allow placing a Workshop (factory_t1)', () => {
        // Verify config exists
        console.log('Workshop Blueprint:', BLUEPRINTS['factory_t1']);
        expect(BLUEPRINTS['factory_t1']).toBeDefined();

        const canPlace = canExecutePlaceBuilding(city, grid, 0, 1, 'factory_t1');
        expect(canPlace).toBe(true);

        const result = executePlaceBuilding(city, grid, [], 0, 1, 'factory_t1');
        expect(result.success).toBe(true);
        expect(result.newGrid![0][1].tile?.type).toBe('Factory');
    });
});
