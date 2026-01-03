import { z } from 'zod';
import { BuildingType, ResourceType } from '../types';

export const ResourceTypeSchema = z.nativeEnum(ResourceType);
export const BuildingTypeSchema = z.nativeEnum(BuildingType);

const ResourceAmountSchema = z.record(z.string(), z.number());

const BuildingStarStatsSchema = z.object({
    baseRequirements: ResourceAmountSchema.optional(),
    starRequirements: z.record(z.enum(["2", "3"]), ResourceAmountSchema).optional(),
    produces: z.record(z.enum(["1", "2", "3"]), ResourceAmountSchema),
    priority: z.number().default(10),
    mergeStarReset: z.boolean().default(true),
    fixedCost: ResourceAmountSchema.optional(),
});

const BuildingConfigSchema = z.record(
    BuildingTypeSchema,
    z.record(z.enum(["1", "2", "3"]), BuildingStarStatsSchema)
);

const BlueprintSchema = z.object({
    id: z.string(),
    buildingType: BuildingTypeSchema,
    tier: z.number(),
    name: z.string(),
    description: z.string(),
    slotCost: z.number(),
    buildCost: z.number(),
    unlockConditions: z.array(z.any()).optional(), // Keeping loose for now to match current complexity
});

// Status Effects
const TriggerSchema = z.object({
    type: z.enum(["resource", "stat", "building_count", "turn"]),
    target: z.string(),
    value: z.union([z.number(), z.string()]),
    comparison: z.enum([">", "<", ">=", "<=", "=="]),
    consecutiveTurns: z.number().optional()
});

const EffectActionSchema = z.object({
    type: z.enum(["productionMultiplier", "resourceDelta", "disableBuilding"]),
    target: z.string(),
    value: z.number().optional()
});

const StatusEffectSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    trigger: z.array(TriggerSchema),
    effects: z.array(EffectActionSchema),
    duration: z.string(), // "while_triggered"
    stacking: z.boolean()
});

export const GameConfigSchema = z.object({
    maxTier: z.number(),
    gridSize: z.number(),
    minServiceCoverage: z.number(),
    initialMoney: z.number(),
    populationParams: z.object({
        taxPerPop: z.number(),
        happinessDecayPerPop: z.number(),
        maintenancePerPop: z.number(),
        productConsumptionRate: z.number().default(1)
    }),
    productParams: z.object({
        decayRate: z.number(),
        spoilageThreshold: z.number()
    }),
    powerParams: z.object({
        idleCostPerUnit: z.number()
    }),
    blueprintSlotCosts: z.object({
        base: z.number(),
        multiplier: z.number()
    }),
    spawnWeights: z.record(BuildingTypeSchema, z.number()),
    buildingStats: BuildingConfigSchema,
    startingBlueprints: z.array(z.string()),
    blueprints: z.record(z.string(), BlueprintSchema),
    statusEffects: z.array(StatusEffectSchema)
});

export type GameConfig = z.infer<typeof GameConfigSchema>;
