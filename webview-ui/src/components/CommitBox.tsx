import { useState } from 'react';

interface CommitBoxProps {
    onCommit: (message: string) => void;
}

const PREFIXES = [
    { id: 'feat', label: 'Feat', color: 'border-green-500 text-green-500' },
    { id: 'fix', label: 'Fix', color: 'border-red-500 text-red-500' },
    { id: 'ref', label: 'Ref', color: 'border-yellow-500 text-yellow-500' },
    { id: 'perf', label: 'Perf', color: 'border-blue-500 text-blue-500' },
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
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Commit Architect</span>
                <div className="w-10 h-1 bg-white/5 rounded-full" />
            </div>

            <div className="flex gap-3 justify-center py-2">
                {PREFIXES.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setSelectedPrefix(p.id)}
                        className={`w-9 h-9 rounded-full border-2 text-[8px] font-black uppercase transition-all flex items-center justify-center
                            ${selectedPrefix === p.id ? `${p.color} bg-white/5 shadow-[0_0_10px_currentColor]` : 'border-white/10 text-gray-600 hover:border-white/30'}
                        `}
                    >
                        {p.id}
                    </button>
                ))}
            </div>

            <div className="bg-black/40 border border-white/5 rounded-xl p-3 backdrop-blur-md">
                <div className="text-[9px] font-mono text-blue-400/50 mb-1 uppercase tracking-tighter">
                   Message for {selectedPrefix}:
                </div>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter commit details..."
                    className="w-full bg-transparent text-sm focus:outline-none placeholder:text-gray-700 font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                />
            </div>

            <button
                onClick={handleCommit}
                disabled={!message}
                className={`group relative w-full h-12 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all overflow-hidden
                    ${message ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:scale-[1.02]' : 'bg-white/5 text-gray-600 cursor-not-allowed'}
                `}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                Commit
            </button>
        </div>
    );
};
