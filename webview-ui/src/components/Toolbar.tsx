import { Terminal, Layout, Grid, Ghost } from 'lucide-react';

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
        <div className="flex items-center justify-between w-full h-14 px-6 bg-[#0a0a0c] border-b border-white/5">
            <div className="flex items-center gap-4">
               <h1 className="text-xl font-black tracking-tighter text-neon-cyan neon-text-cyan flex items-center gap-2">
                   <Grid className="w-5 h-5" /> NGOPREK
               </h1>
               <div className="h-4 w-px bg-white/10" />
               <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Standard OS v1.2</span>
            </div>
            
            <div className="flex items-center gap-2">
                <button className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white/10 transition-all">
                    Offline
                </button>
                <button onClick={onPull} className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-neon-cyan transition-all">
                    Pull
                </button>
                <button onClick={onPush} className="px-6 py-1.5 rounded-lg bg-green-500/80 text-black text-[10px] font-black uppercase tracking-widest hover:bg-green-400 transition-all shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                    Push
                </button>
                
                <div className="w-px h-6 bg-white/10 mx-2" />
                
                <button onClick={onGitk} className="p-2 text-gray-500 hover:text-white transition-colors">
                    <Terminal className="w-4 h-4" />
                </button>
                <button onClick={onLayout} className="p-2 text-gray-500 hover:text-neon-cyan transition-colors" title="Optimize Layout">
                    <Layout className="w-4 h-4" />
                </button>
                <button onClick={onHuntGhosts} className="p-2 text-gray-500 hover:text-neon-pink transition-colors" title="Hunt Ghosts">
                    <Ghost className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
