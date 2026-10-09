import {loadEnvConfig} from '@next/env';
import {getDatabase} from '../lib/database';
loadEnvConfig(process.cwd());
const db=getDatabase();if(!db)throw Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no .env.local.');
await db.prepare('SELECT 1 AS ok').first();console.log('Banco inicializado. Tabelas de cache e inscrições prontas.');
