import React, { useState } from 'react';
import { Send, Hash } from 'lucide-react';

interface CommitBoxProps {
    onCommit: (message: string) => void;
}

const PREFIXES = [
    { id: 'feat', label: 'Feat', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    { id: 'fix', label: 'Fix', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    { id: 'sty', label: 'Style', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'ref', label: 'Refactor', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { id: 'perf', label: 'Perf', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'cho', label: 'Chore', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

export const CommitBox: React.FC<CommitBoxProps> = ({ onCommit }) => {
    const [message, setMessage] = useState('');
    const [selectedPrefix, setSelectedPrefix] = useState('feat');

    const handleCommit = () => {
        if (!message) return;
        onCommit(`${selectedPrefix}: ${message}`);
        setMessage('');
    };

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-blue-500/20">
                    <Hash className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Conventional Architect</h3>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                {PREFIXES.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setSelectedPrefix(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all
                            ${selectedPrefix === p.id ? p.color : 'bg-transparent text-gray-500 border-white/5 hover:border-white/20'}
                        `}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="relative group">
                <div className="absolute top-1/2 -translate-y-1/2 left-4 text-blue-400/50 font-mono text-xs">
                    {selectedPrefix}:
                </div>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Apa yang kamu lakukan?"
                    className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-14 pr-4 text-sm focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600"
                    onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                />
            </div>

            <button
                onClick={handleCommit}
                disabled={!message}
                className={`w-full mt-4 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all
                    ${message ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40' : 'bg-white/5 text-gray-600 cursor-not-allowed'}
                `}
            >
                <Send className="w-4 h-4" /> COMMIT CHANGE
            </button>
        </div>
    );
};
