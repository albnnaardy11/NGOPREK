import React from 'react';

export interface FileItem {
    path: string;
    status: 'modified' | 'staged' | 'untracked' | 'deleted' | 'added';
}

interface FileManagerProps {
    files: FileItem[];
    onAdd: (path: string) => void;
    onUnstage: (path: string) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({ files, onAdd, onUnstage }) => {
    const staged = files.filter(f => f.status === 'staged');
    const modified = files.filter(f => f.status !== 'staged');

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Working Directory</span>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#39ff14]" />
                </div>
            </div>

            <div className="space-y-4">
                {/* Staged */}
                <div>
                    <div className="text-[9px] font-bold text-green-500 mb-2 tracking-tighter uppercase">Staged ({staged.length})</div>
                    <div className="space-y-1">
                        {staged.map((f) => (
                            <div key={f.path} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-all group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-1.5 h-1.5 rounded-sm bg-green-500" />
                                    <span className="text-[10px] text-gray-400 truncate font-mono">{f.path}</span>
                                </div>
                                <button onClick={() => onUnstage(f.path)} className="text-[9px] text-red-500 font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-all">
                                    Unst
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modified */}
                <div>
                    <div className="text-[9px] font-bold text-yellow-500 mb-2 tracking-tighter uppercase">Modified ({modified.length})</div>
                    <div className="space-y-1">
                        {modified.map((f) => (
                            <div key={f.path} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-all group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-1.5 h-1.5 rounded-sm bg-yellow-500" />
                                    <span className="text-[10px] text-gray-400 truncate font-mono">{f.path}</span>
                                </div>
                                <button onClick={() => onAdd(f.path)} className="text-[9px] text-green-500 font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-all">
                                    Add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
