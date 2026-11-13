import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) {
  throw new Error('.env already exists; leaving it unchanged.');
}
const values = {
  DATABASE_URL: `postgresql://recon:${randomBytes(24).toString('hex')}@127.0.0.1:54329/recon_local?schema=public`,
  AUTH_SECRET: randomBytes(32).toString('hex'),
  AUTH_URL: 'http://localhost:3000',
  ADMIN_NAME: 'Recon Admin',
  ADMIN_EMAIL: 'admin@reconimports.local',
  ADMIN_PASSWORD: randomBytes(15).toString('base64url'),
};
writeFileSync('.env', Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n');
console.log('Local environment configured.');
