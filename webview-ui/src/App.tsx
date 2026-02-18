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
} from 'reactflow';
import 'reactflow/dist/style.css';

// VS Code API wrapper
const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : { postMessage: () => {} };

const initialNodes: Node[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Waiting for Git Objects...' } },
];
const initialEdges: Edge[] = [];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Message Handling from Extension Backend
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'gitObjectChanged':
            console.log("Received Git Object Update:", message.data);
            if (message.data) {
                const { type, oid, content } = message.data;
                
                const newNode: Node = {
                    id: oid,
                    position: { x: Math.random() * 400 + 50, y: Math.random() * 400 + 50 },
                    data: { 
                        label: (
                            <div className="p-2 bg-gray-800 border border-gray-600 rounded text-xs">
                                <strong className="text-blue-300 uppercase">{type}</strong>
                                <div className="text-gray-400 text-[10px]">{oid.substring(0, 7)}</div>
                                <div className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap font-mono text-[9px] text-green-400">
                                    {content.substring(0, 100)}{content.length > 100 ? '...' : ''}
                                </div>
                            </div>
                        ) 
                    },
                    style: { 
                        border: '1px solid #777', 
                        padding: 10,
                        background: '#1e1e1e',
                        color: '#fff',
                        width: 150
                    },
                };

                setNodes((nds) => {
                    // Avoid duplicates
                    if (nds.find(n => n.id === oid)) return nds;
                    return nds.concat(newNode);
                });
            }
            break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify backend that webview is ready
    vscode.postMessage({ command: 'webviewReady', text: 'React Webview Initialized' });

    return () => window.removeEventListener('message', handleMessage);
  }, [setNodes]);

  return (
    <div style={{ width: '100vw', height: '100vh' }} className="bg-gray-900 text-white">
      <div className="absolute top-4 left-4 z-10 bg-black/50 p-2 rounded">
        <h1 className="text-xl font-bold text-blue-400">NGOPREK Dashboard</h1>
        <p className="text-sm text-gray-400">Layer 1: Git Object Visualizer</p>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
