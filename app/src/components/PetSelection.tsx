
import React, { useState } from 'react';
import { beasts } from '../data/beasts';
import { useBeastStore } from '../stores/beastStore';

export const PetSelection: React.FC = () => {
    const { selectBeast } = useBeastStore();
    const [selectedSeries, setSelectedSeries] = useState<'dreamy' | 'hot-blooded' | 'cosmic' | 'mythology' | null>(null);

    const filteredBeasts = beasts.filter(b => b.series === selectedSeries);

    if (!selectedSeries) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background p-8 animate-fade-in">
                <h1 className="text-4xl font-bold mb-4 text-text-primary">欢迎来到幻兽学院</h1>
                <p className="text-xl mb-12 text-text-secondary">请选择你的幻兽蛋阵营</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {([
                        { key: 'dreamy', label: '梦幻系', title: '梦幻阵营', emoji: '🦄', desc: '可爱、魔法、治愈', badgeCls: 'bg-secondary/10 text-secondary' },
                        { key: 'hot-blooded', label: '热血系', title: '热血阵营', emoji: '🦖', desc: '帅气、力量、机械', badgeCls: 'bg-danger/10 text-danger' },
                        { key: 'cosmic', label: '星辰系', title: '星辰阵营', emoji: '🌌', desc: '星空、宇宙、神秘', badgeCls: 'bg-indigo-100 text-indigo-700' },
                        { key: 'mythology', label: '山海系', title: '山海阵营', emoji: '🐉', desc: '神话、古风、山海经', badgeCls: 'bg-amber-100 text-amber-700' },
                    ] as const).map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setSelectedSeries(item.key)}
                            className="card group relative w-full h-80 p-6 flex flex-col items-center justify-center hover:border-primary border-2 border-transparent transition-all duration-300"
                        >
                            <div className={`absolute top-4 left-4 ${item.badgeCls} px-3 py-1 rounded-full text-xs font-bold`}>{item.label}</div>
                            <div className="text-7xl mb-6 group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
                            <div className="text-xl font-bold text-text-primary mb-2">{item.title}</div>
                            <p className="text-text-secondary text-sm">{item.desc}</p>
                        </button>
                    ))}
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
                        {{ dreamy: '梦幻系', 'hot-blooded': '热血系', cosmic: '星辰系', mythology: '山海系' }[selectedSeries]}幻兽蛋
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
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${{
                                    dreamy: 'bg-secondary/10 text-secondary',
                                    'hot-blooded': 'bg-danger/10 text-danger',
                                    cosmic: 'bg-indigo-100 text-indigo-700',
                                    mythology: 'bg-amber-100 text-amber-700',
                                }[beast.series]}`}>
                                    {{ dreamy: '梦幻', 'hot-blooded': '热血', cosmic: '星辰', mythology: '山海' }[beast.series]}
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
