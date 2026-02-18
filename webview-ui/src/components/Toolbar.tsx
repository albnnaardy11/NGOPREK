import { Terminal, Layout, Grid, Ghost, ArrowUpCircle, Loader2, Zap, GitPullRequest, Shield, Activity } from 'lucide-react';

interface ToolbarProps {
    onPull: () => void;
    onPush: () => void;
    onGitk: () => void;
    onLayout: () => void;
    onHuntGhosts: () => void;
    onDeploy: () => void;
    isDeploying: boolean;
    user: { login: string, avatar_url: string } | null;
    workflows: any[];
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
    onPull,
    onPush,
    onGitk, 
    onLayout,
    onHuntGhosts,
    onDeploy,
    isDeploying,
    user,
    workflows
}) => {
    return (
        <div className="flex items-center justify-between w-full h-12 px-4 bg-[#050507] border-b border-white/5 z-50 overflow-hidden">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 group cursor-pointer">
                   <div className="w-8 h-8 flex items-center justify-center bg-neon-cyan/5 rounded-lg border border-neon-cyan/20 group-hover:bg-neon-cyan/20 transition-all">
                       <Grid className="w-4 h-4 text-neon-cyan shadow-[0_0_10px_#00f2ff]" />
                   </div>
                   <h1 className="text-sm font-black tracking-tight text-white uppercase hidden md:block">
                       Engine <span className="text-neon-cyan">Core</span>
                   </h1>
               </div>
               
               <div className="h-4 w-px bg-white/5" />

               <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-md border border-white/5 hover:border-white/10 transition-all cursor-help" title={`Authenticated as ${user.login}`}>
                             <img src={user.avatar_url} className="w-4 h-4 rounded-full ring-1 ring-blue-500/30" alt="avatar" />
                             <span className="text-[10px] font-bold text-gray-400">{user.login}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-[9px] text-gray-600 font-bold uppercase animate-pulse">
                            <Shield className="w-3 h-3" /> Anonymous
                        </div>
                    )}

                    <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-md border border-white/5">
                        <Activity className="w-3 h-3 text-gray-600" />
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">
                            {workflows.length > 0 ? workflows[0].conclusion || 'Syncing' : 'No-Sync'}
                        </span>
                    </div>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Secondary Actions */}
                <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/5">
                    <button onClick={onLayout} className="p-1.5 text-gray-600 hover:text-neon-cyan transition-colors" title="Optimize">
                        <Layout className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onHuntGhosts} className="p-1.5 text-gray-600 hover:text-neon-pink transition-colors" title="Reflog Hunter">
                        <Ghost className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onGitk} className="p-1.5 text-gray-600 hover:text-white transition-colors" title="Terminal">
                        <Terminal className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Primary Actions */}
                <div className="flex items-center gap-2">
                    <button onClick={onPull} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all">
                        <GitPullRequest className="w-3 h-3" /> 
                    </button>
                    <button 
                        onClick={onDeploy} 
                        disabled={isDeploying || !user}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all
                            ${isDeploying ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20'}
                        `}
                    >
                        {isDeploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                        Deploy
                    </button>
                    <button onClick={onPush} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neon-cyan text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-neon-cyan/10">
                        <Zap className="w-3 h-3" /> Push
                    </button>
                </div>
            </div>
        </div>
    );
};
