import { describe, it, expect, beforeEach } from 'vitest';
import { checkUnlockConditions, checkSlotUnlock } from './blueprintManager';
import { useGameStore } from '../store/gameStore';
import { BuildingType } from '../types';
import type { CityState } from '../types';

// Mock STARTING_CITY to avoid import issues or ensuring clean state
const MOCK_CITY: CityState = {
    powerCapacity: 0,
    jobsCapacity: 0,
    activeStatusEffects: [],
    money: 10,
    population: 0,
    happiness: 50,
    workforceAvailable: 0,
    rawGoodsAvailable: 0,
    productsAvailable: 0,
    powerAvailable: 0,
    unemployed: 0,
    turn: 1,
    stabilityDebt: 0,
    blueprintState: {
        unlockedIds: ['residential_t1', 'factory_t1', 'power_t1'],
        activeSlots: ['residential_t1', 'factory_t1', 'power_t1'],
        maxSlots: 5,
        hasPlacedThisTurn: false,
        newUnlocks: [],
    },
    history: [],
};

describe('Blueprint System Logic', () => {
    it('should unlock Shop T1 when Goods >= 3', () => {
        const state = { ...MOCK_CITY, rawGoodsAvailable: 3 };
        const buildingCounts = { [BuildingType.Residential]: 0, [BuildingType.Factory]: 0, [BuildingType.Shop]: 0, [BuildingType.Power]: 0, [BuildingType.Warehouse]: 0 };
        const newUnlocks = checkUnlockConditions(state, buildingCounts);
        expect(newUnlocks).toContain('shop_t1');
    });

    it('should NOT unlock Shop T1 when Goods < 3 and Pop < 6', () => {
        const state = { ...MOCK_CITY, rawGoodsAvailable: 2, population: 5 };
        const buildingCounts = { [BuildingType.Residential]: 0, [BuildingType.Factory]: 0, [BuildingType.Shop]: 0, [BuildingType.Power]: 0, [BuildingType.Warehouse]: 0 };
        const newUnlocks = checkUnlockConditions(state, buildingCounts);
        expect(newUnlocks).not.toContain('shop_t1');
    });

    it('should unlock Shop T1 when Pop >= 6', () => {
        const state = { ...MOCK_CITY, rawGoodsAvailable: 0, population: 6 };
        const buildingCounts = { [BuildingType.Residential]: 0, [BuildingType.Factory]: 0, [BuildingType.Shop]: 0, [BuildingType.Power]: 0, [BuildingType.Warehouse]: 0 };
        const newUnlocks = checkUnlockConditions(state, buildingCounts);
        expect(newUnlocks).toContain('shop_t1');
    });

    it('should not unlock if slots are full', () => {
        // Mock state where we have max slots used
        const fullState = {
            ...MOCK_CITY,
            blueprintState: {
                ...MOCK_CITY.blueprintState,
                unlockedIds: ['residential_t1', 'factory_t1', 'power_t1'],
                maxSlots: 3
            },
            rawGoodsAvailable: 10 // Should trigger unlock
        };
        const buildingCounts = { [BuildingType.Residential]: 0, [BuildingType.Factory]: 0, [BuildingType.Shop]: 0, [BuildingType.Power]: 0, [BuildingType.Warehouse]: 0 };
        const newUnlocks = checkUnlockConditions(fullState, buildingCounts);
        expect(newUnlocks).toEqual([]); // Empty because full
    });

    it('should check slot upgrade condition (2 Tier-2 unlocked)', () => {
        const state = {
            ...MOCK_CITY,
            blueprintState: {
                ...MOCK_CITY.blueprintState,
                unlockedIds: ['residential_t2', 'factory_t2'], // 2 Tier 2s
                maxSlots: 3
            }
        };
        expect(checkSlotUnlock(state)).toBe(true);
    });
});

describe('Store Integration', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame();
    });

    it('should enforce 1 building per turn', () => {
        const store = useGameStore.getState();
        store.selectBlueprint('residential_t1');

        // Place first building
        store.placeBuilding(0, 0);

        // Check state
        expect(useGameStore.getState().city.blueprintState.hasPlacedThisTurn).toBe(false); // Wait, runSimulation ADVANCES turn and resets flag?
        // In my implementation: "newCity.blueprintState.hasPlacedThisTurn = false;"
        // Wait, if it resets immediately, then I can place again?
        // Ah, logic flaw in thought process or implementation?
        // If turn goes from 1 -> 2, then hasPlacedThisTurn for Turn 1 was true? 
        // No, current implementation resets it to False for the NEW turn.
        // So I *can* place again immediately... because it's a new turn!
        // "Player places exactly ONE building per turn."
        // Usually in turn-based games, "End Turn" is manual or automatic.
        // Here, placing a building CONSUMES the turn and advances to next.
        // So "1 building per turn" is satisfied naturally by the turn increment.

        // So validation is: Verify turn count increased.
        expect(useGameStore.getState().city.turn).toBe(2);

        // And Verify I can place again (since it's turn 2)
        store.selectBlueprint('residential_t1');
        store.placeBuilding(0, 1);
        expect(useGameStore.getState().city.turn).toBe(3);
    });

    it('should not place if no blueprint selected', () => {
        const store = useGameStore.getState();
        store.selectBlueprint(null as any); // Deselect
        store.placeBuilding(0, 0);
        expect(useGameStore.getState().city.turn).toBe(1); // No change
    });
});
