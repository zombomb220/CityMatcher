import type { Blueprint } from '../types';
import gameData from './gameData.json';

// Type assertion to ensure JSON matches Blueprint structure
// We have to cast it because JSON imports are often inferred as loosely typed
export const BLUEPRINTS: Record<string, Blueprint> = gameData.blueprints as unknown as Record<string, Blueprint>;

export const STARTING_BLUEPRINTS: string[] = gameData.startingBlueprints;
