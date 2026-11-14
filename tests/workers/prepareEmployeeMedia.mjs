import fs from 'node:fs';
import path from 'node:path';
// Generated local-only test configuration. No credentials, database or remote resources.
const root = process.cwd();
if (!fs.existsSync(path.join(root, 'tests/workers/employeeMediaProbe.ts'))) throw Error('Run from project root.');
const destination = path.join(root, '.local/employee-media-worker.json');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify({
  name: 'employee-media-local-test', main: path.join(root, 'tests/workers/employeeMediaProbe.ts'),
  compatibility_date: '2026-11-01', compatibility_flags: ['nodejs_compat'],
  images: { binding: 'IMAGES' },
  // Match the server entry selected by the Next/OpenNext production bundle.
  alias: { qrcode: path.join(root, 'node_modules/qrcode/lib/server.js') },
}, null, 2));
console.log('Local-only Images/QR test configuration prepared. No database binding or secrets.');
