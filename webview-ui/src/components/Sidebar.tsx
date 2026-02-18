import React from 'react';
import { Files, GitBranch, Search, Settings, Grid, Cpu } from 'lucide-react';

export const Sidebar: React.FC = () => {
    const navItems = [
        { icon: Files, label: 'File Explorer', active: true },
        { icon: GitBranch, label: 'Source Control' },
        { icon: Search, label: 'Search' },
        { icon: Cpu, label: 'Git Engine' },
        { icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="w-16 flex flex-col items-center py-6 bg-[#0a0a0c] border-r border-white/5 z-50">
            <div className="mb-10 text-neon-cyan neon-text-cyan">
                <Grid className="w-8 h-8" />
            </div>
            
            <div className="flex flex-col gap-6 flex-grow">
                {navItems.map((item, i) => (
                    <button 
                        key={i} 
                        className={`p-3 rounded-xl transition-all duration-300 group relative
                            ${item.active ? 'bg-blue-500/10 text-neon-cyan' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}
                        `}
                        title={item.label}
                    >
                        <item.icon className={`w-5 h-5 ${item.active ? 'neon-text-cyan' : ''}`} />
                        {item.active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-neon-cyan rounded-l-full shadow-[0_0_10px_#00f2ff]" />}
                    </button>
                ))}
            </div>

            <div className="mt-auto p-3 bg-green-500/5 border border-green-500/10 rounded-xl">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
        </div>
    );
};
