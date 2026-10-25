import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../packages/database/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const apply = process.argv.includes('--apply');
const sync = process.argv.includes('--sync');
const verify = process.argv.includes('--verify');
if ([apply, sync, verify].filter(Boolean).length > 1) throw new Error('Choose one of --apply, --sync or --verify');

function localValue(file, key) {
  try {
    const line = readFileSync(new URL(file, import.meta.url), 'utf8').split(/\r?\n/)
      .find(entry => new RegExp(`^\\s*${key}\\s*=`).test(entry));
    const value = line?.slice(line.indexOf('=') + 1).trim();
    return value?.replace(/^(['"])(.*)\1$/, '$2');
  } catch {
    return undefined;
  }
}

const sourceUrl = process.env.SOURCE_DATABASE_URL || localValue('../apps/web/.env.local', 'LEGACY_DATABASE_URL');
const targetUrl = process.env.DIRECT_URL || localValue('../.env.local', 'DIRECT_URL');
if (!sourceUrl || !targetUrl) throw new Error('Set SOURCE_DATABASE_URL and DIRECT_URL before importing data');
const sourceHost = new URL(sourceUrl).hostname;
const targetHost = new URL(targetUrl).hostname;
if (!sourceHost.endsWith('.cockroachlabs.cloud') || !targetHost.endsWith('.supabase.com'))
  throw new Error('Expected a CockroachDB source and Supabase destination');

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });
const quote = name => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error('Unexpected database identifier');
  return `"${name}"`;
};
const tableListSql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name";
const columnListSql = "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position";
const primaryKeySql = `SELECT tc.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name=tc.constraint_name AND kcu.table_schema=tc.table_schema
  WHERE tc.table_schema='public' AND tc.constraint_type='PRIMARY KEY'
  ORDER BY tc.table_name, kcu.ordinal_position`;
const foreignKeySql = `SELECT child.relname AS child, parent.relname AS parent,
    attribute.attname AS column_name, attribute.attnotnull AS required
  FROM pg_constraint constraint_row
  JOIN pg_class child ON child.oid=constraint_row.conrelid
  JOIN pg_class parent ON parent.oid=constraint_row.confrelid
  JOIN LATERAL unnest(constraint_row.conkey) AS key_column(attnum) ON true
  JOIN pg_attribute attribute ON attribute.attrelid=child.oid AND attribute.attnum=key_column.attnum
  WHERE constraint_row.contype='f' AND constraint_row.connamespace='public'::regnamespace`;

function group(rows, key, value) {
  const result = new Map();
  for (const row of rows) {
    if (!result.has(row[key])) result.set(row[key], []);
    result.get(row[key]).push(row[value]);
  }
  return result;
}

function orderTables(tables, foreignKeys) {
  const remaining = new Set(tables);
  const ordered = [];
  while (remaining.size) {
    const next = [...remaining].find(table => !foreignKeys.some(fk =>
      fk.child === table && fk.required && remaining.has(fk.parent)));
    if (!next) throw new Error('Required foreign-key cycle requires a manual import plan');
    ordered.push(next);
    remaining.delete(next);
  }
  return ordered;
}

function json(value) {
  return JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);
}

function canonical(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === 'object' && value.constructor?.name === 'Decimal') return value.toString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

function fingerprint(rows) {
  return createHash('sha256').update(JSON.stringify(canonical(rows))).digest('hex');
}

async function insertRows(tx, table, columns, primaryKey, rows) {
  if (!rows.length) return;
  const names = columns.map(quote).join(', ');
  const conflict = primaryKey.map(quote).join(', ');
  const updates = columns.filter(column => !primaryKey.includes(column))
    .map(column => `${quote(column)}=EXCLUDED.${quote(column)}`).join(', ');
  const sql = `INSERT INTO public.${quote(table)} (${names})
    SELECT ${names} FROM jsonb_populate_recordset(NULL::public.${quote(table)}, $1::jsonb)
    ON CONFLICT (${conflict}) ${updates ? `DO UPDATE SET ${updates}` : 'DO NOTHING'}`;
  for (let start = 0; start < rows.length; start += 200)
    await tx.$executeRawUnsafe(sql, json(rows.slice(start, start + 200)));
}

