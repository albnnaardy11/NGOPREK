import { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Dagre from '@dagrejs/dagre';
import { Github, Loader2, CheckCircle2, X, Zap, Box, Terminal, Layers, Ghost } from 'lucide-react';
import { CommitBox } from './components/CommitBox';
import { FileManager, FileItem } from './components/FileManager';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';

// VS Code API wrapper
const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : { postMessage: () => {} };

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Helper to layout graph
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR' });

    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    nodes.forEach((node) => {
        g.setNode(node.id, { width: 220, height: 120 });
    });

    Dagre.layout(g);

    return {
        nodes: nodes.map((node) => {
            const { x, y } = g.node(node.id);
            return { ...node, position: { x, y } };
        }),
        edges,
    };
};

interface WorkflowRun {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    html_url: string;
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // States
  const [user, setUser] = useState<{login: string, avatar_url: string} | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [educationalTip, setEducationalTip] = useState<{ title: string, content: string, type?: string } | null>(null);
  const [gitFiles, setGitFiles] = useState<FileItem[]>([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const deployToCloud = () => {
      setIsDeploying(true);
      vscode.postMessage({ command: 'deployToCloud' });
  };

  const toggleGhosts = () => {
      vscode.postMessage({ command: 'fetchReflog' });
  };

  const resurrect = (oid: string) => {
      vscode.postMessage({ command: 'resurrectCommit', oid });
  };

  const gitAdd = (path: string) => vscode.postMessage({ command: 'gitAdd', path });
  const gitUnstage = (path: string) => vscode.postMessage({ command: 'gitUnstage', path });
  const gitCommit = (message: string) => vscode.postMessage({ command: 'gitCommit', message });
  const gitPull = () => vscode.postMessage({ command: 'gitPull' });
  const gitPush = () => vscode.postMessage({ command: 'gitPush' });
  const openGitk = () => vscode.postMessage({ command: 'openGitk' });

  // Custom Node Styling
  const CustomNode = ({ data }: any) => {
    const isGhost = data.isGhost;
    return (
      <div className={`p-4 min-w-[150px] bg-[#121216]/90 backdrop-blur-md rounded-lg border transition-all duration-500
        ${isGhost ? 'neon-border-pink border-neon-pink/50' : 'neon-border-cyan border-neon-cyan/50'}
      `}>
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className={`text-[8px] font-black uppercase tracking-widest ${isGhost ? 'text-neon-pink' : 'text-neon-cyan'}`}>
                    {data.type || 'Object'}
                </div>
                {isGhost && <Ghost className="w-3 h-3 text-neon-pink animate-pulse" />}
            </div>
            <div className="text-[10px] font-mono text-gray-400 truncate">{data.oid}</div>
            <div className="text-[11px] font-bold text-gray-200 mt-1 line-clamp-2">{data.content}</div>
            
            {isGhost && (
              <button 
                onClick={(e) => { e.stopPropagation(); resurrect(data.oid); }}
                className="mt-3 py-1.5 bg-neon-pink/10 hover:bg-neon-pink/30 border border-neon-pink/20 rounded-md text-[9px] font-black text-neon-pink uppercase transition-all"
              >
                Resurrect
              </button>
            )}
        </div>
      </div>
    );
  };

  const nodeTypes = useMemo(() => ({
    commit: CustomNode,
    tree: CustomNode,
    blob: CustomNode,
    ghost: CustomNode,
  }), []);

  // Message Handling
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'cloudStatusUpdate':
            if (message.user) setUser(message.user);
            if (message.workflows) setWorkflows(message.workflows);
            if (message.repoUrl) setRepoUrl(message.repoUrl);
            const running = message.workflows?.some((w: WorkflowRun) => w.status === 'in_progress' || w.status === 'queued');
            setIsDeploying(!!running);
            break;

        case 'educationalTidbit':
            setEducationalTip({ title: message.title, content: message.content, type: message.type });
            break;

        case 'gitStatusUpdate':
            setGitFiles(message.status || []);
            break;

        case 'reflogData':
            console.log("Reflog Data:", message.data);
            const ghostNodes: Node[] = message.data.map((entry: any) => ({
                id: `ghost-${entry.newSha}`,
                type: 'ghost',
                position: { x: Math.random() * 500, y: Math.random() * 500 },
                data: { 
                    type: 'commit', 
                    oid: entry.newSha, 
                    content: entry.message, 
                    isGhost: true 
                }
            }));
            
            setNodes((nds) => {
                const existingIds = new Set(nds.map(n => n.id));
                const newGhosts = ghostNodes.filter(n => !existingIds.has(n.id));
                return nds.concat(newGhosts);
            });
            break;

        case 'gitObjectChanged':
            if (message.data) {
                const { type, oid, content, parents, tree, entries } = message.data;
                const newNode: Node = {
                    id: oid,
                    type: type,
                    position: { x: 0, y: 0 },
                    data: { type, oid, content, parents, tree, entries, isGhost: false }
                };

                const newEdges: Edge[] = [];
                if (type === 'commit') {
                    if (parents) parents.forEach((p: string) => newEdges.push({
                        id: `${oid}-parent-${p}`, source: oid, target: p, label: 'parent', animated: true, style: { stroke: '#ff6b6b' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ff6b6b' }
                    }));
                    if (tree) newEdges.push({
                        id: `${oid}-root-${tree}`, source: oid, target: tree, label: 'root', animated: true, style: { stroke: '#51cf66' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#51cf66' }
                    });
                } else if (type === 'tree' && entries) {
                    entries.forEach((e: any) => newEdges.push({
                        id: `${oid}-contains-${e.oid}`, source: oid, target: e.oid, label: 'contains', style: { stroke: '#339af0' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#339af0' }
                    }));
                }

                setNodes((nds) => nds.find(n => n.id === oid) ? nds : nds.concat(newNode));
                setEdges((eds) => {
                    const uniqueNew = newEdges.filter(ne => !eds.find(e => e.id === ne.id));
                    return eds.concat(uniqueNew);
                });
            }
            break;
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ command: 'webviewReady' });
    return () => window.removeEventListener('message', handleMessage);
  }, [setNodes, setEdges]);

  const onLayout = useCallback(() => {
      const layouted = getLayoutedElements(nodes, edges);
      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <div className="w-screen h-screen bg-[#0a0a0c] text-white flex font-sans overflow-hidden">
      {/* 1. Global Navigation Sidebar */}
      <Sidebar />

      <div className="flex-grow flex flex-col min-w-0 h-full">
        {/* 2. Top Executive Toolbar */}
        <Toolbar 
            onPull={gitPull}
            onPush={gitPush}
            onGitk={openGitk}
            onLayout={onLayout}
            onHuntGhosts={toggleGhosts}
        />

        <div className="flex-grow flex min-h-0 relative">
          
          {/* 3. Central Graph View - The Matrix */}
          <div className="flex-grow h-full bg-[#0d0d10] relative grid-bg">
            {isDeploying && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 transition-all duration-500">
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-neon-cyan animate-spin" />
                  <div className="absolute inset-0 bg-neon-cyan/20 blur-xl animate-pulse" />
                </div>
                <div className="text-neon-cyan font-black tracking-[0.3em] uppercase animate-pulse">Synchronizing Data...</div>
              </div>
            )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              className="z-10"
            >
              <Background color="rgba(0, 242, 255, 0.05)" gap={30} size={1} />
              <Controls position="bottom-left" style={{ background: 'rgba(18,18,22,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }} />
            </ReactFlow>

            {/* Bottom Status Log (Simulated) */}
            <div className="absolute bottom-6 left-6 right-6 h-32 bg-black/40 border border-white/5 rounded-xl backdrop-blur-md p-4 flex flex-col z-20 pointer-events-none opacity-60">
                <div className="flex items-center gap-2 mb-2">
                   <Terminal className="w-3 h-3 text-neon-cyan" />
                   <span className="text-[9px] font-black uppercase text-neon-cyan/70 tracking-widest">Live Terminal Log</span>
                </div>
                <div className="flex-grow font-mono text-[9px] text-green-500/50 overflow-hidden leading-relaxed">
                   [git] reading objects from .git/objects...<br/>
                   [system] indexing branches and reflogs...<br/>
                   [engine] analyzing tree structure for OID 4a2b9...<br/>
                   [ui] refreshing graph layout and node positioning...
                </div>
            </div>
          </div>

          {/* 4. Right Controls Sidebar - The Command Center */}
          <div className="w-[320px] h-full bg-[#121216] border-l border-white/5 flex flex-col p-6 gap-8 overflow-y-auto custom-scrollbar shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-30">
            
            <div className="flex items-center justify-between group cursor-help">
               <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-neon-cyan font-black">Git Status</span>
                  <span className="text-[8px] text-gray-600 font-bold">CONNECTED TO MAIN</span>
               </div>
               <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Box className="w-4 h-4 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
               </div>
            </div>

            <div className="flex gap-2 justify-between px-2">
               {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[8px] text-gray-500 hover:border-neon-cyan transition-colors">
                     S{i}
                  </div>
               ))}
            </div>

            <div className="flex-grow flex flex-col gap-8">
               <FileManager files={gitFiles} onAdd={gitAdd} onUnstage={gitUnstage} />
               <CommitBox onCommit={gitCommit} />
            </div>

            <div className="mt-auto border-t border-white/5 pt-6">
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4 rounded-xl border border-white/5">
                   <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-3 h-3 text-neon-cyan" />
                      <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase">System Load</span>
                   </div>
                   <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="w-3/4 h-full bg-neon-cyan shadow-[0_0_10px_#00f2ff]" />
                   </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {educationalTip && (
        <div className="fixed bottom-10 right-10 z-[100] max-w-sm animate-in fade-in slide-in-from-bottom-10">
          <div className="bg-[#121216]/95 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full ${educationalTip.type === 'ghost' ? 'bg-neon-pink shadow-[0_0_15px_#ff00ea]' : 'bg-neon-cyan shadow-[0_0_15px_#00f2ff]'}`} />
            <button 
              onClick={() => setEducationalTip(null)}
              className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${educationalTip.type === 'ghost' ? 'bg-neon-pink/10' : 'bg-neon-cyan/10'}`}>
                {educationalTip.type === 'ghost' ? <Ghost className="w-6 h-6 text-neon-pink animate-pulse" /> : <Zap className="w-6 h-6 text-neon-cyan brightness-125" />}
              </div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-1">{educationalTip.title}</h4>
                <p className="text-gray-300 text-sm leading-relaxed">{educationalTip.content}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Dashboard Layer */}
      <div className="h-20 bg-black/40 backdrop-blur-2xl border-t border-white/5 flex items-center justify-between px-8 z-30">
          <div className="flex items-center gap-8">
              <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-tighter text-gray-500 font-bold">Authenticated Profile</span>
                  {user ? (
                      <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                          <img src={user.avatar_url} className="w-6 h-6 rounded-full ring-2 ring-blue-500/20" alt="avatar" />
                          <span className="text-sm font-semibold">{user.login}</span>
                      </div>
                  ) : (
                      <span className="text-xs text-gray-500 animate-pulse">Waiting for GitHub login...</span>
                  )}
              </div>
              
              <div className="h-10 w-px bg-white/5" />

              <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-tighter text-gray-500 font-bold">Cloud Status</span>
                  <div className="flex items-center gap-3 mt-1">
                      {workflows.length > 0 ? (
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
                              {workflows[0].status === 'in_progress' ? (
                                  <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                              ) : workflows[0].conclusion === 'success' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                              )}
                              <span>Action v{workflows[0].id.toString().substring(0,4)}</span>
                          </div>
                      ) : (
                          <span className="text-xs text-gray-600 italic">No deployments detected</span>
                      )}
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-4">
              {repoUrl && (
                  <a href={repoUrl} target="_blank" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/5">
                      <Github className="w-4 h-4" /> Open GitHub
                  </a>
              )}
              <button 
                  onClick={deployToCloud}
                  disabled={isDeploying || !user}
                  className={`relative group overflow-hidden px-8 py-2.5 rounded-xl text-xs font-black transition-all
                    ${isDeploying ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40'}
                    ${!user ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 relative z-10">
                      {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {isDeploying ? 'Deploying...' : 'TERBANGKAN KE CLOUD'}
                  </div>
              </button>
          </div>
      </div>
    </div>
  );
}
