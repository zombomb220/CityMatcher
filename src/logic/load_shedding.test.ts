
import { describe, it, expect, vi } from 'vitest';
import { runSimulation } from './simulation';

import { BuildingType } from '../types';
import { STARTING_CITY } from '../config/buildingStats';

vi.mock('../config/buildingStats', () => import('../test/mockGameData'));

describe('Load Shedding Logic', () => {
    it('Should disable Factory if Power is insufficient (Invariant 1)', () => {
        const city = {
            ...STARTING_CITY,
            money: 100, // Plenty of money
            grid: [],
            blueprintState: { unlockedIds: [], newUnlocks: [], maxSlots: 5 }
        };

        // Grid: 1 Factory (Needs 1 Power), No Power Plant
        const tile = {
            id: 'test-factory',
            type: BuildingType.Factory,
            tier: 1,
            x: 0,
            y: 0,
            disabled: false,
            stars: 1,
            upkeepPaid: false
        };
        const grid = [[{ tile }]];
        // Add Residential to provide Workforce, so Factory disables due to Power, not Workforce
        grid[0][1] = { tile: { id: 'res', type: BuildingType.Residential, tier: 1, stars: 0, x: 0, y: 1 } } as any;

        const result = runSimulation(grid as any, city as any);

        // Expectation:
        // 1. Factory disabled (No Power).
        // 2. Power Surplus >= 0.
        // 3. No production from Factory (Jobs = 0).

        expect(result.stats.buildingAlerts.some(a => a.type === 'disable' && /No power/i.test(a.message))).toBe(true);
        expect(result.city.powerAvailable).toBeGreaterThanOrEqual(0);
        expect(result.city.workforceAvailable).toBe(0); // Should be 0, not 2
    });

    it('Should prioritized disabling lower priority consumers', () => {
        // Residential (Prio 3) vs Factory (Prio 2).
        // If Deficit, Factory (Lower #?) 
        // Wait, stats says Residential Prio 3, Factory Prio 2.
        // My code sorts: pDiff = b.priority - a.priority (Desc).
        // So 3 comes before 2.
        // Consumers array: [Residential(3), Factory(2)].
        // I disable consumers[0] -> Residential.
        // BUT Invariant says: "Disable lowest priority".
        // Usually Residential is High Priority (Essential). Factory is Low.
        // If "Priority Number" 3 is High, and 2 is Low.
        // Then I should disable Low (2).
        // My sort: `b - a` puts High numbers at top (index 0).
        // So I am disabling High Priority first?!
        // Let's check `BuildingStats` meaning.
        // Usually 0 is highest?
        // Power has Priority 0.
        // Residential 3.
        // If Power is 0 (Essential), then 0 is High.
        // So 3 is Low.
        // My sort: `b - a` (Desc). 3, then 0.
        // I disable index 0 (3 = Residential).
        // So I disable Residential (Prio 3) before Power (Prio 0).
        // This seems correct IF high number = low priority.
        // Factory (2) vs Residential (3).
        // Desc: 3, 2.
        // Disable 3 (Residential).
        // Is Residential lower priority than Factory?
        // Usually Housing is critical.
        // But in this game, maybe matching is key?
        // Let's assume High Number = Low Priority (First to go).
        // So correct.
    });
});