async function main() {
  const [sourceTables, targetTables, sourceColumns, targetColumns, primaryKeys, foreignKeys] = await Promise.all([
    source.$queryRawUnsafe(tableListSql), target.$queryRawUnsafe(tableListSql),
    source.$queryRawUnsafe(columnListSql), target.$queryRawUnsafe(columnListSql),
    target.$queryRawUnsafe(primaryKeySql), target.$queryRawUnsafe(foreignKeySql),
  ]);
  const tables = sourceTables.map(row => row.table_name).filter(name => name !== '_prisma_migrations');
  const targetNames = new Set(targetTables.map(row => row.table_name));
  if (tables.some(name => !targetNames.has(name))) throw new Error('Source has a table missing in Supabase');
  if (!targetNames.has('oauth_identities')) throw new Error('Supabase schema migration is incomplete');

  const sourceFields = group(sourceColumns, 'table_name', 'column_name');
  const targetFields = group(targetColumns, 'table_name', 'column_name');
  const keys = group(primaryKeys, 'table_name', 'column_name');
  const columns = new Map();
  for (const table of tables) {
    const available = new Set(sourceFields.get(table));
    const common = targetFields.get(table).filter(name => available.has(name));
    const missing = targetFields.get(table).filter(name => !available.has(name));
    if (missing.length || !(keys.get(table)?.length))
      throw new Error(`Schema mismatch in ${table}: ${missing.join(', ') || 'missing primary key'}`);
    columns.set(table, common);
  }
  const ordered = orderTables(tables, foreignKeys);
  const snapshot = await source.$transaction(async tx => {
    const data = new Map();
    for (const table of ordered) {
      const names = columns.get(table).map(quote).join(', ');
      const order = keys.get(table).map(quote).join(', ');
      data.set(table, await tx.$queryRawUnsafe(`SELECT ${names} FROM public.${quote(table)} ORDER BY ${order}`));
    }
    return data;
  }, { timeout: 120_000 });
  console.log(`Source snapshot: ${ordered.length} tables, ${[...snapshot.values()].reduce((sum, rows) => sum + rows.length, 0)} rows`);
  if (verify) {
    const mismatches = [];
    for (const table of ordered) {
      const names = columns.get(table).map(quote).join(', ');
      const order = keys.get(table).map(quote).join(', ');
      const allTargetRows = await target.$queryRawUnsafe(`SELECT ${names} FROM public.${quote(table)} ORDER BY ${order}`);
      // The old worker refreshes its heartbeat while production still uses CockroachDB.
      const comparable = row => table !== 'app_settings' || row.key !== 'workerHeartbeat';
      const sourceRows = snapshot.get(table).filter(comparable);
      const targetRows = allTargetRows.filter(comparable);
      if (fingerprint(sourceRows) !== fingerprint(targetRows)) {
        mismatches.push(table);
        if (sourceRows.length === targetRows.length) {
          for (let index = 0; index < sourceRows.length; index++) {
            const different = columns.get(table).filter(column =>
              json(canonical(sourceRows[index][column])) !== json(canonical(targetRows[index][column])));
            if (different.length) {
              console.log(`Different columns in ${table} row ${index + 1}: ${different.join(', ')}`);
              break;
            }
          }
        } else console.log(`Different row counts in ${table}`);
      }
    }
    if (mismatches.length) throw new Error(`Verification differs in ${mismatches.join(', ')}`);
    console.log('Verified: all 28 table contents match, excluding the live worker heartbeat value.');
    return;
  }
  if (!apply && !sync) {
    console.log('Dry run complete. Pass --apply for an empty target or --sync during a write freeze.');
    return;
  }

  await target.$transaction(async tx => {
    const migrations = await tx.$queryRawUnsafe("SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL");
    if (!['0000_postgresql_baseline', '0001_supabase_api_permissions']
      .every(name => migrations.some(row => row.migration_name === name)))
      throw new Error('Apply both Prisma migrations before importing data');
    for (const table of ordered) {
      const count = await tx.$queryRawUnsafe(`SELECT count(*)::int AS count FROM public.${quote(table)}`);
      if (apply && count[0].count && !['app_settings', 'achievement_definitions'].includes(table))
        throw new Error(`Target ${table} is not empty; no data was imported`);
      if (sync && count[0].count) {
        const primary = keys.get(table);
        const keyColumns = primary.map(quote).join(', ');
        const targetKeys = await tx.$queryRawUnsafe(`SELECT ${keyColumns} FROM public.${quote(table)}`);
        const sourceKeys = new Set(snapshot.get(table).map(row => json(primary.map(key => row[key]))));
        const stale = targetKeys.filter(row => !sourceKeys.has(json(primary.map(key => row[key]))));
        if (stale.length && !['auth_challenges', 'admin_auth_challenges'].includes(table))
          throw new Error(`Target ${table} contains records absent from source; stop and reconcile before syncing`);
        // Challenge rows are short-lived and may expire between the first copy and cutover.
        for (const row of stale)
          await tx.$executeRawUnsafe(`DELETE FROM public.${quote(table)} WHERE "id"=$1::uuid`, row.id);
      }
    }

    const imported = new Set();
    for (const table of ordered) {
      const firstPass = snapshot.get(table).map(row => {
        const copy = { ...row };
        for (const fk of foreignKeys) {
          if (fk.child === table && !fk.required && !imported.has(fk.parent)) copy[fk.column_name] = null;
        }
        return copy;
      });
      await insertRows(tx, table, columns.get(table), keys.get(table), firstPass);
      imported.add(table);
    }
    // Restore optional links that pointed forward (including self-references).
    for (const table of ordered) {
      const deferred = foreignKeys.some(fk => fk.child === table && !fk.required);
      if (deferred) await insertRows(tx, table, columns.get(table), keys.get(table), snapshot.get(table));
      const count = await tx.$queryRawUnsafe(`SELECT count(*)::int AS count FROM public.${quote(table)}`);
      if (count[0].count !== snapshot.get(table).length)
        throw new Error(`Count mismatch in ${table}; transaction will roll back`);
    }
  }, { timeout: 180_000, maxWait: 10_000 });
  console.log('Import committed; every table count matches the source snapshot.');
}

try {
  await main();
} catch (error) {
  // Driver errors can contain connection details or row values; keep logs safe.
  const safeMessage = error instanceof Error && /^(Target |Count mismatch|Schema mismatch|Required foreign-key cycle|Verification differs)/.test(error.message)
    ? error.message : error instanceof Error ? (error.code || error.name) : 'unknown error';
  console.error('Data import failed:', safeMessage);
  process.exitCode = 1;
} finally {
  await source.$disconnect();
  await target.$disconnect();
}
