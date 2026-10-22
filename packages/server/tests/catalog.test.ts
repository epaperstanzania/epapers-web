import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { cors } from '@/lib/routes-helpers';
import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
import { modules, cursorId, papers } from '@epapers/server/modules/catalog/service';
import { db } from '@epapers/database';
describe('catalog filtering and caching', () => {
    it('filters active ancestors and program/semester together', async () => {
        const read = vi.spyOn(db.module, 'findMany').mockResolvedValue([]);
        const programId = crypto.randomUUID(), departmentId = crypto.randomUUID();
        await modules(catalogSchemas.modules.parse({ programId, departmentId, semester: '2' }));
        expect(read.mock.calls[0][0]?.where).toMatchObject({ programId, semester: 2, deletedAt: null, program: { departmentId, deletedAt: null, department: { deletedAt: null, isActive: true } } });
        read.mockRestore();
    });
    it('rejects unknown filters and oversized limits/cursors', () => {
        expect(() => catalogSchemas.papers.parse({ status: 'PENDING' })).toThrow();
        expect(() => catalogSchemas.papers.parse({ limit: 101 })).toThrow();
        expect(() => cursorId('broken')).toThrow();
    });
    it('ranks popular papers by downloads, views, and recency', async () => {
        const read = vi.spyOn(db.paper, 'findMany').mockResolvedValue([]);
        await papers(catalogSchemas.papers.parse({ sortBy: 'popular' }));
        expect(read.mock.calls[0][0]?.orderBy).toEqual([
            { downloadsCount: 'desc' },
            { viewsCount: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' },
        ]);
        read.mockRestore();
    });
    it('only caches successful public responses', () => {
        const req = new NextRequest('https://api.example.com/api/v1/papers');
        expect(cors(req, NextResponse.json({ data: [] }), true).headers.get('cache-control')).toContain('s-maxage=300');
        expect(cors(req, NextResponse.json({ error: {} }, { status: 404 }), true).headers.get('cache-control')).toBe('no-store');
        expect(cors(req, NextResponse.json({ data: [] }), false).headers.get('cache-control')).toBe('no-store');
    });
});
