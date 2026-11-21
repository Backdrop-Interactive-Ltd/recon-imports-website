import { developmentPlan } from './development.mjs';

export function eid04DevelopmentPlan(args = []) {
  const plan = developmentPlan(args);
  return {
    port: plan.port, origin: plan.origin,
    environment: { ...plan.environment, EID02B_RUNTIME: '1' },
    command: ['run', 'node', ...plan.nextArgs],
  };
}
