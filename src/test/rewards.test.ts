import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store/gameStore';
import { useMetaStore } from '../store/metaStore';
import { ResourceType, BuildingType } from '../types';
import { runSimulation } from '../logic/resolvers';
import { finalizeTurn } from '../logic/resolvers/penalties';
import { resolveStorage } from '../logic/resolvers/storage';

// Mock Configs for Deterministic Testing

describe('Meta Rewards Integration', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame();
        useMetaStore.setState({
            cityProgress: {},
            globalUnlocks: []
        });
    });

    it('should apply budget bonus on start', () => {
        const { updateCityProgress } = useMetaStore.getState();
        // Unlock c1_money_1 -> +500
        updateCityProgress('city_01_plains', { money: 2500, raw_goods: 0, products: 0, power: 0, happiness: 0, population: 0, turns: 0, completed: true });

        // Start Alpha Prime again
        useGameStore.getState().startCityRun('city_01_plains');
        expect(useGameStore.getState().city.money).toBe(1200 + 500);
    });

    it('should apply modifiers and affect simulation (via runSimulation)', () => {
        const city = useGameStore.getState().city;
        city.solarEfficiencyMultiplier = 1.5; // +50%
        city.popGrowthMultiplier = 2.0; // +100%

        // 1. Verify Solar Power
        const grid = useGameStore.getState().grid;
        grid[0][0].tile = {
            id: 'p1', type: BuildingType.Power, tier: 1, stars: 1,
            producedThisTurn: {}, storage: {}
        };

        const result = runSimulation(grid, city);
        expect(result.city.powerCapacity).toBe(13); // 9 * 1.5 = 13.5 -> 13

        // 2. Verify Pop Growth (Residential T1)
        grid[0][1].tile = {
            id: 'r1', type: BuildingType.Residential, tier: 1, stars: 1,
            producedThisTurn: {}, storage: {}
        };
        // Reset flows
        result.city.powerCapacity = 0;

        const result2 = runSimulation(grid, result.city);
        expect(result2.city.population).toBe(4); // 2 * 2.0 = 4
    });

    it('should apply upkeep reduction (tested via finalizeTurn)', () => {
        const city = { ...useGameStore.getState().city };
        city.population = 1000;
        city.money = 1000;
        city.upkeepMultiplier = 0.5; // -50% upkeep

        const buildingCounts = {};
        const netChanges = {};
        const breakdown: any[] = [];
        const buildingAlerts: any[] = [];

        const result = finalizeTurn(city, buildingCounts, netChanges, breakdown, buildingAlerts);

        // Base Cost: 1000 * 0.08 = 80.
        // With 0.5 mult: 40.
        const maint = result.stats.breakdown.find((b: any) => b.source === 'Maintenance');

        expect(maint).toBeDefined();
        if (!maint) throw new Error('Maintenance not found in breakdown');
        expect(maint.amount).toBe(-40);
        expect(result.city.money).toBe(1000 - 40 + 250); // Maint (40) + Tax (1000 * 0.25 = 250)
    });

    it('should apply export rate multiplier (tested via resolveStorage)', () => {
        const city = { ...useGameStore.getState().city };
        city.money = 0;
        city.exportRateMultiplier = 1.2; // +20% -> Rate 0.5 * 1.2 = 0.6

        const trackChange = (_res: string, _amt: number, _src: string) => {
            // Mock tracker - empty as resolveStorage updates city.money directly
        };

        // Mock Tiles: 1 Export Hub (Enabled), 1 Storage with Excess
        const tiles = [
            {
                r: 0, c: 0, tile: {
                    id: 'w3', type: BuildingType.Warehouse, tier: 3, stars: 1, disabled: false,
                    storage: {}, producedThisTurn: {}
                }
            },
            {
                r: 0, c: 1, tile: {
                    id: 's1', type: BuildingType.Warehouse, tier: 1, stars: 1, disabled: false,
                    storage: { [ResourceType.RawGoods]: 100 }, producedThisTurn: {}
                }
            }
        ];

        resolveStorage(city, tiles as any, trackChange);

        // Max Storage 24. Excess 76.
        // Export 76 * 0.6 = 45.6 -> 45.

        // verify storage clamped
        expect(tiles[1].tile.storage[ResourceType.RawGoods]).toBe(24);

        // verify money
        expect(city.money).toBe(45);
    });
});
