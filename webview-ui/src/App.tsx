import { useCallback, useEffect } from 'react';
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

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
      
      // Simple alert for now, could be a toast or better UI
      vscode.postMessage({ command: 'alert', text: message });
  };

  // Message Handling from Extension Backend
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'gitObjectChanged':
            console.log("Received Git Object Update:", message.data);
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
                    position: { x: 0, y: 0 }, // Will be handled by layout
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
                    const updatedNodes = nds.concat(newNode);
                    return updatedNodes;
                });

                setEdges((eds) => {
                    // Filter duplicates
                    const uniqueNewEdges = newEdges.filter(ne => !eds.find(e => e.id === ne.id));
                    return eds.concat(uniqueNewEdges);
                });
            }
            break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify backend that webview is ready
    vscode.postMessage({ command: 'webviewReady', text: 'React Webview Initialized' });

    return () => window.removeEventListener('message', handleMessage);
  }, [setNodes, setEdges]);

  // Auto layout whenever nodes/edges change significantly (or periodically? Just doing it on render cycle might be heavy)
  // For now, let's keep it simple. Real-time layouting is tricky with incremental updates.
  // We can add a "Re-Layout" button or use useLayoutEffect if needed. 
  // But strictly, dagre needs the full graph.
  // Let's rely on React Flow's default positioning for new nodes (0,0) and perhaps a button to organize.
  
  const onLayout = useCallback(() => {
      const layouted = getLayoutedElements(nodes, edges);
      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
  }, [nodes, edges, setNodes, setEdges]);


  return (
    <div style={{ width: '100vw', height: '100vh' }} className="bg-gray-900 text-white">
      <div className="absolute top-4 left-4 z-10 bg-black/50 p-2 rounded flex flex-col gap-2">
        <div>
            <h1 className="text-xl font-bold text-blue-400">NGOPREK Dashboard</h1>
            <p className="text-sm text-gray-400">Layer 1: Git Object Visualizer</p>
        </div>
        <button onClick={onLayout} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white transition">
            Auto Layout
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        fitView
      >
        <Background gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
