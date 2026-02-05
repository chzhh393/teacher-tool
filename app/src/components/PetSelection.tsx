
import React, { useState } from 'react';
import { beasts } from '../data/beasts';
import { useBeastStore } from '../stores/beastStore';

export const PetSelection: React.FC = () => {
    const { selectBeast } = useBeastStore();
    const [selectedSeries, setSelectedSeries] = useState<'dreamy' | 'hot-blooded' | null>(null);

    const filteredBeasts = beasts.filter(b => b.series === selectedSeries);

    if (!selectedSeries) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background p-8 animate-fade-in">
                <h1 className="text-4xl font-bold mb-4 text-text-primary">欢迎来到幻兽学院</h1>
                <p className="text-xl mb-12 text-text-secondary">请选择你的幻兽蛋阵营</p>

                <div className="flex flex-col md:flex-row gap-8">
                    <button
                        onClick={() => setSelectedSeries('dreamy')}
                        className="card group relative w-72 h-96 p-8 flex flex-col items-center justify-center hover:border-primary border-2 border-transparent transition-all duration-300"
                    >
                        <div className="absolute top-4 left-4 bg-secondary/10 px-3 py-1 rounded-full text-secondary text-xs font-bold">梦幻系</div>
                        <div className="text-8xl mb-6 group-hover:scale-110 transition-transform duration-300">🦄</div>
                        <div className="text-2xl font-bold text-text-primary mb-2">梦幻阵营</div>
                        <p className="text-text-secondary text-sm">可爱、魔法、治愈</p>
                    </button>

                    <button
                        onClick={() => setSelectedSeries('hot-blooded')}
                        className="card group relative w-72 h-96 p-8 flex flex-col items-center justify-center hover:border-primary border-2 border-transparent transition-all duration-300"
                    >
                        <div className="absolute top-4 left-4 bg-danger/10 px-3 py-1 rounded-full text-danger text-xs font-bold">热血系</div>
                        <div className="text-8xl mb-6 group-hover:scale-110 transition-transform duration-300">🦖</div>
                        <div className="text-2xl font-bold text-text-primary mb-2">热血阵营</div>
                        <p className="text-text-secondary text-sm">帅气、力量、机械</p>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center min-h-screen bg-background">
            <div className="w-full">
                <button
                    onClick={() => setSelectedSeries(null)}
                    className="mb-8 flex items-center text-text-secondary hover:text-primary transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100 w-fit"
                >
                    ← 返回阵营选择
                </button>

                <div className="flex items-center justify-between mb-8 px-2">
                    <h2 className="text-2xl font-bold text-text-primary">
                        {selectedSeries === 'dreamy' ? '梦幻系幻兽蛋' : '热血系幻兽蛋'}
                    </h2>
                    <span className="text-sm text-text-secondary bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                        共 {filteredBeasts.length} 种
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBeasts.map((beast, index) => (
                        <div
                            key={beast.id}
                            className="card p-6 cursor-pointer group hover:ring-2 hover:ring-primary hover:ring-offset-2 border border-gray-100"
                            onClick={() => selectBeast(beast.id)}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="aspect-square bg-gray-50 rounded-xl mb-4 overflow-hidden relative flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                <img
                                    src={beast.images.baby}
                                    alt={beast.name}
                                    className="w-4/5 h-4/5 object-contain group-hover:scale-110 transition-transform duration-500 filter drop-shadow-md"
                                />
                            </div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-text-primary">{beast.name}</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${beast.series === 'dreamy' ? 'bg-secondary/10 text-secondary' : 'bg-danger/10 text-danger'
                                    }`}>
                                    {beast.series === 'dreamy' ? '梦幻' : '热血'}
                                </span>
                            </div>
                            <p className="text-xs text-text-secondary mb-3 font-medium uppercase tracking-wide opacity-70">{beast.englishName}</p>
                            <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">{beast.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
