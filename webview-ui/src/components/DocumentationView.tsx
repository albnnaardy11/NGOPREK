import React, { useState } from 'react';
import { 
    BookOpen, 
    ChevronRight, 
    Cloud, 
    GitBranch, 
    Zap, 
    AlertTriangle, 
    History,
    Code
} from 'lucide-react';

interface GuideLevel {
    title: string;
    level: string;
    icon: any;
    color: string;
    commands: {
        cmd: string;
        desc: string;
        proTip?: string;
    }[];
}

const levels: GuideLevel[] = [
    {
        title: 'The Foundation',
        level: 'LEVEL 01',
        icon: BookOpen,
        color: 'neon-cyan',
        commands: [
            { cmd: 'git init', desc: 'Membuat "jantung" Git di folder (folder .git).' },
            { cmd: 'git status', desc: 'Cek kondisi terkini. Siapa yang berubah?' },
            { cmd: 'git add <file>', desc: 'Memasukkan perubahan ke Staging Area.' },
            { cmd: 'git commit -m "pesan"', desc: 'Menyimpan snapshot permanen ke sejarah.' },
            { cmd: 'git log', desc: 'Melihat daftar checkpoint yang pernah dibuat.' }
        ]
    },
    {
        title: 'The Bridge',
        level: 'LEVEL 02',
        icon: Cloud,
        color: 'neon-cyan',
        commands: [
            { cmd: 'git remote add origin <url>', desc: 'Menghubungkan lokal dengan remote server.' },
            { cmd: 'git push', desc: 'Mengirimkan rekaman lokal ke server.' },
            { cmd: 'git pull', desc: 'Mengambil dan menggabungkan perubahan dari server.' },
            { cmd: 'git clone', desc: 'Menyalin seluruh proyek dari server ke komputer.' }
        ]
    },
    {
        title: 'Parallel Universes',
        level: 'LEVEL 03',
        icon: GitBranch,
        color: 'neon-cyan',
        commands: [
            { cmd: 'git branch <nama>', desc: 'Membuat jalur kerja baru.' },
            { cmd: 'git checkout -b <nama>', desc: 'Buat branch baru dan langsung pindah.' },
            { cmd: 'git merge <nama>', desc: 'Menggabungkan hasil kerja ke branch utama.' }
        ]
    },
    {
        title: 'The Time Traveler',
        level: 'LEVEL 04',
        icon: Zap,
        color: 'neon-pink',
        commands: [
            { cmd: 'git rebase', desc: 'Menempelkan pekerjaan di atas perubahan terbaru secara linear.', proTip: 'Membuat sejarah lurus dan bersih.' },
            { cmd: 'git cherry-pick <hash>', desc: 'Mengambil satu commit spesifik tanpa menggabungkan seluruh branch.' },
            { cmd: 'git stash', desc: 'Menyimpan perubahan sementara di loker rahasia.' }
        ]
    },
    {
        title: 'The Eraser',
        level: 'LEVEL 05',
        icon: AlertTriangle,
        color: 'neon-pink',
        commands: [
            { cmd: 'git commit --amend', desc: 'Mengubah pesan atau menambahkan file ke commit terakhir.' },
            { cmd: 'git reset --hard HEAD~1', desc: 'Membatalkan commit dan menghapus perubahan secara permanen.', proTip: 'Gunakan dengan sangat hati-hati!' },
            { cmd: 'git reflog', desc: 'Blackbox pesawat tempur. Menampilkan semua pergerakan HEAD.', proTip: 'Penyelamat nyawa terakhir.' }
        ]
    }
];

