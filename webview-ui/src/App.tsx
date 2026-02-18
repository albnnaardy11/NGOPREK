import { useCallback, useEffect, useState } from 'react';
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
import { Cloud, Github, Loader2, CheckCircle2, Info, X } from 'lucide-react';

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
        g.setNode(node.id, { width: 180, height: 100 });
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
  
  // Cloud State
  const [user, setUser] = useState<{login: string, avatar_url: string} | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);

  // Educational State
  const [educationalTip, setEducationalTip] = useState<{ title: string, content: string } | null>(null);
  const [showGhostCommits, setShowGhostCommits] = useState(false);
  const [reflogEntries, setReflogEntries] = useState<any[]>([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
      let message = "This connects two Git objects.";
      if (edge.label === 'parent') {
          message = "This shows evolution. The parent hash is the base for this commit.";
      } else if (edge.label === 'root') {
          message = "This links a commit to its file system snapshot (Root Tree).";
      } else if (edge.label === 'contains') {
          message = "A Tree acts like a folder containing files (blobs) or other folders (trees).";
      }
      vscode.postMessage({ command: 'alert', text: message });
  };

  const deployToCloud = () => {
      setIsDeploying(true);
      vscode.postMessage({ command: 'deployToCloud' });
  };

  const fetchGhostCommits = () => {
      setShowGhostCommits(true);
      vscode.postMessage({ command: 'fetchReflog' });
  };

  // Message Handling from Extension Backend
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'reflogData':
            setReflogEntries(message.data);
            break;

        case 'educationalTidbit':
            setEducationalTip({ title: message.title, content: message.content });
            break;

        case 'cloudStatusUpdate':
            if (message.user) setUser(message.user);
            if (message.workflows) setWorkflows(message.workflows);
            if (message.repoUrl) setRepoUrl(message.repoUrl);
            
            // Check if any workflow is in progress
            const running = message.workflows?.some((w: WorkflowRun) => w.status === 'in_progress' || w.status === 'queued');
            setIsDeploying(!!running);
            break;

        case 'gitObjectChanged':
            // ... (Existing git object logic)
             if (message.data) {
                const { type, oid, content, parents, tree, entries } = message.data;
                
                // Determine styling based on type
                let bg = '#1e1e1e';
                let borderColor = '#777';
                let labelColor = '#fff';

                if (type === 'commit') {
                    bg = '#5c2b29'; // Reddish
                    borderColor = '#ff6b6b';
                    labelColor = '#ffc9c9';
                } else if (type === 'tree') {
                    bg = '#2b5c38'; // Greenish
                    borderColor = '#51cf66';
                    labelColor = '#d3f9d8';
                } else if (type === 'blob') {
                    bg = '#1c3e5e'; // Blueish
                    borderColor = '#339af0';
                    labelColor = '#d0ebff';
                }

                const newNode: Node = {
                    id: oid,
                    position: { x: 0, y: 0 }, 
                    data: { 
                        label: (
                            <div className="p-2 rounded text-xs">
                                <strong className="uppercase block mb-1" style={{ color: borderColor }}>{type}</strong>
                                <div className="text-gray-300 text-[10px] mb-1">{oid.substring(0, 7)}</div>
                                <div className="max-h-20 overflow-auto whitespace-pre-wrap font-mono text-[9px] opacity-80" style={{ color: labelColor }}>
                                    {type === 'tree' ? 'Folder Structure' : content.substring(0, 50) + (content.length > 50 ? '...' : '')}
                                </div>
                            </div>
                        ) 
                    },
                    style: { 
                        border: `1px solid ${borderColor}`, 
                        padding: 0,
                        background: bg,
                        color: labelColor,
                        width: 170
                    },
                };

                // Generate Edges
                const newEdges: Edge[] = [];
                
                if (type === 'commit') {
                    if (parents && parents.length > 0) {
                        parents.forEach((parentOid: string) => {
                            newEdges.push({
                                id: `${oid}-parent-${parentOid}`,
                                source: oid,
                                target: parentOid,
                                label: 'parent',
                                animated: true,
                                style: { stroke: '#ff6b6b' },
                                markerEnd: { type: MarkerType.ArrowClosed, color: '#ff6b6b' },
                            });
                        });
                    }
                    if (tree) {
                         newEdges.push({
                            id: `${oid}-root-${tree}`,
                            source: oid,
                            target: tree,
                            label: 'root',
                            animated: true, 
                            style: { stroke: '#51cf66' },
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#51cf66' },
                        });
                    }
                } else if (type === 'tree' && entries) {
                    entries.forEach((entry: any) => {
                        newEdges.push({
                            id: `${oid}-contains-${entry.oid}`,
                            source: oid,
                            target: entry.oid,
                            label: 'contains',
                            animated: false,
                            style: { stroke: '#339af0' },
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#339af0' },
                        });
                    });
                }

                setNodes((nds) => {
                    if (nds.find(n => n.id === oid)) return nds;
                    return nds.concat(newNode);
                });

                setEdges((eds) => {
                    const uniqueNewEdges = newEdges.filter(ne => !eds.find(e => e.id === ne.id));
                    return eds.concat(uniqueNewEdges);
                });
            }
            break;
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ command: 'webviewReady', text: 'React Webview Initialized' });
    return () => window.removeEventListener('message', handleMessage);
  }, [setNodes, setEdges]);
  
  const onLayout = useCallback(() => {
      const layouted = getLayoutedElements(nodes, edges);
      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
  }, [nodes, edges, setNodes, setEdges]);


  return (
    <div style={{ width: '100vw', height: '100vh' }} className="bg-gray-900 text-white flex flex-col">
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 p-2 rounded flex flex-col gap-2 backdrop-blur-sm border border-white/10">
        <div>
            <h1 className="text-xl font-bold text-blue-400">NGOPREK Dashboard</h1>
            <p className="text-sm text-gray-400">Layer 1: Git Object Visualizer</p>
        </div>
        <button onClick={onLayout} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white transition shadow-lg border border-blue-400/20">
            Auto Layout
        </button>
        <button onClick={fetchGhostCommits} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-bold text-white transition shadow-lg border border-purple-400/20 flex items-center gap-1">
            <Loader2 className={`w-3 h-3 ${showGhostCommits && reflogEntries.length === 0 ? 'animate-spin' : ''}`} />
            Hantu Commit (Reflog)
        </button>
      </div>

      {/* Ghost Commits (Reflog) Sidebar/Modal */}
      {showGhostCommits && (
          <div className="absolute top-0 right-0 w-80 h-full bg-gray-900/90 border-l border-purple-500/30 backdrop-blur-xl z-[90] p-4 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
                  <h2 className="text-lg font-bold text-purple-400">Reflog History</h2>
                  <button onClick={() => setShowGhostCommits(false)} className="text-gray-400 hover:text-white">
                      <X className="w-5 h-5" />
                  </button>
              </div>
              <p className="text-[10px] text-gray-400 mb-4 italic">
                  *Ini adalah sejarah HEAD. Kamu bisa menemukan commit yang terhapus di sini.
              </p>
              <div className="flex-grow overflow-auto space-y-2 pr-2">
                  {reflogEntries.map((entry, idx) => (
                      <div key={idx} className="bg-gray-800/50 p-2 rounded border border-gray-700 hover:border-purple-500/50 transition cursor-default group">
                          <div className="flex justify-between items-start mb-1">
                              <span className="text-[9px] font-mono text-purple-300 bg-purple-500/10 px-1 rounded">{entry.newSha.substring(0, 7)}</span>
                              <button 
                                onClick={() => {
                                    // Trigger resurrection by telling backend to read this object
                                    // Normally would be a git reset, but here we just want to ADD it to visualization
                                    vscode.postMessage({ command: 'alert', text: `Resurrecting ${entry.newSha.substring(0, 7)}... Check backend logs!` });
                                }}
                                className="hidden group-hover:block text-[9px] bg-purple-600 text-white px-1 rounded hover:bg-purple-500"
                              >
                                  Resurrect
                              </button>
                          </div>
                          <div className="text-[10px] text-gray-300 line-clamp-2">{entry.message}</div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Main Graph Area */}
      <div className="flex-grow relative">
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            fitView
        >
            <Background gap={16} color="#333" />
            <Controls />
        </ReactFlow>
      </div>

      {/* Educational Tip Modal */}
      {educationalTip && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-8 animate-in fade-in zoom-in duration-300">
              <div className="max-w-md bg-gray-800 border border-blue-500/30 rounded-xl shadow-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <button 
                    onClick={() => setEducationalTip(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                  >
                      <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Info className="w-6 h-6 text-blue-400" />
                      </div>
                      <h2 className="text-xl font-bold text-white">{educationalTip.title}</h2>
                  </div>
                  <div className="text-gray-300 leading-relaxed font-serif italic text-lg whitespace-pre-wrap">
                      "{educationalTip.content}"
                  </div>
                  <div className="mt-6 flex justify-end">
                      <button 
                        onClick={() => setEducationalTip(null)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 active:scale-95"
                      >
                          Saya Mengerti!
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Cloud Layer (Bottom Panel) */}
      <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-400" />
                  <span className="font-bold text-sm">Layer 3: The Cloud</span>
              </div>
              
              {user ? (
                  <div className="flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-full">
                      <img src={user.avatar_url} className="w-5 h-5 rounded-full" alt="avatar" />
                      <span className="text-xs text-white">{user.login}</span>
                  </div>
              ) : (
                  <span className="text-xs text-gray-400 italic">Not logged in</span>
              )}
          </div>

          <div className="flex items-center gap-4">
              {/* Status Indicators */}
              <div className="flex items-center gap-2">
                  {workflows.slice(0, 1).map(run => (
                      <div key={run.id} className="flex items-center gap-1 text-xs">
                          {run.status === 'in_progress' || run.status === 'queued' ? (
                              <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                          ) : run.conclusion === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                          <a href={run.html_url} target="_blank" className="hover:underline text-gray-300">
                              {run.name}
                          </a>
                      </div>
                  ))}
              </div>

              {repoUrl && (
                  <a 
                    href={repoUrl} 
                    target="_blank" 
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20"
                  >
                      <Github className="w-3 h-3" />
                      View Repo
                  </a>
              )}

               {/* Deploy Button */}
              <button 
                onClick={deployToCloud}
                disabled={isDeploying || !user}
                className={`flex items-center gap-2 px-4 py-2 rounded font-bold text-xs transition
                    ${isDeploying ? 'bg-yellow-600 cursor-wait' : 'bg-green-600 hover:bg-green-500'}
                    ${!user ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                  {isDeploying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deploying...
                      </>
                  ) : (
                      <>
                        <Github className="w-4 h-4" />
                        Terbangkan ke Cloud
                      </>
                  )}
              </button>
          </div>
      </div>
    </div>
  );
}
