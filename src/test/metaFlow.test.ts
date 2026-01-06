import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store/gameStore';
import { useMetaStore } from '../store/metaStore';
import { CITY_CONFIGS_DATA } from '../store/metaStore';


describe('Meta Layer Integration Flow', () => {

    beforeEach(() => {
        useGameStore.getState().resetGame();
        // Clear persisted meta store
        useMetaStore.setState({ cityProgress: {}, globalUnlocks: [] });
    });

    it('should start a city run with correct config', () => {
        const cityId = 'city_01_plains';

        // 1. Start Run
        useGameStore.getState().startCityRun(cityId);

        const state = useGameStore.getState();
        expect(state.activeCityId).toBe(cityId);
        // Check budget override from config
        expect(state.city.money).toBe(CITY_CONFIGS_DATA[cityId].baseBudget);
    });

    it('should track exports and unlock rewards upon completion', () => {
        const cityId = 'city_01_plains';
        useGameStore.getState().startCityRun(cityId);

        // 2. Simulate Gameplay (Gain Money & Resources)
        useGameStore.setState(state => ({
            city: {
                ...state.city,
                money: 2500, // Above 2000 threshold
                rawGoodsAvailable: 10,
                productsAvailable: 60,
                powerAvailable: 100
            }
        }));

        // 3. Finish Run
        useGameStore.getState().finishCityRun();

        // 4. Verify Game State
        expect(useGameStore.getState().gameState).toBe('completed');

        // 5. Verify Meta State Update
        const metaState = useMetaStore.getState();
        const progress = metaState.cityProgress[cityId];

        expect(progress).toBeDefined();
        expect(progress.runCount).toBe(1);
        expect(progress.bestExports.money).toBe(2500);

        // 6. Verify Unlocks
        // Threshold 1: Money >= 2000 -> budget_bonus
        expect(progress.unlockedThresholdIds).toContain('c1_money_1');
    });

    it('should accumulation best exports over multiple runs', () => {
        const cityId = 'city_01_plains';

        // Run 1: High Money
        useGameStore.getState().startCityRun(cityId);
        useGameStore.setState(state => ({
            city: { ...state.city, money: 3000 }
        }));
        useGameStore.getState().finishCityRun();

        let progress = useMetaStore.getState().cityProgress[cityId];
        expect(progress.bestExports.money).toBe(3000);
        expect(progress.unlockedThresholdIds).toContain('c1_money_1');

        // Run 2: Higher Money
        useGameStore.getState().startCityRun(cityId);
        useGameStore.setState(state => ({
            city: { ...state.city, money: 5000 }
        }));
        useGameStore.getState().finishCityRun();

        progress = useMetaStore.getState().cityProgress[cityId];
        // Best Money should update
        expect(progress.bestExports.money).toBe(5000);
    });
    it('Unlocks connected nodes upon completion', () => {
        const { updateCityProgress, isNodeUnlocked } = useMetaStore.getState();

        // 1. Verify Initial State
        // Alpha Prime (city_01_plains) should be unlocked by default.
        expect(isNodeUnlocked('city_01_plains')).toBe(true);
        expect(isNodeUnlocked('city_02_hills')).toBe(false);

        // 2. Complete Alpha Prime
        // Threshold for Alpha Prime is 2000 Money.
        const runExports = {
            money: 2500, // Meets threshold
            raw_goods: 0, products: 0, power: 0, happiness: 0, population: 0, turns: 100,
            completed: true
        };

        updateCityProgress('city_01_plains', runExports);

        // 3. Verify Beta Mining is now unlocked
        const freshState = useMetaStore.getState();
        expect(freshState.isNodeUnlocked('city_02_hills')).toBe(true);

        // 4. Verify Gamma Port is still locked (Beta not completed)
        expect(freshState.isNodeUnlocked('city_03_coast')).toBe(false);

        // 5. Complete Beta Mining
        // Threshold for Beta is 5000 Money (updated config).
        updateCityProgress('city_02_hills', { ...runExports, money: 5500 });

        // 6. Verify Gamma Port is now unlocked
        expect(useMetaStore.getState().isNodeUnlocked('city_03_coast')).toBe(true);
    });
});
