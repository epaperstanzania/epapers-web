import { describe, expect, it } from 'vitest';
import { moderationSchemas } from '@epapers/server/modules/moderation/schemas';

const base = { moduleId: '6f61b924-f247-4f6e-8247-b5eebde36c88', academicYear: 2024, wantsMarkingScheme: false, description: '' };

describe('paper request input', () => {
  it('requires a test number for tests only', () => {
    expect(moderationSchemas.paperRequests.safeParse({ ...base, category: 'TEST', testNumber: 1 }).success).toBe(true);
    expect(moderationSchemas.paperRequests.safeParse({ ...base, category: 'TEST' }).success).toBe(false);
    expect(moderationSchemas.paperRequests.safeParse({ ...base, category: 'UE', testNumber: 1 }).success).toBe(false);
    expect(moderationSchemas.paperRequests.safeParse({ ...base, category: 'UE' }).success).toBe(true);
  });
});
