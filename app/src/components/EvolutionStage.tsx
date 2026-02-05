
import React from 'react';
import { useBeastStore } from '../stores/beastStore';
import { motion, AnimatePresence } from 'framer-motion';

export const EvolutionStage: React.FC = () => {
    const { currentLevel, currentStage, getCurrentBeast, selectBeast, addLevel, setLevel } = useBeastStore();
    const beast = getCurrentBeast();

    if (!beast) {
        return <div className="p-8 text-center text-red-500">Error: No beast selected</div>;
    }

    const stageImage = beast.images[currentStage];

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="absolute top-4 left-4 z-10">
                <button
                    onClick={() => selectBeast('')} // Reset selection
                    className="bg-white px-4 py-2 rounded-lg shadow text-text-secondary"
                >
                    ← 更换幻兽
                </button>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-4xl flex flex-col md:flex-row gap-8 items-center">

                {/* Left: Visualization */}
                <div className="flex-1 flex flex-col items-center">
                    <div className="relative w-80 h-80 md:w-96 md:h-96">
                        <AnimatePresence mode='wait'>
                            <motion.img
                                key={currentStage} // Re-animate when stage changes
                                src={stageImage}
                                alt={beast.name}
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                transition={{ duration: 0.5 }}
                                className="w-full h-full object-contain drop-shadow-2xl"
                            />
                        </AnimatePresence>

                        {/* Stage Badge */}
                        <div className="absolute -top-4 -right-4 bg-warning text-white px-4 py-1 rounded-full font-bold shadow-lg rotate-12">
                            {currentStage === 'egg' && '🥚 幻兽蛋'}
                            {currentStage === 'baby' && '👶 幼年期'}
                            {currentStage === 'juvenile' && '🧒 少年期'}
                            {currentStage === 'adult' && '💪 成熟期'}
                            {currentStage === 'ultimate' && '👑 完全体'}
                        </div>
                    </div>
                </div>

                {/* Right: Info & Controls */}
                <div className="flex-1 w-full space-y-6">
                    <div>
                        <h1 className="text-4xl font-bold text-text-primary mb-2">{beast.name}</h1>
                        <p className="text-xl text-text-secondary">{beast.englishName}</p>
                    </div>

                    <div className="bg-gray-100 rounded-xl p-6">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-text-secondary font-bold">等级 Lv.{currentLevel}</span>
                            <span className="text-primary font-bold">{currentLevel >= 10 ? 'MAX' : '下一级'}</span>
                        </div>
                        {/* Progress Bar Mockup */}
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div className="bg-primary h-full rounded-full w-2/3"></div>
                        </div>
                        <p className="text-xs text-text-tertiary mt-2 text-right">35/50 积分</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={addLevel}
                            className="bg-primary hover:brightness-105 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform"
                        >
                            获得积分 (测试+1级)
                        </button>

                        <button
                            onClick={() => setLevel(10)}
                            className="bg-accent hover:bg-sky-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform"
                        >
                            一键满级 (测试)
                        </button>

                        <button
                            onClick={() => setLevel(1)}
                            className="col-span-2 text-text-tertiary hover:text-text-secondary py-2"
                        >
                            重置等级
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
