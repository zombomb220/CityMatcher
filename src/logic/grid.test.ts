import { describe, it, expect } from 'vitest';
import { createGrid, resolveMerge } from './grid';
import { BuildingType } from '../types';


describe('Grid Logic', () => {
    it('should create a 7x7 grid', () => {
        const grid = createGrid();
        expect(grid.length).toBe(7);
        expect(grid[0].length).toBe(7);
    });

    describe('Merge Resolution', () => {
        it('should merge 3 identical tiles into 1 higher tier', () => {
            const grid = createGrid();
            // Place 3 tiles in a row: 0,0 0,1 0,2
            grid[0][0].tile = { id: '1', type: BuildingType.Residential, tier: 1, stars: 0 };
            grid[0][1].tile = { id: '2', type: BuildingType.Residential, tier: 1, stars: 0 };
            grid[0][2].tile = { id: '3', type: BuildingType.Residential, tier: 1, stars: 0 };

            // Resolve merge at 0,1 (Center)
            const merged = resolveMerge(grid, 0, 1);

            expect(merged).toBe(true);
            // Center should be Tier 2
            expect(grid[0][1].tile?.tier).toBe(2);
            expect(grid[0][1].tile?.type).toBe(BuildingType.Residential);
            // Neighbors should be consumed (null)
            expect(grid[0][0].tile).toBeNull();
            expect(grid[0][2].tile).toBeNull();
        });

        it('should NOT merge < 3 tiles', () => {
            const grid = createGrid();
            grid[0][0].tile = { id: '1', type: BuildingType.Residential, tier: 1, stars: 0 };
            grid[0][1].tile = { id: '2', type: BuildingType.Residential, tier: 1, stars: 0 };

            const merged = resolveMerge(grid, 0, 0);
            expect(merged).toBe(false);
            expect(grid[0][0].tile).not.toBeNull();
            expect(grid[0][1].tile).not.toBeNull();
        });

        it('should cascade merge', () => {
            // Setup: 
            // 3 Tier 1s make a Tier 2.
            // And we place near 2 existing Tier 2s.
            // So result should be Tier 3.

            const grid = createGrid();
            // Row 0: T1, T1, T1 -> Will merge to T2 at 0,1
            grid[0][0].tile = { id: '1', type: BuildingType.Residential, tier: 1, stars: 0 };
            grid[0][1].tile = { id: '2', type: BuildingType.Residential, tier: 1, stars: 0 };
            grid[0][2].tile = { id: '3', type: BuildingType.Residential, tier: 1, stars: 0 };

            // Row 1: T2, T2 (Below 0,1)
            grid[1][0].tile = { id: '4', type: BuildingType.Residential, tier: 2, stars: 0 };
            grid[1][1].tile = { id: '5', type: BuildingType.Residential, tier: 2, stars: 0 };
            // Wait, 0,1 is adjacent to 1,1.
            // So if 0,1 becomes T2. It is neighbor to 1,1.
            // And 1,1 needs a neighbor. 
            // We need 3 T2s total.
            // So: 0,1 (New T2) + 1,1 (T2) + 1,0? (1,0 is neighbor to 1,1 but not 0,1 directly?)
            // Neighbors of 0,1 are 0,0(gone), 0,2(gone), 1,1(S).
            // Neighbors of 1,1 are 0,1(N), 1,0(W), 1,2(E).
            // So if we have T2 at 1,1 and 1,0.
            // Are they connected to 0,1?
            // 0,1 connects to 1,1. 1,1 connects to 1,0.
            // So yes, cluster of 3 exists.

            const merged = resolveMerge(grid, 0, 1);

            expect(merged).toBe(true);

            // Cascaded?
            // 0,1 became T2. Found cluster with 1,1 and 1,0 (Total 3).
            // It should merge again to T3 at 0,1.
            expect(grid[0][1].tile?.tier).toBe(3);
            // Others consumed
            expect(grid[1][1].tile).toBeNull();
            expect(grid[1][0].tile).toBeNull();
        });
    });
});
