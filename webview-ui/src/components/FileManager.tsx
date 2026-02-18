import React, { useState } from 'react';
import { Plus, Minus, FileCode, CheckCircle2, AlertCircle, Search } from 'lucide-react';

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
    const [search, setSearch] = useState('');

    const filteredFiles = files.filter(f => f.path.toLowerCase().includes(search.toLowerCase()));
    const staged = filteredFiles.filter(f => f.status === 'staged');
    const modified = filteredFiles.filter(f => f.status !== 'staged');

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Unified Search Box */}
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                    type="text"
                    placeholder="Filter changes..."
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[11px] focus:border-blue-500/30 outline-none transition-all placeholder:text-gray-600 backdrop-blur-md"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="flex-grow overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                {/* Staged Section (Green Table Style) */}
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                           <CheckCircle2 className="w-3 h-3 text-green-500" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-green-500/70">Staged Files</span>
                        </div>
                        <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-[9px] font-bold">{staged.length}</span>
                    </div>
                    <div className="grid gap-1">
                        {staged.length === 0 && <div className="text-[10px] text-gray-700 italic px-2">No staged changes</div>}
                        {staged.map((f) => (
                            <div key={f.path} className="group flex items-center justify-between p-2 rounded-xl bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 hover:border-green-500/30 transition-all">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="p-1 rounded bg-green-500/10">
                                        <FileCode className="w-3 h-3 text-green-400 flex-shrink-0" />
                                    </div>
                                    <span className="text-[11px] text-gray-200 truncate font-mono">{f.path}</span>
                                </div>
                                <button 
                                    onClick={() => onUnstage(f.path)} 
                                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all"
                                    title="Unstage file"
                                >
                                    <Minus className="w-3 h-3 text-red-500" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modified Section (Yellow Table Style) */}
                <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                           <AlertCircle className="w-3 h-3 text-yellow-500" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/70">Modified Files</span>
                        </div>
                        <span className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full text-[9px] font-bold">{modified.length}</span>
                    </div>
                    <div className="grid gap-1">
                        {modified.length === 0 && <div className="text-[10px] text-gray-700 italic px-2">Working directory clean</div>}
                        {modified.map((f) => (
                            <div key={f.path} className="group flex items-center justify-between p-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-500/10 hover:border-yellow-500/30 transition-all">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="p-1 rounded bg-yellow-500/10">
                                        <FileCode className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                    </div>
                                    <span className="text-[11px] text-gray-200 truncate font-mono">{f.path}</span>
                                </div>
                                <button 
                                    onClick={() => onAdd(f.path)} 
                                    className="p-1.5 bg-green-500/10 hover:bg-green-500/30 rounded-lg transition-all"
                                    title="Add to stage"
                                >
                                    <Plus className="w-3 h-3 text-green-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
