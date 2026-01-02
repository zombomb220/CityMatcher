import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import type { GameData, CityState, Cell } from '../types';
import { BuildingType } from '../types';
import GAME_DATA_JSON from '../config/gameData.json';
import { createGrid, resolveMerge } from '../logic/grid';
import { runSimulation } from '../logic/simulation';

import { STARTING_CITY } from '../config/buildingStats';

// Type assertion for the imported JSON to match our interface
const INITIAL_DATA = {
    ...GAME_DATA_JSON,
    statusEffects: (GAME_DATA_JSON as any).statusEffects || []
} as unknown as GameData;

interface DesignerContextType {
    gameData: GameData;
    sandboxCity: CityState;
    sandboxGrid: Cell[][];
    selection: DesignerSelection | null;
    simulationStats: {
        powerProduced: number;
        powerConsumed: number;
        powerUtilization: number;
        powerStars: number;
    } | null;

    // Actions
    updateGameData: (newData: GameData) => void;
    updateSandboxCity: (newCity: CityState) => void;
    setSelection: (selection: DesignerSelection | null) => void;
    resetSandbox: () => void;

    // Simulation Actions
    placeBuilding: (type: BuildingType) => void;
    nextTurn: () => void;
    resetCityOnly: () => void;
}

export type DesignerSelection =
    | { type: 'global' }
    | { type: 'building', buildingType: string, tier: number }
    | { type: 'blueprint', id: string }
    | { type: 'startingCity' }
    | { type: 'statusEffects' };

const DesignerContext = createContext<DesignerContextType | undefined>(undefined);

export function DesignerProvider({ children }: PropsWithChildren) {
    // Designer maintains its own mutable copy of game data
    const [gameData, setGameData] = useState<GameData>(INITIAL_DATA);

    // Initial check to ensure statusEffects is present if state somehow got stale
    if (!gameData.statusEffects) {
        // Force update if missing
        gameData.statusEffects = [];
    }

    // Sandbox simulation state
    const [sandboxCity, setSandboxCity] = useState<CityState>({ ...STARTING_CITY });
    const [sandboxGrid, setSandboxGrid] = useState<Cell[][]>(createGrid());
    const [simulationStats, setSimulationStats] = useState<any>(null); // Type lazily for now or import

    // Current UI selection
    const [selection, setSelection] = useState<DesignerSelection | null>(null);

    const updateGameData = (newData: GameData) => {
        setGameData(newData);
    };

    const updateSandboxCity = (newCity: CityState) => {
        setSandboxCity(newCity);
    };

    const resetSandbox = () => {
        setGameData(INITIAL_DATA);
        resetCityOnly();
    };

    const resetCityOnly = () => {
        setSandboxCity({ ...STARTING_CITY });
        setSandboxGrid(createGrid());
        setSimulationStats(null);
    };

    const placeBuilding = (type: BuildingType) => {
        // Find first empty cell? Or random? 
        // "Place Residential" button implies automatic placement or drag?
        // Let's just place in first available spot for simplicity of the prompt's "single button" paradigm,
        // OR better, we can assume the user clicks the button and it places it in a valid spot.
        // The prompt says: "Buttons: [ Place Residential ]".
        // Let's simpler: Find first empty spot.
        const newGrid = [...sandboxGrid.map(row => [...row])];
        let placed = false;

        for (let r = 0; r < newGrid.length; r++) {
            for (let c = 0; c < newGrid[0].length; c++) {
                if (!newGrid[r][c].tile) {
                    newGrid[r][c].tile = {
                        id: Math.random().toString(36).substr(2, 9),
                        type,
                        tier: 1,
                        stars: 0
                    };
                    resolveMerge(newGrid, r, c);
                    placed = true;
                    break;
                }
            }
            if (placed) break;
        }

        if (placed) {
            setSandboxGrid(newGrid);
            // Run sim
            const { city: nextCity, stats } = runSimulation(newGrid, sandboxCity);
            // We do NOT advance turn automatically on placement in this tool? 
            // "Buttons: [ Place ... ] ... [ Merge Selected ]".
            // "Turn Simulator: Turn slider (1 -> 20)".
            // Let's just update stats but NOT turn count, unless we want to simulate a turn.
            // But `runSimulation` calculates stats based on grid.
            setSandboxCity({ ...nextCity, turn: sandboxCity.turn }); // Keep turn same?
            setSimulationStats(stats);
        }
    };

    const nextTurn = () => {
        const { city: nextCity, stats } = runSimulation(sandboxGrid, sandboxCity);
        setSandboxCity({ ...nextCity, turn: sandboxCity.turn + 1 });
        setSimulationStats(stats);
    };

    return (
        <DesignerContext.Provider value={{
            gameData,
            sandboxCity,
            sandboxGrid,
            selection,
            simulationStats,
            updateGameData,
            updateSandboxCity,
            setSelection,
            resetSandbox,
            placeBuilding,
            nextTurn,
            resetCityOnly
        }}>
            {children}
        </DesignerContext.Provider>
    );
}

export function useDesigner() {
    const context = useContext(DesignerContext);
    if (!context) {
        throw new Error('useDesigner must be used within a DesignerProvider');
    }
    return context;
}
