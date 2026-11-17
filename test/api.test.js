const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createApp } = require('../server/index');

let base, srv, tok = {};
const call = async (m, p, body, t) => {
  const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, j: await r.json().catch(() => ({})) };
};

test.before(async () => {
  const { server } = createApp({ dbFile: ':memory:', webDir: path.join(__dirname, '../web/dist'), adminEmail: 'admin@test.org', adminPassword: 'Temp1234' });
  await new Promise((ok) => server.listen(0, ok)); srv = server; base = 'http://127.0.0.1:' + server.address().port;
});
test.after(() => srv.close());

test('first admin must change temporary password', async () => {
  const l = await call('POST', '/api/login', { email: 'admin@test.org', password: 'Temp1234' });
  assert.equal(l.s, 200); assert.equal(l.j.user.must_change, true);
  assert.equal((await call('GET', '/api/lookups', null, l.j.token)).s, 403);
  assert.equal((await call('POST', '/api/password', { current: 'Temp1234', password: 'short' }, l.j.token)).s, 400);
  const c = await call('POST', '/api/password', { current: 'Temp1234', password: 'Better2026x' }, l.j.token);
  assert.equal(c.s, 200); tok.admin = c.j.token;
  assert.equal((await call('GET', '/api/lookups', null, l.j.token)).s, 401, 'old token is revoked');
  assert.equal((await call('GET', '/api/lookups', null, tok.admin)).s, 200);
});

test('admin creates users with name, email, role, county, subcounty, temp password', async () => {
  const mk = (name, email, role) => call('POST', '/api/users', { name, email, role, county: 'Lamu', subcounty: 'Lamu East', temp_password: 'Start2026' }, tok.admin);
  assert.equal((await mk('Ali Shee', 'ali@test.org', 'ranger')).s, 200);
  assert.equal((await mk('Said Famau', 'said@test.org', 'cox')).s, 200);
  assert.equal((await mk('Amina T', 'amina@test.org', 'tourfin')).s, 200);
  assert.equal((await mk('Pat Manager', 'pm@test.org', 'admin')).s, 200);
  assert.equal((await mk('Dup', 'ali@test.org', 'ranger')).s, 409);
  assert.equal((await call('POST', '/api/users', { name: 'X', email: 'x@test.org', role: 'tourism_officer', temp_password: 'Start2026' }, tok.admin)).s, 400, 'old separate roles are gone');
  for (const [k, e] of [['ranger', 'ali'], ['cox', 'said'], ['tf', 'amina'], ['mgr', 'pm']]) {
    const l = await call('POST', '/api/login', { email: e + '@test.org', password: 'Start2026' });
    const c = await call('POST', '/api/password', { current: 'Start2026', password: 'Mine2026pw' }, l.j.token); tok[k] = c.j.token;
  }
  assert.equal((await call('GET', '/api/users', null, tok.ranger)).s, 403);
});

test('projects are seeded and only the admin can add or assign them', async () => {
  const d = (await call('GET', '/api/docs', null, tok.admin)).j.docs;
  assert.ok(d.projects.some((p) => p.name === 'Coral Restoration' && p.partner === 'The Ocean Trust Organization'));
  const users = (await call('GET', '/api/users', null, tok.admin)).j.users; const ali = users.find((u) => u.email === 'ali@test.org');
  assert.equal((await call('PUT', '/api/docs/projects/p9', { data: { name: 'Seagrass Mapping', status: 'Active' } }, tok.admin)).s, 200);
  assert.equal((await call('PUT', '/api/docs/assign/' + ali.id, { data: { __v: ['p9'] } }, tok.admin)).s, 200);
  assert.equal((await call('PUT', '/api/docs/projects/p10', { data: { name: 'Nope' } }, tok.ranger)).s, 403);
});

test('ranger saves a draft, edits it, then submits; validation blocks incomplete submit', async () => {
  const d = await call('POST', '/api/records', { kind: 'incident', data: { date: '2026-11-10', time: '09:15', type: 'infringement', description: 'Net found' } }, tok.ranger);
  assert.equal(d.s, 200); assert.equal(d.j.record.status, 'draft');
  const id = d.j.record.id;
  const bad = await call('POST', `/api/records/${id}/submit`, null, tok.ranger);
  assert.equal(bad.s, 400); assert.match(bad.j.error, /infringement code/); assert.match(bad.j.error, /persons involved/);
  const e = await call('PUT', `/api/records/${id}`, { kind: 'incident', data: { date: '2026-11-10', time: '09:15', type: 'infringement', infringement_code: 'G3', description: 'Net found', persons: [{ name: 'Juma A' }, { name: 'Omar B' }, { name: 'Faraji C' }] } }, tok.ranger);
  assert.equal(e.s, 200); assert.equal(e.j.record.data.persons.length, 3); assert.equal(e.j.record.version, 2);
  const s = await call('POST', `/api/records/${id}/submit`, null, tok.ranger);
  assert.equal(s.s, 200); assert.equal(s.j.record.status, 'submitted');
  assert.equal((await call('PUT', `/api/records/${id}`, { kind: 'incident', data: s.j.record.data }, tok.ranger)).s, 403, 'locked after submit');
  const r = await call('POST', `/api/records/${id}/review`, { action: 'return', note: 'Add GPS' }, tok.mgr);
  assert.equal(r.j.record.status, 'returned');
  assert.equal((await call('PUT', `/api/records/${id}`, { kind: 'incident', data: s.j.record.data }, tok.ranger)).s, 200, 'editable after return');
});

