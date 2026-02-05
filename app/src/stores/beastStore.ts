import { create } from 'zustand';
import { beasts } from '../data/beasts';
import type { Beast, EvolutionStage } from '../data/beasts';

interface BeastState {
    currentBeastId: string | null;
    currentLevel: number;
    currentStage: EvolutionStage;
    isLocked: boolean; // For future implementation

    // Actions
    selectBeast: (beastId: string) => void;
    setLevel: (level: number) => void;
    addLevel: () => void;
    getCurrentBeast: () => Beast | undefined;
}

export const useBeastStore = create<BeastState>((set, get) => ({
    currentBeastId: null,
    currentLevel: 1,
    currentStage: 'egg',
    isLocked: false,

    selectBeast: (beastId) => set({ currentBeastId: beastId, currentLevel: 1, currentStage: 'egg' }),

    setLevel: (level) => {
        let stage: EvolutionStage = 'egg';
        if (level <= 0) stage = 'egg';
        else if (level <= 2) stage = 'baby';
        else if (level <= 5) stage = 'juvenile';
        else if (level <= 8) stage = 'adult';
        else stage = 'ultimate';

        set({ currentLevel: level, currentStage: stage });
    },

    addLevel: () => {
        const { currentLevel, setLevel } = get();
        if (currentLevel < 10) {
            setLevel(currentLevel + 1);
        }
    },

    getCurrentBeast: () => {
        const { currentBeastId } = get();
        return beasts.find(b => b.id === currentBeastId);
    }
}));
