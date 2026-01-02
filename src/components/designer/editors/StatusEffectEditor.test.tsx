import { render, screen, fireEvent } from '@testing-library/react';
// import '@testing-library/jest-dom'; // Not installed
import { StatusEffectEditor } from './StatusEffectEditor';
import { useDesigner } from '../../../context/DesignerContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the DesignerContext
vi.mock('../../../context/DesignerContext', () => ({
    useDesigner: vi.fn()
}));

describe('StatusEffectEditor', () => {
    const mockUpdateGameData = vi.fn();
    const mockGameData = {
        statusEffects: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useDesigner as any).mockReturnValue({
            gameData: mockGameData,
            updateGameData: mockUpdateGameData
        });
    });

    it('renders correctly and allows adding a new effect', () => {
        render(<StatusEffectEditor />);

        // Check header
        expect(screen.getByText('Status Effects')).toBeDefined();

        // Add new effect
        fireEvent.click(screen.getByText('New Effect'));

        expect(mockUpdateGameData).toHaveBeenCalled();
        const updatedData = mockUpdateGameData.mock.calls[0][0];
        expect(updatedData.statusEffects).toHaveLength(1);
        expect(updatedData.statusEffects[0].name).toBe('New Effect');
    });

    it('allows adding a trigger to an effect', () => {
        const dataWithEffect = {
            statusEffects: [{
                id: 'test_effect',
                name: 'Test Effect',
                trigger: [],
                effects: [],
                duration: 'while_triggered',
                stacking: false
            }]
        };
        (useDesigner as any).mockReturnValue({
            gameData: dataWithEffect,
            updateGameData: mockUpdateGameData
        });

        render(<StatusEffectEditor />);

        // Find "Add Trigger" button (using getByText for the specific button)
        fireEvent.click(screen.getByText('Add Trigger'));

        expect(mockUpdateGameData).toHaveBeenCalled();
        const updatedData = mockUpdateGameData.mock.calls[0][0];
        expect(updatedData.statusEffects[0].trigger).toHaveLength(1);
        expect(updatedData.statusEffects[0].trigger[0].type).toBe('resource');
    });

    it('allows adding an effect action to an effect', () => {
        const dataWithEffect = {
            statusEffects: [{
                id: 'test_effect',
                name: 'Test Effect',
                trigger: [],
                effects: [],
                duration: 'while_triggered',
                stacking: false
            }]
        };
        (useDesigner as any).mockReturnValue({
            gameData: dataWithEffect,
            updateGameData: mockUpdateGameData
        });

        render(<StatusEffectEditor />);

        // Find "Add Effect Action" button
        fireEvent.click(screen.getByText('Add Effect Action'));

        expect(mockUpdateGameData).toHaveBeenCalled();
        const updatedData = mockUpdateGameData.mock.calls[0][0];
        expect(updatedData.statusEffects[0].effects).toHaveLength(1);
        expect(updatedData.statusEffects[0].effects[0].type).toBe('resourceDelta');
    });
});
