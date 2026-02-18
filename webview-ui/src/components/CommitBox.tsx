import React, { useState } from 'react';
import { Send, Terminal, Type } from 'lucide-react';

interface CommitBoxProps {
    onCommit: (message: string) => void;
}

const PREFIXES = [
    { id: 'feat', color: 'text-neon-cyan', bg: 'bg-neon-cyan/5' },
    { id: 'fix', color: 'text-red-400', bg: 'bg-red-400/5' },
    { id: 'ref', color: 'text-purple-400', bg: 'bg-purple-400/5' },
    { id: 'perf', color: 'text-yellow-400', bg: 'bg-yellow-400/5' },
    { id: 'chore', color: 'text-gray-400', bg: 'bg-gray-400/5' },
];

export const CommitBox: React.FC<CommitBoxProps> = ({ onCommit }) => {
    const [selectedPrefix, setSelectedPrefix] = useState('feat');
    const [message, setMessage] = useState('');

    const currentPrefix = PREFIXES.find(p => p.id === selectedPrefix);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-2 mb-2">
                <Type className="w-4 h-4 text-neon-cyan" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Atomic Commit</h3>
            </div>

            <div className="glass-panel rounded-xl p-3 flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {PREFIXES.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPrefix(p.id)}
                            className={`px-2 py-1 rounded-md border text-[8px] font-black uppercase transition-all
                                ${selectedPrefix === p.id 
                                    ? `${p.color} border-white/10 ${p.bg}` 
                                    : 'border-white/5 text-gray-600 hover:text-gray-400'}
                            `}
                        >
                            {p.id}
                        </button>
                    ))}
                </div>

                <div className="relative group">
                    <Terminal className="absolute left-2.5 top-2.5 w-3 h-3 text-gray-700 group-focus-within:text-neon-cyan transition-colors" />
                    <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Commit log entry..."
                        className="w-full bg-black/30 border border-white/5 rounded-lg py-2 pl-7 pr-3 text-[11px] font-mono text-gray-300 placeholder:text-gray-800 focus:outline-none focus:border-neon-cyan/30 min-h-[50px] resize-none"
                    />
                </div>

                {/* Micro Preview */}
                <div className="px-2 py-1.5 bg-black/20 border border-dashed border-white/5 rounded-md">
                     <div className="font-mono text-[9px] truncate">
                        <span className={`${currentPrefix?.color} font-bold`}>{selectedPrefix}</span>
                        <span className="text-gray-600">: </span>
                        <span className={message ? "text-gray-400" : "text-gray-700 italic"}>
                            {message || "waiting..."}
                        </span>
                     </div>
                </div>

                <button 
                    onClick={() => { onCommit(`${selectedPrefix}: ${message}`); setMessage(''); }}
                    disabled={!message}
                    className="w-full py-2 bg-neon-cyan text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:grayscale"
                >
                    <div className="flex items-center justify-center gap-2">
                        <Send className="w-3 h-3" />
                        Transmit
                    </div>
                </button>
            </div>
        </div>
    );
};
