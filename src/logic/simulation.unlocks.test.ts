import { describe, it, expect, beforeEach } from 'vitest';
import { checkUnlockConditions } from './blueprintManager';
import { BuildingType } from '../types';
import type { CityState } from '../types';
import { STARTING_CITY } from '../config/buildingStats';

describe('Progression & Economy Loop', () => {
    let city: CityState;
    const mockCounts = {
        [BuildingType.Residential]: 0,
        [BuildingType.Factory]: 0,
        [BuildingType.Shop]: 0,
        [BuildingType.Power]: 0,
        [BuildingType.Warehouse]: 0,
    };

    beforeEach(() => {
        city = { ...STARTING_CITY };
        // Reset unlocks
        city.blueprintState = {
            ...city.blueprintState,
            unlockedIds: ['residential_t1', 'factory_t1', 'power_t1']
        };
    });

    it('should unlock Tier 2 buildings when conditions are met', () => {
        // Goal: Unlock Factory T2 (Req: Raw Goods >= 10, Workforce >= 5)

        city.population = 8;
        city.workforceAvailable = 6; // Meets WF req
        city.rawGoodsAvailable = 12; // Meets RG req

        const newUnlocks = checkUnlockConditions(city, mockCounts);

        expect(newUnlocks).toContain('factory_t2');
    });

    it('should NOT unlock Tier 2 if Power/Stability is low', () => {
        // Goal: Unlock Res T2 (Req: Unemployed==0 check REMOVED, now Power >= 5)

        city.population = 10;
        city.powerAvailable = 2; // Too low

        const newUnlocks = checkUnlockConditions(city, mockCounts);

        expect(newUnlocks).not.toContain('residential_t2');
    });
});
