import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fixture } from './fixture.mjs';

test('clean official allocation starts at 101 and increments; repeat runs verify the initial ledger', async () => {
  const f = await fixture(); try {
    const count = await f.prisma.employee.count();
    if (!count) {
      assert.equal((await f.services.createEmployee({})).employeeCode, 'RI-EMP-101');
      assert.equal((await f.services.createEmployee({})).employeeCode, 'RI-EMP-102');
    }
    const first = await f.prisma.employee.findMany({ orderBy: [{ createdAt: 'asc' }, { employeeCode: 'asc' }], take: 2 });
    assert.deepEqual(first.map(e => e.employeeCode), ['RI-EMP-101', 'RI-EMP-102']);
    assert.ok(first.every(e => e.employmentStatus === 'INACTIVE'));
  } finally { await f.close(); }
});

test('upgrade preserves issued legacy codes and old sequence while bootstrapping beyond higher allocations', async () => {
  const f = await fixture(); try {
    const supplied=process.env.RECON_TEST_PREPROVISIONED_GRANTS==='LAUNCH-05D'?process.env.EID02B_COMPAT_SCHEMA:undefined;
    const schema = supplied ?? `compat_${randomBytes(6).toString('hex')}`;
    assert.match(schema,/^compat_[a-f0-9]{12}$/);
    if(supplied) {
      const access=(await f.owner.query("SELECT has_schema_privilege(current_user,$1,'USAGE') AND has_schema_privilege(current_user,$1,'CREATE') AS allowed",[schema])).rows[0];
      assert.equal(access.allowed,true);
    } else await f.owner.query(`CREATE SCHEMA "${schema}"`);
    await f.owner.query(`SET search_path TO "${schema}"`);
    const migrations = (await readdir('prisma/migrations')).filter(x => /^\d/.test(x)).sort();
    for (const migration of migrations.slice(0, -1)) await f.owner.query(await readFile(`prisma/migrations/${migration}/migration.sql`, 'utf8'));
    await f.owner.query("SELECT nextval('recon_employee_code_seq') FROM generate_series(1,109)");
    await f.owner.query(`INSERT INTO "Employee" (id,"employeeCode","updatedAt") VALUES ('legacy-preserved','RCI-0500',now())`);
    await f.owner.query(await readFile(`prisma/migrations/${migrations.at(-1)}/migration.sql`, 'utf8'));
    assert.equal((await f.owner.query('SELECT "employeeCode" FROM "Employee"')).rows[0].employeeCode, 'RCI-0500');
    assert.equal(String((await f.owner.query('SELECT last_value FROM recon_employee_code_seq')).rows[0].last_value), '109');
    assert.equal(String((await f.owner.query("SELECT nextval('recon_employee_official_code_seq') AS value")).rows[0].value), '501');
    await assert.rejects(f.owner.query(`UPDATE "Employee" SET "employeeCode"='RI-EMP-500' WHERE id='legacy-preserved'`), e => e.code === 'P0001');
  } finally { await f.close(); }
});
