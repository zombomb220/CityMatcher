import type { BuildingConfig, CityState, StatusEffect } from '../types';
import gameData from './gameData.json';

export const MAX_TIER = gameData.maxTier;
export const GRID_SIZE = gameData.gridSize;
export const MIN_SERVICE_COVERAGE = gameData.minServiceCoverage;
export const INITIAL_MONEY = gameData.initialMoney;
// UNEMPLOYED_PENALTY removed as it's now handled by Status Effects
export const STATUS_EFFECTS = (gameData.statusEffects || []) as unknown as StatusEffect[];

export const SPAWN_WEIGHTS = gameData.spawnWeights;

export const STARTING_CITY: CityState = {
    money: 30,
    population: 0,
    happiness: 50,
    workforceAvailable: 0,
    rawGoodsAvailable: 0,
    productsAvailable: 0,
    powerAvailable: 0,
    unemployed: 0,
    turn: 1,
    serviceCoverage: 100,
    powerCapacity: 0,
    jobsCapacity: 0,
    stabilityDebt: 0,
    activeStatusEffects: [],
    history: [],
    blueprintState: {
        unlockedIds: [
            "residential_t1",
            "factory_t1",
            "power_t1",
            "shop_t1",
            "residential_t2",
            "power_t2"
        ],
        activeSlots: [
            "residential_t1",
            "factory_t1",
            "power_t1"
        ],
        maxSlots: 6,
        hasPlacedThisTurn: false,
        newUnlocks: [
            "shop_t1",
            "residential_t2",
            "power_t2"
        ]
    }
};

export const BUILDING_STATS: BuildingConfig = gameData.buildingStats as unknown as BuildingConfig;

export const POPULATION_PARAMS = gameData.populationParams;
export const PRODUCT_PARAMS = gameData.productParams;
export const POWER_PARAMS = gameData.powerParams;
export const BLUEPRINT_SLOT_COSTS = gameData.blueprintSlotCosts;