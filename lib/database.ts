import { createClient, type Client, type InValue } from '@libsql/client';
import { mkdirSync } from 'node:fs';
export interface Statement {
  bind(...values: InValue[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface Database {
  prepare(sql: string): Statement;
}
export const schema = [
  'CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS subscriptions (endpoint TEXT PRIMARY KEY NOT NULL, preferences TEXT NOT NULL, updated INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS subscription_keys (endpoint TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, created INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS push_events (id TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, created INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS push_deliveries (event_id TEXT NOT NULL, endpoint TEXT NOT NULL, status TEXT NOT NULL, updated INTEGER NOT NULL, attempts INTEGER NOT NULL, PRIMARY KEY(event_id,endpoint))',
];
export function createDatabase(client: Client): Database {
  let initialized: Promise<unknown> | undefined;
  const ready = () =>
    (initialized ??= client.batch(schema, 'write').catch((error) => {
      initialized = undefined;
      throw error;
    }));
  function prepare(sql: string, args: InValue[] = []): Statement {
    const execute = async () => {
      await ready();
      return client.execute({ sql, args });
    };
    return {
      bind: (...values) => prepare(sql, values),
      async first<T>() {
        const r = await execute();
        return (r.rows[0] as unknown as T) || null;
      },
      async all<T>() {
        const r = await execute();
        return { results: r.rows as unknown as T[] };
      },
      async run() {
        const r = await execute();
        return { meta: { changes: r.rowsAffected } };
      },
    };
  }
  return { prepare };
}
let singleton: Database | undefined;
export function databaseConfig(env: Record<string, string | undefined> = process.env) {
  const integrated = !env.TURSO_DATABASE_URL && !!env.STORAGE_TURSO_DATABASE_URL;
  return {
    url:
      env.TURSO_DATABASE_URL ||
      env.STORAGE_TURSO_DATABASE_URL ||
      (env.NODE_ENV === 'development' ? 'file:.data/observatorio.db' : ''),
    authToken: integrated ? env.STORAGE_TURSO_AUTH_TOKEN : env.TURSO_AUTH_TOKEN,
  };
}
export function getDatabase(): Database | undefined {
  if (singleton) return singleton;
  const { url, authToken } = databaseConfig();
  if (!url) return undefined;
  if (process.env.VERCEL && url.startsWith('file:'))
    throw Error('Use a remote Turso database on Vercel.');
  if (url.startsWith('file:')) mkdirSync('.data', { recursive: true });
  singleton = createDatabase(createClient({ url, authToken }));
  return singleton;
}
