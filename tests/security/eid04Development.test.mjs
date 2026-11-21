import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { eid04DevelopmentPlan } from '../../scripts/eid04-development.mjs';
import { developmentPlan, assertDevelopmentPortAvailable, requireVerifiedDevelopmentGroups, stopConfirmedDevelopmentGroups } from '../../scripts/development.mjs';

test('all development plans pin Next and both auth origins to localhost:3000; EID-04 retains restricted runtime', () => {
  const before = process.env.AUTH_URL;
  const plan = eid04DevelopmentPlan();
  assert.equal(plan.origin, 'http://localhost:3000');
  assert.deepEqual(plan.environment, { EID02B_RUNTIME: '1', AUTH_URL: plan.origin, NEXTAUTH_URL: plan.origin });
  assert.deepEqual(plan.command.slice(0, 2), ['run', 'node']);
  assert.deepEqual(plan.command.slice(3), ['dev', '--webpack', '--hostname', 'localhost', '--port', '3000']);
  assert.equal(developmentPlan().origin, plan.origin);
  assert.equal(process.env.AUTH_URL, before, 'Preparing a plan must not mutate environment');
  for (const args of [['--port', '3000'], ['--port', '54329'], ['--port', '0'], ['--port', '65536'], ['--port', 'NaN'], ['--hostname', '0.0.0.0'], ['--port', '3105']]) assert.throws(() => eid04DevelopmentPlan(args));
});

for (const host of ['127.0.0.1', '::1']) {
  test(`EID-04 refuses a port occupied on ${host} without stopping the listener`, async () => {
    const server = createServer();
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen({ host, port: 0 }, resolve); });
    try {
      await assert.rejects(assertDevelopmentPortAvailable(server.address().port), /unavailable/);
      assert.equal(server.listening, true);
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
}

test('unverified processes and unconfirmed shutdowns fail closed', () => {
  for (const groups of [[], [{ kind: 'UNVERIFIED', members: [{ id: 1 }] }], [{ kind: 'RECON_NEXT_DEV', members: [] }]]) assert.throws(() => requireVerifiedDevelopmentGroups(groups));
  const groups = [{ kind: 'RECON_NEXT_DEV', members: [{ id: 1 }] }];
  assert.throws(() => stopConfirmedDevelopmentGroups(groups, ''), /confirmation/);
  assert.throws(() => stopConfirmedDevelopmentGroups(groups, 'yes'), /confirmation/);
});
