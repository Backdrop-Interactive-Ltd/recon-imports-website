// EID-04 always uses its own fresh target; never the owner's .env connection.
process.env.RECON_DISPOSABLE_TASK = 'EID-04';
await import('./eid02b-disposable.mjs');
