import * as vscode from 'vscode';

export interface Tidbit {
    title: string;
    content: string;
    type: 'info' | 'success' | 'warning';
}

export class EducationalEngine {
    private static tidbits: Record<string, Tidbit> = {
        'add': {
            title: 'Hashing Biner (SHA-1)',
            content: 'Git baru saja membuat SHA-1 hash untuk file ini. File Anda sekarang disimpan sebagai "Blob" di dalam folder .git/objects. Git tidak peduli nama filenya, ia hanya peduli pada isinya!',
            type: 'info'
        },
        'commit': {
            title: 'Snapshot Permanen Locked!',
            content: 'Commit dibuat! Git menyatukan "Tree" (struktur folder) dengan pesan Anda menjadi satu "Commit Object". Ini adalah titik sejarah yang permanen dan tidak bisa diubah (immutable).',
            type: 'success'
        },
        'ghost': {
            title: 'Hantu Commit Ditemukan!',
            content: 'Ini adalah hantu dari masa lalu. Commit ini terhapus atau tertinggal saat Anda melakukan reset atau checkout. Berkat Reflog, kita bisa membangkitkannya kembali!',
            type: 'warning'
        }
    };

    public static getTidbit(action: 'add' | 'commit' | 'ghost'): Tidbit {
        return this.tidbits[action];
    }

    public static sendTidbit(panel: any, action: 'add' | 'commit' | 'ghost') {
        const tidbit = this.getTidbit(action);
        panel.sendMessage({
            command: 'educationalTidbit',
            ...tidbit
        });
    }
}
