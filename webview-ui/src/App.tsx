import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
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
import { Loader2, X, Zap, Terminal, Layers, Ghost, Search, HelpCircle, Activity } from 'lucide-react';
import { CommitBox } from './components/CommitBox';
import { FileManager, FileItem } from './components/FileManager';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { DocumentationView } from './components/DocumentationView';

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
  const [activeView, setActiveView] = useState('engine');
  const [user, setUser] = useState<{login: string, avatar_url: string} | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [educationalTip, setEducationalTip] = useState<{ title: string, content: string, type?: string } | null>(null);
  const [gitFiles, setGitFiles] = useState<FileItem[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Welcome to NGOPREK Dashboard [v1.2.0]',
    '[system] engine ready. monitoring git repository...'
  ]);
  const [commandInput, setCommandInput] = useState('');
  const [isTerminalMinimized, setIsTerminalMinimized] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

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
      <div className={`p-4 min-w-[200px] glass-panel rounded-2xl transition-all duration-500 hover:scale-105
        ${isGhost ? 'neon-border-pink' : 'neon-border-cyan'}
      `}>
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className={`text-[9px] font-black uppercase tracking-widest ${isGhost ? 'text-neon-pink neon-text-pink' : 'text-neon-cyan neon-text-cyan'}`}>
                    {data.type || 'Object'}
                </div>
                {isGhost && <Ghost className="w-3.5 h-3.5 text-neon-pink animate-pulse" />}
            </div>
            <div className="text-[10px] font-mono text-gray-500 bg-black/30 px-2 py-1 rounded-md">{data.oid.substring(0, 8)}</div>
            <div className="text-[12px] font-bold text-gray-200 mt-1 line-clamp-2 leading-relaxed">{data.content}</div>
            
            {isGhost && (
              <button 
                onClick={(e) => { e.stopPropagation(); resurrect(data.oid); }}
                className="mt-3 py-2 bg-neon-pink text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-neon-pink/20"
              >
                Resurrect Commit
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
                    position: { x: Math.random() * 100, y: Math.random() * 100 },
                    data: { type, oid, content, parents, tree, entries, isGhost: false }
                };

                const newEdges: Edge[] = [];
                if (type === 'commit') {
                    if (parents) parents.forEach((p: string) => newEdges.push({
                        id: `${oid}-parent-${p}`, source: oid, target: p, label: 'parent', animated: true, style: { stroke: 'rgba(255, 255, 255, 0.2)' }, markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255, 255, 255, 0.4)' }
                    }));
                } else if (type === 'tree' && entries) {
                    entries.forEach((e: any) => newEdges.push({
                        id: `${oid}-contains-${e.oid}`, source: oid, target: e.oid, label: 'contains', style: { stroke: 'rgba(0, 242, 255, 0.2)' }, markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(0, 242, 255, 0.4)' }
                    }));
                }

                setNodes((nds) => nds.find(n => n.id === oid) ? nds : nds.concat(newNode));
                setEdges((eds) => {
                    const uniqueNew = newEdges.filter(ne => !eds.find(e => e.id === ne.id));
                    return eds.concat(uniqueNew);
                });
            }
            break;
        case 'terminalOutput':
            setTerminalLogs((prev) => [...prev, message.data]);
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

  const handleCommandSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!commandInput.trim()) return;
      vscode.postMessage({ command: 'terminalCommand', text: commandInput });
      setCommandInput('');
  };

  return (
    <div className="w-screen h-screen bg-[#050507] text-white flex font-sans overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-grow flex flex-col min-w-0 h-full">
        <Toolbar 
            onPull={gitPull}
            onPush={gitPush}
            onGitk={openGitk}
            onLayout={onLayout}
            onHuntGhosts={toggleGhosts}
            onDeploy={deployToCloud}
            isDeploying={isDeploying}
            user={user}
            workflows={workflows}
        />

        <div className="flex-grow flex min-h-0 relative">
          
          {/* Central Main View */}
          <div className="flex-grow h-full bg-[#08080a] relative grid-bg overflow-hidden flex flex-col">
            
            {activeView === 'documentation' ? (
                <DocumentationView />
            ) : (
                <div className="flex-grow relative">
                    {isDeploying && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[60] flex flex-col items-center justify-center gap-4 transition-all duration-500">
                        <Loader2 className="w-10 h-10 text-neon-cyan animate-spin" />
                        <div className="text-neon-cyan font-black tracking-[0.3em] uppercase animate-pulse text-[10px]">Syncing Matrix...</div>
                      </div>
                    )}

                    {nodes.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-10">
                            <div className="w-full max-w-2xl glass-panel rounded-2xl p-8 border-dashed border-2 border-white/5 opacity-40">
                                <div className="flex items-start gap-8">
                                    <Activity className="w-12 h-12 text-neon-cyan/50 animate-pulse" />
                                    <div className="flex-grow">
                                        <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">Diagnostic Hub</h2>
                                        <div className="grid grid-cols-2 gap-4 mt-6">
                                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                                <div className="text-[8px] text-gray-600 uppercase font-black mb-1">Local Repo</div>
                                                <div className="text-[10px] text-neon-cyan font-mono">Initialized & Monitoring</div>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                                <div className="text-[8px] text-gray-600 uppercase font-black mb-1">Graph State</div>
                                                <div className="text-[10px] text-neon-pink font-mono uppercase">Idle / Waiting for data</div>
                                            </div>
                                        </div>
                                        <div className="mt-8 flex items-center gap-3">
                                            <div className="px-3 py-1 bg-neon-cyan/10 border border-neon-cyan/20 rounded-md text-[9px] font-black text-neon-cyan uppercase tracking-widest animate-pulse">
                                                Ready for transmission
                                            </div>
                                            <span className="text-[10px] text-gray-500 italic">Create a commit to start visualization flow</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
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
                        <Background color="rgba(0, 242, 255, 0.03)" gap={25} size={1} />
                        <Controls position="bottom-left" className="glass-panel scale-90" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                        </ReactFlow>
                    )}

                    {/* Floating Terminal Overlay */}
                    <div className={`absolute bottom-4 left-4 right-4 ${isTerminalMinimized ? 'h-10' : 'h-48'} glass-panel rounded-xl flex flex-col z-40 transition-all duration-500 group shadow-2xl overflow-hidden`}>
                        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 cursor-pointer bg-white/2" onClick={() => setIsTerminalMinimized(!isTerminalMinimized)}>
                            <div className="flex items-center gap-2">
                               <Terminal className="w-3.5 h-3.5 text-neon-cyan" />
                               <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Neural Terminal</span>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-neon-green/40 shadow-[0_0_8px_#39ff14] animate-pulse" />
                        </div>
                        
                        {!isTerminalMinimized && (
                            <>
                                <div className="flex-grow overflow-y-auto p-4 font-mono text-[10px] custom-scrollbar bg-black/10">
                                    {terminalLogs.map((log, i) => (
                                        <div key={i} className="mb-1 text-gray-500 whitespace-pre-wrap flex gap-3">
                                            <span className="text-gray-800 flex-shrink-0">[{i}]</span>
                                            {log.startsWith('\u001b[32m') ? (
                                                <span className="text-neon-cyan italic">{log.replace('\u001b[32m', '').replace('\u001b[0m', '')}</span>
                                            ) : (
                                                <span>{log}</span>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={logEndRef} />
                                </div>

                                <form onSubmit={handleCommandSubmit} className="p-2.5 bg-black/20 border-t border-white/5 flex items-center gap-3">
                                    <span className="text-neon-cyan font-mono text-[10px] font-black">$</span>
                                    <input 
                                        type="text"
                                        value={commandInput}
                                        onChange={(e) => setCommandInput(e.target.value)}
                                        placeholder="Enter command shell..."
                                        className="flex-grow bg-transparent border-none outline-none text-[11px] font-mono text-gray-200 placeholder:text-gray-800"
                                    />
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Global Status Bar */}
            <div className="h-6 bg-[#050507] border-t border-white/5 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan/50" />
                        NODES: {nodes.length}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-pink/50" />
                        EDGES: {edges.length}
                    </div>
                </div>
                <div className="text-[9px] font-mono text-gray-700">NGOPREK_SYS_v1.5 // READY // {new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          {/* Right Sidebar Controls */}
          {activeView !== 'documentation' && (
            <div className="w-[320px] h-full bg-[#050507] border-l border-white/5 flex flex-col p-6 gap-8 overflow-y-auto custom-scrollbar z-30 shadow-2xl">
                <div className="flex-grow flex flex-col gap-8">
                    <FileManager files={gitFiles} onAdd={gitAdd} onUnstage={gitUnstage} />
                    <CommitBox onCommit={gitCommit} />
                </div>

                <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
                    <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <div className="flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-neon-cyan" />
                                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">System Load</span>
                            </div>
                            <span className="text-[10px] font-mono text-neon-cyan">84%</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden relative z-10">
                            <div className="w-[84%] h-full bg-neon-cyan shadow-[0_0_15px_#00f2ff]" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2.5 cursor-pointer hover:text-white transition-all group" onClick={() => setActiveView('documentation')}>
                            <HelpCircle className="w-4 h-4 text-gray-600 group-hover:text-neon-cyan transition-colors" />
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest group-hover:text-white">Manual</span>
                        </div>
                        <div className="flex items-center gap-2.5 cursor-pointer hover:text-white transition-all group">
                            <Search className="w-4 h-4 text-gray-600 group-hover:text-neon-cyan transition-colors" />
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest group-hover:text-white">Search</span>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>

      {educationalTip && (
        <div className="fixed bottom-10 right-10 z-[100] max-w-[280px] animate-in fade-in slide-in-from-right-10">
          <div className="glass-panel p-4 rounded-2xl shadow-2xl relative border-white/10">
            <div className={`absolute top-0 left-0 w-1 h-full ${educationalTip.type === 'ghost' ? 'bg-neon-pink shadow-[0_0_10px_#ff00ea]' : 'bg-neon-cyan shadow-[0_0_10px_#00f2ff]'}`} />
            <button onClick={() => setEducationalTip(null)} className="absolute top-2 right-2 text-gray-700 hover:text-white transition-all">
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${educationalTip.type === 'ghost' ? 'bg-neon-pink/10 border border-neon-pink/20' : 'bg-neon-cyan/20 border border-neon-cyan/20'}`}>
                {educationalTip.type === 'ghost' ? <Ghost className="w-4 h-4 text-neon-pink" /> : <Zap className="w-4 h-4 text-neon-cyan" />}
              </div>
              <div className="min-w-0">
                <h4 className={`font-black text-[9px] uppercase tracking-widest mb-1 ${educationalTip.type === 'ghost' ? 'text-neon-pink' : 'text-neon-cyan'}`}>{educationalTip.title}</h4>
                <p className="text-gray-400 text-[11px] leading-snug line-clamp-3">{educationalTip.content}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