export const DocumentationView: React.FC = () => {
    const [selectedLevel, setSelectedLevel] = useState<number>(0);

    return (
        <div className="flex-grow h-full bg-[#08080a] p-12 overflow-y-auto custom-scrollbar flex flex-col gap-10">
            {/* Header */}
            <div className="flex items-end justify-between border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                            <BookOpen className="w-6 h-6 text-neon-cyan neon-text-cyan" />
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-[0.4em] text-white">NGOPREK_GUIDE</h1>
                    </div>
                    <p className="text-gray-500 text-[12px] font-mono tracking-widest pl-1">SYSTEM_MANUAL // v1.5.0 // FROM_NOOB_TO_PRO</p>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                    <History className="w-4 h-4 text-gray-600" />
                    <span className="text-[11px] font-black uppercase text-gray-500 tracking-[0.2em]">Matrix Updated</span>
                </div>
            </div>

            <div className="flex gap-12 flex-grow min-h-0 pb-4">
                {/* Level Selector */}
                <div className="w-72 flex flex-col gap-4">
                    {levels.map((level, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedLevel(i)}
                            className={`group relative p-5 rounded-[2rem] border transition-all duration-500 text-left
                                ${selectedLevel === i 
                                    ? `bg-${level.color}/10 border-${level.color}/40 shadow-[0_0_30px_rgba(0,242,255,0.08)] scale-[1.02]` 
                                    : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10 hover:translate-x-1'}
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg transition-colors ${selectedLevel === i ? `bg-${level.color}/20` : 'bg-white/5'}`}>
                                    <level.icon className={`w-5 h-5 ${selectedLevel === i ? `text-${level.color} neon-text-${level.color}` : 'text-gray-600 group-hover:text-gray-400'}`} />
                                </div>
                                <div>
                                    <div className={`text-[9px] font-black tracking-[0.2em] uppercase mb-1 ${selectedLevel === i ? `text-${level.color}` : 'text-gray-700'}`}>
                                        {level.level}
                                    </div>
                                    <div className={`text-[13px] font-black tracking-wide ${selectedLevel === i ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`}>
                                        {level.title}
                                    </div>
                                </div>
                            </div>
                            {selectedLevel === i && (
                                <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-${level.color} shadow-[0_0_15px_#00f2ff] animate-pulse`} />
                            )}
                        </button>
                    ))}

                    <div className="mt-auto p-6 glass-panel rounded-[2rem] border-dashed border-2 border-white/5 bg-gradient-to-br from-transparent to-white/2">
                        <div className="flex items-center gap-2.5 mb-3">
                            <Code className="w-4 h-4 text-neon-green" />
                            <span className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em]">Neural Hint</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed italic pr-2">
                            "Atomic Commits" menjaga integritas snapshot dan memudahkan pelacakan di Visualizer.
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow glass-panel rounded-[3rem] p-10 border-white/5 relative overflow-hidden flex flex-col gap-8 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-[1.5rem] bg-${levels[selectedLevel].color}/10 border border-${levels[selectedLevel].color}/30 shadow-lg`}>
                                {React.createElement(levels[selectedLevel].icon, { className: `w-8 h-8 text-${levels[selectedLevel].color}` })}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-white">{levels[selectedLevel].title}</h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className={`text-[10px] font-mono uppercase tracking-[0.3em] px-2 py-0.5 rounded bg-${levels[selectedLevel].color}/20 text-${levels[selectedLevel].color}`}>
                                        DIRECTIVE_{levels[selectedLevel].level.replace(' ', '_')}
                                    </span>
                                    <div className="h-px w-20 bg-white/5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow grid grid-cols-1 gap-5 overflow-y-auto custom-scrollbar pr-4 -mr-2">
                        {levels[selectedLevel].commands.map((c, i) => (
                            <div key={i} className="group p-6 bg-black/40 rounded-[2rem] border border-white/5 hover:border-white/20 hover:bg-black/60 transition-all duration-300">
                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-neon-cyan/50 shadow-[0_0_8px_#00f2ff]" />
                                            <code className="text-[15px] font-mono text-neon-cyan font-black bg-neon-cyan/5 px-3 py-1 rounded-lg border border-neon-cyan/20 group-hover:scale-105 transition-transform inline-block">
                                                {c.cmd}
                                            </code>
                                        </div>
                                        <p className="text-gray-400 text-[13px] leading-relaxed pl-5 border-l border-white/5">
                                            {c.desc}
                                        </p>
                                        {c.proTip && (
                                            <div className="mt-4 ml-5 flex items-center gap-3 px-4 py-3 bg-neon-pink/5 border border-neon-pink/10 rounded-2xl relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-neon-pink/40" />
                                                <Zap className="w-4 h-4 text-neon-pink" />
                                                <span className="text-[11px] text-neon-pink font-black uppercase tracking-widest">Master Note: {c.proTip}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button className="p-3 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:scale-110">
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Warning */}
                    <div className="mt-auto p-5 bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-[1.5rem] flex items-center gap-5">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-[11px] text-yellow-500/90 font-black uppercase tracking-widest mb-1">Safety Advisory</p>
                            <p className="text-[11px] text-yellow-500/70 font-medium">
                                Operasi destruktif terdeteksi di level ini. Pastikan Stage dibersihkan sebelum eksekusi.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
