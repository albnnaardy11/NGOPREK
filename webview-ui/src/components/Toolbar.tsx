import React from 'react';
import { Download, Upload, Terminal, Ghost, Layout } from 'lucide-react';

interface ToolbarProps {
    onPull: () => void;
    onPush: () => void;
    onGitk: () => void;
    onLayout: () => void;
    onHuntGhosts: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
    onPull, 
    onPush, 
    onGitk, 
    onLayout, 
    onHuntGhosts 
}) => {
    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center">
                <div>
                   <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">NGOPREK</h1>
                   <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Git Executive OS v1.1</p>
                </div>
                <div className="flex gap-1.5">
                   <button 
                       onClick={onPull} 
                       className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group" 
                       title="Git Pull"
                   >
                       <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
                   </button>
                   <button 
                       onClick={onPush} 
                       className="p-2.5 bg-blue-500/5 hover:bg-blue-500/20 border border-blue-500/10 rounded-xl transition-all group" 
                       title="Git Push"
                   >
                       <Upload className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                   </button>
                   <button 
                       onClick={onGitk} 
                       className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/5 rounded-xl transition-all group" 
                       title="Open Gitk"
                   >
                       <Terminal className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                   </button>
                </div>
            </div>
            
            <div className="mt-5 flex gap-2">
                <button 
                    onClick={onLayout} 
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-blue-400 transition-all backdrop-blur-sm shadow-inner"
                >
                    <Layout className="w-3 h-3" /> Optimize
                </button>
                <button 
                    onClick={onHuntGhosts} 
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-purple-400 transition-all backdrop-blur-sm shadow-inner"
                >
                    <Ghost className="w-3 h-3" /> Hunt Ghosts
                </button>
            </div>
        </div>
    );
};