test('fisher check holds many fishers; observation needs a time', async () => {
  const f = await call('POST', '/api/records', { kind: 'fisher_check', submit: true, data: { date: '2026-11-10', time: '10:00', location: 'inside', fishers: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] } }, tok.ranger);
  assert.equal(f.s, 200); assert.equal(f.j.record.data.fishers.length, 4);
  const o = await call('POST', '/api/records', { kind: 'observation', submit: true, data: { date: '2026-11-10', text: 'Turtle sighted' } }, tok.ranger);
  assert.equal(o.s, 400); assert.match(o.j.error, /time is required/);
});

test('rangers cannot see others records or finance', async () => {
  assert.equal((await call('GET', '/api/records?kind=txn', null, tok.ranger)).s, 403);
  const all = await call('GET', '/api/records?kind=incident', null, tok.ranger); assert.equal(all.j.records.length, 1);
  assert.equal((await call('POST', '/api/records', { kind: 'txn', data: {} }, tok.ranger)).s, 403);
});

test('tourism and finance officer is one role with visitor type and optional guide; maker-checker holds', async () => {
  const v = await call('POST', '/api/records', { kind: 'visitor', submit: true, data: { date: '2026-11-10', visitor_type: 'bmu', name: 'BMU group', count: 12 } }, tok.tf);
  assert.equal(v.s, 200, JSON.stringify(v.j));
  assert.equal((await call('POST', '/api/records', { kind: 'visitor', submit: true, data: { date: '2026-11-10', visitor_type: 'other', name: 'X', count: 1 } }, tok.tf)).s, 400);
  const t = await call('POST', '/api/records', { kind: 'txn', submit: true, data: { date: '2026-11-10', category: 'conservation fee', amount: 5000, currency: 'KES' } }, tok.tf);
  assert.equal(t.s, 200);
  assert.equal((await call('POST', `/api/records/${t.j.record.id}/review`, { action: 'approve' }, tok.tf)).s, 403);
  assert.equal((await call('POST', `/api/records/${t.j.record.id}/review`, { action: 'approve' }, tok.mgr)).j.record.status, 'approved');
});

test('boats: optional hour meter, per-boat setting, service alerts from hours', async () => {
  const mk = await call('POST', '/api/boats', { name: 'Nguru', reg: 'LFB 1', engine_count: 2, tracks_hours: true, svc_interval: 100, warn_before: 10 }, tok.mgr);
  const mk2 = await call('POST', '/api/boats', { name: 'Jahazi', engine_count: 1, tracks_hours: false, svc_interval: 20, warn_before: 5 }, tok.mgr);
  const id = mk.j.id, id2 = mk2.j.id;
  await call('POST', `/api/boats/${id}/service`, { engine: 'all', date: '2026-11-02', meter_1: 1000, meter_2: 990 }, tok.cox);
  const noMeter = await call('POST', '/api/records', { kind: 'vessel_log', submit: true, data: { boat_id: id, date: '2026-11-05', dep_time: '07:00', arr_time: '11:00' } }, tok.cox);
  assert.equal(noMeter.s, 400); assert.match(noMeter.j.error, /engine 1 hour meter/); assert.match(noMeter.j.error, /engine 2/);
  const ok = await call('POST', '/api/records', { kind: 'vessel_log', submit: true, data: { boat_id: id, date: '2026-11-05', dep_time: '07:00', arr_time: '11:00', e1_dep: 1000, e1_arr: 1091, e2_dep: 990, e2_arr: 1085 } }, tok.cox);
  assert.equal(ok.s, 200);
  const b = (await call('GET', '/api/boats', null, tok.cox)).j.boats.find((x) => x.id === id);
  assert.equal(b.status[0].run_since_service, 91); assert.equal(b.status[0].state, 'soon');
  assert.equal(b.status[1].run_since_service, 95); assert.equal(b.status[0].basis, 'hour meter');
  // boat without a meter: hours come from trip time and meter not required
  const t = await call('POST', '/api/records', { kind: 'vessel_log', submit: true, data: { boat_id: id2, date: '2026-11-06', dep_time: '08:00', arr_time: '17:30' } }, tok.cox);
  assert.equal(t.s, 200);
  const j = (await call('GET', '/api/boats', null, tok.cox)).j.boats.find((x) => x.id === id2);
  assert.equal(j.status[0].run_since_service, 9.5); assert.equal(j.status[0].basis, 'trip time'); assert.equal(j.status[0].state, 'ok');
  await call('POST', '/api/records', { kind: 'vessel_log', submit: true, data: { boat_id: id2, date: '2026-11-07', dep_time: '08:00', arr_time: '16:30' } }, tok.cox);
  assert.equal((await call('GET', '/api/boats', null, tok.cox)).j.boats.find((x) => x.id === id2).status[0].state, 'soon');
});

