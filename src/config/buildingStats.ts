import type { CityState, StatusEffect } from '../types';
import gameData from './gameData.json';
import { GameConfigSchema } from './schema';

// Validate Configuration at Startup
const parsedConfig = GameConfigSchema.parse(gameData);

export const MAX_TIER = parsedConfig.maxTier;
export const GRID_SIZE = parsedConfig.gridSize;
export const MIN_SERVICE_COVERAGE = parsedConfig.minServiceCoverage;
export const INITIAL_MONEY = parsedConfig.initialMoney;

export const STATUS_EFFECTS = (parsedConfig.statusEffects || []) as unknown as StatusEffect[];

export const SPAWN_WEIGHTS = parsedConfig.spawnWeights;

export const STARTING_CITY: CityState = {
    money: INITIAL_MONEY,
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
        unlockedIds: [...parsedConfig.startingBlueprints],
        activeSlots: [...parsedConfig.startingBlueprints], // Start with all starting blueprints in slots
        maxSlots: 6,
        hasPlacedThisTurn: false,
        newUnlocks: []
    }
};

// Exporting validated stats
export const BUILDING_STATS = parsedConfig.buildingStats;

export const POPULATION_PARAMS = parsedConfig.populationParams;
export const PRODUCT_PARAMS = parsedConfig.productParams;
export const POWER_PARAMS = parsedConfig.powerParams;
export const BLUEPRINT_SLOT_COSTS = parsedConfig.blueprintSlotCosts;