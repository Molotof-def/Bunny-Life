import 'dotenv/config';
import { initDb } from './db.js';
await initDb();
console.log('BUNNY LIFE database schema created');
process.exit(0);
