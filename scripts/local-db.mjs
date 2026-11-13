import { ensureLocalDatabase } from './local-database.mjs';
try { await ensureLocalDatabase(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
