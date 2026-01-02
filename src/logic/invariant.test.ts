
import { describe, it, expect, vi } from 'vitest';
import { runSimulation } from './simulation';

import { BuildingType } from '../types';
import { STARTING_CITY } from '../config/buildingStats';

vi.mock('../config/buildingStats', () => import('../test/mockGameData'));

describe('Invariant Violations', () => {
    it.skip('Invariant 1 & 5: Should disable building if fixed maintenance is unaffordable', () => {
        // Setup: City with 0 money and a building with fixed maintenance cost
        const city = {
            ...STARTING_CITY,
            money: 0,
            population: 0,
            grid: [], // Will populate below
            blueprintState: {
                unlockedIds: [],
                newUnlocks: [],
                maxSlots: 99
            }
        };

        // Mock a Grid with a building that has fixed cost
        // We need to ensure we use a building type that HAS a fixed cost in gameData.
        // Assuming 'Power' has a fixed cost or 'Factory'.
        // Let's create a partial mock if possible, or rely on real data.
        // Real data is safer for reproduction.
        // In gameData, does Power have fixed cost?
        // We'll rely on the fact that if we set money to 0, ANY fixed cost should disable it.

        // Let's manually construct a grid item
        const tile = {
            id: 'test-1',
            type: BuildingType.Power, // Usually has upkeep
            tier: 1,
            x: 0,
            y: 0,
            disabled: false,
            stars: 1,
            upkeepPaid: true // Try to enable optional upkeep too
        };

        const grid = [[{ tile }]];

        const result = runSimulation(grid as any, city as any);

        // Expectation:
        // 1. Money should NOT be negative.
        // 2. Building should be disabled.
        expect(result.city.money).toBeGreaterThanOrEqual(0);
        expect(result.stats.buildingAlerts.some(a => a.type === 'disable')).toBe(true);
        // And specifically for maintenance if defined
    });
});
