import 'server-only';
import { createHash } from 'node:crypto';
import { validPdfEdges } from '@epapers/server/modules/uploads/service';
export interface ScanResult {
    clean: boolean;
    sha256Hex: string;
    pageCount: number | null;
    reason?: string;
}
export interface ScanProvider {
    scan(stream: AsyncIterable<Uint8Array>, expectedSize: number): Promise<ScanResult>;
}
/** Structural validation hook. Deployments can supply an antivirus adapter implementing ScanProvider. */
export class StructuralPdfScanner implements ScanProvider {
    async scan(stream: AsyncIterable<Uint8Array>, expectedSize: number): Promise<ScanResult> {
        const hash = createHash('sha256');
        let size = 0, carry = '', unsafe = false, pages = 0, first = Buffer.alloc(0), tail = Buffer.alloc(0);
        for await (const chunk of stream) {
            size += chunk.byteLength;
            if (size > expectedSize)
                throw new Error('Object size changed');
            hash.update(chunk);
            if (first.length < 1024)
                first = Buffer.concat([first, Buffer.from(chunk)]).subarray(0, 1024);
            tail = Buffer.concat([tail, Buffer.from(chunk)]).subarray(-1024);
            const text = carry + Buffer.from(chunk).toString('latin1');
            const normalized = text.replace(/#([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
            unsafe ||= /\/(?:JavaScript|JS|Launch|EmbeddedFiles|EmbeddedFile)(?=[\s/<>[\](){}%]|$)/.test(normalized);
            // Count completed matches only, preserving a boundary window for split tokens.
            const cutoff = Math.max(0, text.length - 128);
            for (const match of text.matchAll(/\/Type\s*\/Page(?=[\s/<>[\](){}%])/g))
                if (match.index < cutoff)
                    pages++;
            carry = text.slice(cutoff);
        }
        pages += [...carry.matchAll(/\/Type\s*\/Page(?=[\s/<>[\](){}%])/g)].length;
        const clean = size === expectedSize && validPdfEdges(first, tail) && !unsafe;
        return { clean, sha256Hex: hash.digest('hex'), pageCount: pages || null, ...(!clean ? { reason: 'PDF failed structural safety validation' } : {}) };
    }
}
export const scanProvider: ScanProvider = new StructuralPdfScanner();
