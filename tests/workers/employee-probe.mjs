// Test-only entrypoint. Production Wrangler config always uses .open-next/worker.js.
import application from '../../.open-next/worker.js';
import { runWithCloudflareRequestContext } from '../../.open-next/cloudflare/init.js';
import { getPublicEmployeeDirectory, getEmployeeVerification } from '../../.local/workers-build/source/lib/employees/publicQueries.ts';
export { DOQueueHandler, DOShardedTagCache } from '../../.open-next/worker.js';
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (env.WORKERS_SMOKE_TEST_ONLY === 'true' && url.pathname === '/__workers-test/employees') {
      return runWithCloudflareRequestContext(request, env, ctx, async () => Response.json(
        url.searchParams.has('key') ? await getEmployeeVerification(url.searchParams.get('key')) :
          await getPublicEmployeeDirectory({ search: url.searchParams.get('search') ?? '' }),
        { headers: { 'Cache-Control': 'private, no-store' } },
      ));
    }
    return application.fetch(request, env, ctx);
  },
};
