import { describe, expect, test } from "./assert.js";

describe("FormHistory", () => {
    test("captures form state changes", () => {
        const history = new FormHistory(50);
        const state1 = { field1: "value1", field2: "value2" };
        
        history.initialize(state1);
        expect(history.currentState).toBe(state1);
        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(false);
    });

    test("captures state after initialization", () => {
        const history = new FormHistory(50);
        const state1 = { field: "a" };
        const state2 = { field: "b" };
        
        history.initialize(state1);
        expect(history.currentState).toBe(state1);
        
        history.captureState(() => state2);
        setTimeout(() => {
            expect(history.canUndo()).toBe(true);
            expect(history.currentState).toBe(state2);
        }, 600);
    });

    test("undo restores previous state", () => {
        const history = new FormHistory(50);
        const state1 = { value: 1 };
        const state2 = { value: 2 };
        const setStateCalls = [];
        
        history.initialize(state1);
        history.undoStack.push(state1);
        history.currentState = state2;
        
        expect(history.canUndo()).toBe(true);
        history.undo((state) => setStateCalls.push(state));
        expect(setStateCalls).toContain(state1);
    });

    test("redo restores next state", () => {
        const history = new FormHistory(50);
        const state1 = { value: 1 };
        const state2 = { value: 2 };
        const setStateCalls = [];
        
        history.currentState = state1;
        history.redoStack.push(state2);
        
        expect(history.canRedo()).toBe(true);
        history.redo((state) => setStateCalls.push(state));
        expect(setStateCalls).toContain(state2);
    });

    test("clears redo stack when capturing new state", () => {
        const history = new FormHistory(50);
        const state1 = { value: 1 };
        const state2 = { value: 2 };
        const state3 = { value: 3 };
        
        history.initialize(state1);
        history.undoStack.push(state1);
        history.currentState = state2;
        history.redoStack.push(state3);
        
        expect(history.canRedo()).toBe(true);
        history.captureState(() => state3);
        setTimeout(() => {
            expect(history.redoStack.length).toBe(0);
        }, 600);
    });

    test("respects max states limit", () => {
        const maxStates = 5;
        const history = new FormHistory(maxStates);
        const getState = (n) => ({ value: n });
        
        history.initialize(getState(0));
        
        for (let i = 1; i < maxStates + 5; i++) {
            history.undoStack.push(getState(i - 1));
        }
        
        expect(history.undoStack.length).toBeLessThanOrEqual(maxStates);
    });

    test("clears all history", () => {
        const history = new FormHistory(50);
        const state1 = { value: 1 };
        const state2 = { value: 2 };
        
        history.initialize(state1);
        history.undoStack.push(state1);
        history.currentState = state2;
        history.redoStack.push(state2);
        
        history.clear();
        
        expect(history.undoStack.length).toBe(0);
        expect(history.redoStack.length).toBe(0);
        expect(history.currentState).toBe(null);
    });
});
