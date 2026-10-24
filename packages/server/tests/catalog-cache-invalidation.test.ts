import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { route } from '@/lib/routes-helpers';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('@epapers/server/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@epapers/server/lib/write-policy', () => ({ enforceWritePolicy: vi.fn() }));

function request(dryRun: boolean) {
    return new NextRequest('https://app.example.com/api/v1/admin/modules/import', {
        method: 'POST',
        headers: {
            Origin: 'https://app.example.com',
            'X-EPapers-Client': 'web',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
    });
}

describe('catalogue cache invalidation', () => {
    beforeEach(() => vi.clearAllMocks());

    it('expires structure data only after a successful real write', async () => {
        const action = vi.fn(async () => ({ importedCount: 1 }));
        const handler = route(
            'admin/modules/import',
            z.object({ dryRun: z.boolean() }),
            action,
            false,
            false,
            { tag: 'public-catalogue-structure', when: data => !data.dryRun },
        );

        expect((await handler(request(true))).status).toBe(200);
        expect(revalidateTag).not.toHaveBeenCalled();
        expect((await handler(request(false))).status).toBe(200);
        expect(revalidateTag).toHaveBeenCalledExactlyOnceWith(
            'public-catalogue-structure',
            { expire: 0 },
        );
    });

    it('keeps cached structure when the write fails', async () => {
        const handler = route(
            'admin/modules/import',
            z.object({ dryRun: z.boolean() }),
            async () => { throw new Error('Database write failed'); },
            false,
            false,
            { tag: 'public-catalogue-structure' },
        );

        expect((await handler(request(false))).status).toBe(500);
        expect(revalidateTag).not.toHaveBeenCalled();
    });
});
