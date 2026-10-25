import 'server-only';
import { Prisma, PrismaClient } from '@prisma/client';
import { withRetry } from '@epapers/database/retry';
export { withRetry } from '@epapers/database/retry';
const globalDb = globalThis as unknown as {
    prisma?: PrismaClient;
};
// Reuse one client per warm serverless instance and across development reloads.
const raw = globalDb.prisma ?? (globalDb.prisma = new PrismaClient());
const softModels = new Set(['User', 'Department', 'Program', 'Module', 'Paper', 'Announcement', 'ModuleRequest']);
export const db = raw.$extends({ query: { $allModels: { async $allOperations({ model, operation, args, query }) {
                if (softModels.has(model) && ['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', 'update', 'updateMany'].includes(operation)) {
                    const a = args as {
                        where?: Record<string, unknown>;
                    };
                    const original = a.where ?? {};
                    a.where = ['findUnique', 'findUniqueOrThrow', 'update'].includes(operation)
                        ? { ...original, deletedAt: null }
                        : { AND: [original, { deletedAt: null }] };
                }
                return query(args);
            } } } });
/** Restricted escape hatch for admin restore/purge only. */
export function withDeleted() { return raw; }
export type TransactionClient = Omit<typeof db, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
export async function withTransactionRetry<T>(operation: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return withRetry(() => db.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 }));
}
