import 'server-only';
const entries = new Map<string, {
    url: string;
    at: number;
}>();
export async function cachedDownload(fileId: string, kind: string, sign: () => Promise<string>) {
    const key = fileId + ':' + kind, entry = entries.get(key);
    if (entry && Date.now() - entry.at < 480000) {
        entries.delete(key);
        entries.set(key, entry);
        return { url: entry.url, expiresAt: new Date(entry.at + 600000).toISOString() };
    }
    const at = Date.now(), url = await sign();
    entries.delete(key);
    entries.set(key, { url, at });
    while (entries.size > 500)
        entries.delete(entries.keys().next().value!);
    return { url, expiresAt: new Date(at + 600000).toISOString() };
}
export function invalidateDownloads(...ids: (string | null)[]) { for (const key of entries.keys())
    if (ids.some(id => id && key.startsWith(id + ':')))
        entries.delete(key); }