test('daily LMMA compliance flags missed days and accepts GPS inside the polygon', async () => {
  const p = (date, location, extra = {}) => call('POST', '/api/records', { kind: 'patrol', submit: true, data: { date, time_out: '07:00', time_in: '12:00', location, rangers: ['Ali Shee'], ...extra } }, tok.ranger);
  await p('2026-11-08', 'inside'); await p('2026-11-09', 'outside');
  await p('2026-11-10', 'outside', { track: [[-2.2150, 41.0100]] });
  const c = (await call('GET', '/api/compliance?from=2026-11-07&to=2026-11-11', null, tok.mgr)).j;
  const by = Object.fromEntries(c.days.map((d) => [d.date, d.status]));
  assert.equal(by['2026-11-07'], 'not tracked', 'before the first patrol is not counted'); assert.equal(by['2026-11-09'], 'missed'); assert.equal(by['2026-11-08'], 'visited');
  assert.equal(by['2026-11-09'], 'missed', 'outside LMMA does not count'); assert.equal(by['2026-11-10'], 'visited', 'GPS inside counts');
  assert.ok(c.missed.includes('2026-11-09') && !c.missed.includes('2026-11-07'));
  assert.equal((await call('GET', '/api/compliance', null, tok.ranger)).s, 403);
});

test('history import: dedupe, flagged imported, approved', async () => {
  const rows = [{ kind: 'patrol', data: { date: '2025-05-19', time_out: '16:00', time_in: '06:30', location: 'inside', rangers: ['Ali Shee'], observations: 'Fishers inside closed area', import_key: 'daily|2025-05-19|0001' } }];
  const a = await call('POST', '/api/import', { records: rows, source: 'May-June 2025 logs' }, tok.mgr);
  assert.equal(a.j.saved, 1);
  const b = await call('POST', '/api/import', { records: rows }, tok.mgr); assert.equal(b.j.saved, 0); assert.equal(b.j.skipped.length, 1);
  assert.equal((await call('POST', '/api/import', { records: rows }, tok.ranger)).s, 403);
  const r = (await call('GET', '/api/records?kind=patrol&from=2025-05-19&to=2025-05-19', null, tok.mgr)).j.records;
  assert.equal(r[0].imported, true); assert.equal(r[0].status, 'approved');
});

test('zones: area calculation and validation', async () => {
  const z = (await call('GET', '/api/zones', null, tok.mgr)).j.zones;
  const lmma = z.find((x) => x.kind === 'lmma'); assert.ok(lmma.area_km2 > 0.3 && lmma.area_km2 < 5, 'area ' + lmma.area_km2);
  const bad = await call('PUT', '/api/zones/zone-x', { kind: 'other', feature: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-2.2, 41.0], [-2.2, 41.01], [-2.21, 41.01], [-2.2, 41.0]].map(([a, b]) => [a, b])] } } }, tok.mgr);
  assert.equal(bad.s, 400);
});

test('login throttling', async () => {
  let last; for (let i = 0; i < 9; i++) last = await call('POST', '/api/login', { email: 'nobody@test.org', password: 'x' });
  assert.equal(last.s, 429);
});

test('document store: role-limited collections, versioning, drafts deletable by author only', async () => {
  const put = (c, id, data, t, extra = {}) => call('PUT', `/api/docs/${c}/${id}`, { data, ...extra }, t);
  assert.equal((await put('patrols', 'PT-1', { status: 'Draft', area: 'LMMA' }, tok.ranger)).s, 200);
  assert.equal((await put('tour', 'BK-1', { n: 2 }, tok.ranger)).s, 403, 'ranger cannot write tourism');
  assert.equal((await put('fin', 'FN-1', { status: 'Draft', amt: 100 }, tok.tf)).s, 200);
  const d = (await call('GET', '/api/docs', null, tok.ranger)).j.docs;
  assert.ok(d.patrols.some((x) => x.id === 'PT-1') && !d.fin && !d.tour, 'ranger sees patrols, not finance');
  assert.equal((await put('patrols', 'PT-1', { status: 'Draft', area: 'x' }, tok.ranger, { base_version: 99 })).s, 409);
  assert.equal((await call('DELETE', '/api/docs/patrols/PT-1', null, tok.cox)).s, 403);
  assert.equal((await call('DELETE', '/api/docs/patrols/PT-1', null, tok.ranger)).s, 200);
});
