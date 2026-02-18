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
import { Github, Loader2, CheckCircle2, X, Ghost, Zap } from 'lucide-react';
import { CommitBox } from './components/CommitBox';
import { FileManager, FileItem } from './components/FileManager';
import { Toolbar } from './components/Toolbar';

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

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
      let message = "This connects two Git objects.";
      if (edge.label === 'parent') {
          message = "History: Current commit evolves from this parent.";
      } else if (edge.label === 'root') {
          message = "Structure: This commit points to its file tree.";
      } else if (edge.label === 'contains') {
          message = "Composition: This folder contains this file/folder.";
      }
      vscode.postMessage({ command: 'alert', text: message });
  };

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

  // Node Component Logic
  const renderNodeLabel = (node: any) => {
      const { type, oid, content, isGhost } = node.data;
      
      let borderColor = '#777';
      if (type === 'commit') borderColor = '#ff6b6b';
      else if (type === 'tree') borderColor = '#51cf66';
      else if (type === 'blob') borderColor = '#339af0';
      if (isGhost) borderColor = '#a78bfa';

      return (
          <div className={`p-3 rounded-lg border-2 transition-all duration-300 ${isGhost ? 'opacity-60 bg-purple-900/40 border-dashed backdrop-blur-md' : 'bg-gray-800/80 backdrop-blur-sm'}`} style={{ borderColor }}>
              <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isGhost ? 'text-purple-300' : ''}`} style={{ color: isGhost ? undefined : borderColor }}>
                      {isGhost && <Ghost className="inline w-3 h-3 mr-1" />}
                      {type}
                  </span>
                  <span className="text-[9px] font-mono text-gray-500">{oid.substring(0, 7)}</span>
              </div>
              
              <div className="text-[10px] text-gray-300 font-mono mb-2 line-clamp-2 italic">
                  {type === 'tree' ? 'Directory Structure' : content.substring(0, 40) + '...'}
              </div>

              {isGhost && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); resurrect(oid); }}
                    className="w-full py-1 mt-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[9px] font-bold flex items-center justify-center gap-1 shadow-lg shadow-purple-900/20"
                  >
                      <Zap className="w-3 h-3" /> Resurrect
                  </button>
              )}
          </div>
      );
  };

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

  // Wrap nodes to include custom label rendering
  const styledNodes = useMemo(() => nodes.map(n => ({
      ...n,
      data: { ...n.data, label: renderNodeLabel(n) }
  })), [nodes]);

  const onLayout = useCallback(() => {
      const layouted = getLayoutedElements(nodes, edges);
      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <div className="w-screen h-screen bg-[#0d1117] text-white flex flex-col font-sans overflow-hidden">
      {/* Glassmorphism Sidebar HUD */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-4 w-80 max-h-[calc(100vh-120px)] overflow-hidden">
        <Toolbar 
            onPull={gitPull}
            onPush={gitPush}
            onGitk={openGitk}
            onLayout={onLayout}
            onHuntGhosts={toggleGhosts}
        />

        {/* Unified File Manager Area */}
        <div className="flex-1 min-h-0 bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
           <FileManager files={gitFiles} onAdd={gitAdd} onUnstage={gitUnstage} />
        </div>

        {/* Conventional Commit Architect */}
        <CommitBox onCommit={gitCommit} />
      </div>

      <div className="flex-grow">
        <ReactFlow
            nodes={styledNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            fitView
            className="bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black"
        >
            <Background gap={20} color="#1a1a1a" size={1} />
            <Controls 
              className="!bg-gray-900/60 !backdrop-blur-xl !border !border-white/10 !rounded-xl !overflow-hidden !shadow-2xl !fill-blue-400 [&_button]:!border-white/5 [&_button:hover]:!bg-white/10" 
              showInteractive={false}
            />
        </ReactFlow>
      </div>

      {/* Educational Tidbit - Floating Card */}
      {educationalTip && (
          <div className="fixed bottom-24 right-6 max-w-sm z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
              <div className="bg-gray-900/90 backdrop-blur-xl border border-blue-500/20 p-6 rounded-2xl shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${educationalTip.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <button onClick={() => setEducationalTip(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Zap className="w-5 h-5 text-blue-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">{educationalTip.title}</h3>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed italic">"{educationalTip.content}"</p>
                  <div className="mt-4 flex justify-end">
                      <button onClick={() => setEducationalTip(null)} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest">
                          Dismiss
                      </button>
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
