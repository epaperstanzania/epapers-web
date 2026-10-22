import { describe, it, expect, vi, afterEach } from 'vitest';
import { StructuralPdfScanner } from '@epapers/server/modules/uploads/scan';
import { validPdfEdges } from '@epapers/server/modules/uploads/service';
import { cachedDownload, invalidateDownloads } from '@epapers/server/lib/download-cache';
import { storage } from '@epapers/server/lib/storage';
import { uploadSchemas } from '@epapers/server/modules/uploads/schemas';
import { moderationSchemas } from '@epapers/server/modules/moderation/schemas';
async function* chunks(text: string, width = 7) { const b = Buffer.from(text); for (let i = 0; i < b.length; i += width)
    yield b.subarray(i, i + width); }
afterEach(() => vi.useRealTimers());
describe('PDF validation and signed URLs', () => {
    it('validates versions, limited leading whitespace, and final EOF', () => { expect(validPdfEdges(Buffer.from(' %PDF-2.0\n'), Buffer.from('%%EOF\n'))).toBe(true); for (const text of ['<html>', '%PDF-1.9\n', '         %PDF-1.7\n'])
        expect(validPdfEdges(Buffer.from(text), Buffer.from('%%EOF'))).toBe(false); expect(validPdfEdges(Buffer.from('%PDF-1.7\n'), Buffer.from('truncated'))).toBe(false); });
    it('streams SHA256 and finds split/encoded dangerous names', async () => {
        const safe = '%PDF-1.7\n /Type /Page \n%%EOF\n';
        const scanner = new StructuralPdfScanner();
        const result = await scanner.scan(chunks(safe), Buffer.byteLength(safe));
        expect(result).toMatchObject({ clean: true, pageCount: 1 });
        expect(result.sha256Hex).toHaveLength(64);
        for (const name of ['/JavaScript', '/J#53', '/Launch', '/EmbeddedFile']) {
            const text = '%PDF-1.7\n' + name + ' () \n%%EOF';
            expect((await scanner.scan(chunks(text), Buffer.byteLength(text))).clean).toBe(false);
        }
        await expect(scanner.scan(chunks(safe), 1)).rejects.toThrow();
    });
    it('signs PUT content type, length and create-only condition with five minute expiry', async () => { const url = new URL(await storage.presign('incoming', 'incoming/test/file.pdf', 123)); expect(url.searchParams.get('X-Amz-Expires')).toBe('300'); expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length'); expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type'); expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('if-none-match'); });
    it('reuses eight-minute URLs, resigns, and invalidates', async () => {
        vi.useFakeTimers();
        const sign = vi.fn().mockResolvedValue('https://signed.invalid');
        const id = crypto.randomUUID();
        await cachedDownload(id, 'exam', sign);
        vi.advanceTimersByTime(479000);
        await cachedDownload(id, 'exam', sign);
        expect(sign).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1001);
        await cachedDownload(id, 'exam', sign);
        expect(sign).toHaveBeenCalledTimes(2);
        invalidateDownloads(id);
        await cachedDownload(id, 'exam', sign);
        expect(sign).toHaveBeenCalledTimes(3);
    });
    it('rejects upload spoofing and moderation without reasons', () => { expect(() => uploadSchemas.presign.parse({ filename: 'avatar.png', sizeBytes: 12, contentType: 'image/png' })).toThrow(); expect(() => uploadSchemas.create.parse({ status: 'APPROVED' })).toThrow(); expect(() => moderationSchemas.review.parse({ action: 'rejected' })).toThrow(); expect(() => moderationSchemas.review.parse({ action: 'approved', xp: -50 })).toThrow(); });
});
