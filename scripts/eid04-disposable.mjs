// EID-04 always uses its own fresh target; never the owner's .env connection.
import { eid04DevelopmentPlan } from './eid04-development.mjs';
import { prepareDevelopmentPort } from './development.mjs';

if (process.argv[2] === 'dev') {
  const plan = eid04DevelopmentPlan(process.argv.slice(3));
  await prepareDevelopmentPort();
  // Process-local origins only; .env and other Next servers are untouched.
  Object.assign(process.env, plan.environment);
  process.argv.splice(2, process.argv.length - 2, ...plan.command);
  console.log(`EID-04 development origin: ${plan.origin}; restricted disposable runtime only.`);
}
process.env.RECON_DISPOSABLE_TASK = 'EID-04';
await import('./eid02b-disposable.mjs');
