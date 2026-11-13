// Reuse the provenance-checked isolated runner with a separate task manifest/cluster.
process.env.RECON_DISPOSABLE_TASK = 'EID-03';
await import('./eid02b-disposable.mjs');
