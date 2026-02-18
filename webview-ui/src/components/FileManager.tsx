import React from 'react';
import { FileText, FilePlus, HardDrive, Trash2 } from 'lucide-react';

export interface FileItem {
    path: string;
    staged: boolean;
}

interface FileManagerProps {
    files: FileItem[];
    onAdd: (path: string) => void;
    onUnstage: (path: string) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({ files, onAdd, onUnstage }) => {
    const staged = files.filter(f => f.staged);
    const modified = files.filter(f => !f.staged);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 mb-2 px-2">
                <HardDrive className="w-4 h-4 text-neon-cyan" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Working Tree</h3>
            </div>

            <div className="space-y-3">
                {/* Staged */}
                <div className="glass-panel rounded-xl p-3 overflow-hidden relative border-l-2 border-l-neon-green/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-neon-green uppercase tracking-widest">Staged ({staged.length})</span>
                    </div>
                    <div className="max-h-[120px] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                        {staged.length === 0 && <div className="text-[9px] text-gray-700 italic py-2">No files staged</div>}
                        {staged.map(f => (
                            <div key={f.path} className="group flex items-center justify-between p-1.5 hover:bg-white/5 rounded-md transition-all">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="w-3 h-3 text-neon-green/80 flex-shrink-0" />
                                    <span className="text-[10px] text-gray-400 truncate">{f.path}</span>
                                </div>
                                <button onClick={() => onUnstage(f.path)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all">
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modified */}
                <div className="glass-panel rounded-xl p-3 overflow-hidden relative border-l-2 border-l-yellow-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Modified ({modified.length})</span>
                    </div>
                    <div className="max-h-[120px] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                        {modified.length === 0 && <div className="text-[9px] text-gray-700 italic py-2">Clean working tree</div>}
                        {modified.map(f => (
                            <div key={f.path} className="group flex items-center justify-between p-1.5 hover:bg-white/5 rounded-md transition-all">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FilePlus className="w-3 h-3 text-yellow-500/80 flex-shrink-0" />
                                    <span className="text-[10px] text-gray-400 truncate">{f.path}</span>
                                </div>
                                <button onClick={() => onAdd(f.path)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neon-cyan/20 rounded transition-all">
                                    <FilePlus className="w-3 h-3 text-neon-cyan" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
