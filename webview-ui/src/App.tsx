import { useState, useCallback, useEffect } from 'react';
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
            console.log("Received Git Object Update:", message.text);
            // In future steps: Parse message.data and update nodes
            setNodes((nds) => nds.concat({
                id: `node-${Date.now()}`,
                position: { x: Math.random() * 400, y: Math.random() * 400 },
                data: { label: message.text }
            }));
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
