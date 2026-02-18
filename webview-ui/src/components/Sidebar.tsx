import React from 'react';
import { Files, GitBranch, Search, Settings, Grid, Cpu, HelpCircle } from 'lucide-react';

interface SidebarProps {
    activeView: string;
    onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
    const navItems = [
        { id: 'explorer', icon: Files, label: 'File Explorer' },
        { id: 'source-control', icon: GitBranch, label: 'Source Control' },
        { id: 'search', icon: Search, label: 'Search' },
        { id: 'engine', icon: Cpu, label: 'Git Engine' },
        { id: 'documentation', icon: HelpCircle, label: 'Documentation' },
    ];

    return (
        <div className="w-14 flex flex-col items-center py-6 bg-[#050507] border-r border-white/5 z-50">
            <div className="mb-8 cursor-pointer group" onClick={() => onViewChange('engine')}>
                <Grid className="w-7 h-7 text-neon-cyan neon-text-cyan transition-transform group-hover:scale-110" />
            </div>
            
            <div className="flex flex-col gap-5 flex-grow">
                {navItems.map((item, i) => (
                    <button 
                        key={i} 
                        onClick={() => onViewChange(item.id)}
                        className={`p-2.5 rounded-xl transition-all duration-300 group relative
                            ${activeView === item.id 
                                ? 'bg-neon-cyan/10 text-neon-cyan' 
                                : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}
                        `}
                        title={item.label}
                    >
                        <item.icon className={`w-5 h-5 ${activeView === item.id ? 'neon-text-cyan' : 'group-hover:scale-105 transition-transform'}`} />
                        {activeView === item.id && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-neon-cyan rounded-l-full shadow-[0_0_10px_#00f2ff]" />
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-auto flex flex-col gap-4 items-center">
                <button 
                    className={`p-2.5 rounded-xl transition-all ${activeView === 'settings' ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}`}
                    onClick={() => onViewChange('settings')}
                >
                    <Settings className="w-5 h-5" />
                </button>
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green/30 border border-neon-green/50 animate-pulse" />
            </div>
        </div>
    );
};
