class FormHistory {
    constructor(maxStates = 50) {
        this.maxStates = maxStates;
        this.undoStack = [];
        this.redoStack = [];
        this.currentState = null;
        this.debounceTimer = null;
        this.debounceDelay = 500;
    }

    captureState(getStateFunction) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            const newState = getStateFunction();
            
            if (this.currentState && JSON.stringify(this.currentState) === JSON.stringify(newState)) {
                return;
            }

            if (this.currentState !== null) {
                this.undoStack.push(this.currentState);
                if (this.undoStack.length > this.maxStates) {
                    this.undoStack.shift();
                }
            }

            this.currentState = newState;
            this.redoStack = [];
        }, this.debounceDelay);
    }

    undo(setStateFunction) {
        if (this.undoStack.length === 0) {
            return false;
        }

        if (this.currentState !== null) {
            this.redoStack.push(this.currentState);
        }

        this.currentState = this.undoStack.pop();
        setStateFunction(this.currentState);
        return true;
    }

    redo(setStateFunction) {
        if (this.redoStack.length === 0) {
            return false;
        }

        if (this.currentState !== null) {
            this.undoStack.push(this.currentState);
        }

        this.currentState = this.redoStack.pop();
        setStateFunction(this.currentState);
        return true;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        clearTimeout(this.debounceTimer);
        this.undoStack = [];
        this.redoStack = [];
        this.currentState = null;
    }

    initialize(initialState) {
        this.currentState = initialState;
        this.undoStack = [];
        this.redoStack = [];
    }
}

window.FormHistory = FormHistory;
