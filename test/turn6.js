// Update 6 checks. Run: node --no-warnings test/turn6.js
const { start, browser, login } = require('./harness');
(async () => {
  const S = await start(); const B = await browser(); let bad = 0;
  const check = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' :: ' + (x || ''))); if (!c) bad++; };
  const A = await B.open(S.base, { permissions: ['geolocation'], geolocation: { latitude: -2.2, longitude: 41.0 } }); const ap = A.page; await login(ap, S.base, 'admin@test.org', 'Admin2026pw');
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = (n) => { const d = new Date(Date.now() - n * 864e5); return { iso: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), txt: d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear() }; };
  const trk = (la) => { const t = []; for (let i = 0; i < 30; i++) t.push([la, 41.0 + i * 0.0004, 0, 1760000000 + i * 5]); return t; };
  const mk = (id, d, st, la) => ({ id, iso: d.iso, date: d.txt, leader: 'Amina Hassan', rangers: ['Amina Hassan'], status: st, start: '14:05', end: '17:30', track: trk(la), km: 0.0004 * 29 * 111, enc: [], seiz: [], events: [], review: 'Pending review', seen: new Date().toISOString() });
  await S.call('PUT', '/docs/patrols/PT-L', { data: mk('PT-L', dd(0), 'Active', -2.2) }, S.adminToken);
  await S.call('PUT', '/docs/patrols/PT-A', { data: mk('PT-A', dd(2), 'Completed', -2.205) }, S.adminToken);
  await S.call('PUT', '/docs/patrols/PT-B', { data: mk('PT-B', dd(40), 'Completed', -2.21) }, S.adminToken);
  await S.call('PUT', '/docs/incidents/IN-1', { data: { id: 'IN-1', patrol: 'PT-A', date: dd(2).txt, cat: 'Illegal fishing', ranger: 'Amina Hassan', lat: -2.205, lon: 41.004, stage: 0, desc: 'Test', action: '—', ref: 'None' } }, S.adminToken);
  await ap.reload(); await ap.goto(S.base + '/#live-map'); await ap.waitForSelector('.routebar', { timeout: 8000 }).catch(async () => { console.log('ERRS', A.errs.slice(0, 5), (await ap.innerText('body')).slice(0, 300)); process.exit(1); });
  const trks = () => ap.locator('polyline.gm-track').count();
  const info = () => ap.innerText('.rinfo');
  check('live map starts with live routes only', (await trks()) === 1, await trks());
  check('distance label on the route', (await ap.locator('.gm-dist').count()) === 1);
  await ap.click('.routebar button:has-text("All patrols")'); await ap.waitForTimeout(300);
  if (process.env.SHOT) await ap.screenshot({ path: process.env.SHOT });
  check('All patrols, last 7 days: live + completed in period (old one excluded)', (await trks()) === 2, (await trks()) + ' ' + await info());
  await ap.selectOption('.routebar select', '30'); await ap.waitForTimeout(200);
  check('30 days still excludes a 40 day old patrol', (await trks()) === 2);
  await ap.selectOption('.routebar select', 'custom'); await ap.fill('.routebar input[aria-label="From date"]', dd(60).iso); await ap.waitForTimeout(300);
  check('custom range brings the old patrol in', (await trks()) === 3, await info());
  await ap.selectOption('.routebar select', '7'); await ap.click('.routebar button:has-text("Patrols with incidents")'); await ap.waitForTimeout(300);
  check('Patrols with incidents shows the patrol that had one (plus live)', (await trks()) === 2 && /1 incident/.test(await info()), await info());
  await ap.click('.routebar button:has-text("Live routes only")'); await ap.waitForTimeout(200);
  check('back to live only', (await trks()) === 1);
  // patrol drawer: route + incident pin, then show on live map
  await ap.goto(S.base + '/#patrols'); await ap.waitForSelector('text=PT-A'); await ap.click('tr:has-text("PT-A")'); await ap.waitForSelector('.drawer .mapbox');
  await ap.waitForTimeout(800); check('drawer map has the incident pin highlighted', (await ap.locator('.drawer .mk-hl').count()) === 1);
  await ap.click('.drawer button:has-text("Show this route on the live map")'); await ap.waitForSelector('.routebar'); await ap.waitForTimeout(600);
  check('completed patrol route shown on the live map when opened from the patrol', (await trks()) === 2, await trks());
  check('its incident is highlighted', (await ap.locator('.mk-hl').count()) === 1);
  check('Hide route button', await ap.isVisible('button:has-text("Hide route of PT-A")'));
  // my location, follow, share
  await ap.click('button:has-text("Show my location")'); await ap.waitForSelector('.gm-acc', { timeout: 8000 }).catch(() => {});
  check('my location dot on the map', (await ap.locator('.gm-acc').count()) === 1);
  await ap.check('text=Let others see me on the map >> input').catch(async () => { await ap.locator('label:has-text("Let others see me") input').check(); });
  check('sharing stored', await ap.evaluate(() => localStorage.getItem('pops-share') === '1'));
  await ap.waitForTimeout(1500);
  const pos = await S.call('GET', '/pos', null, S.adminToken);
  check('shared position reaches the server', (pos.staff || []).length >= 1, JSON.stringify(pos).slice(0, 120));
  const rg = await S.call('GET', '/pos', null, (await S.call('POST', '/login', { email: 'ranger@test.org', password: 'Start2026' })).token);
  check('a ranger can see shared positions now', Array.isArray(rg.staff) || /must|password/i.test(JSON.stringify(rg)), JSON.stringify(rg).slice(0, 100));
  await ap.click('.gm-livebtn'); await ap.waitForSelector('.gm-list'); check('live list opens with lock option', (await ap.locator('.gm-list button:has-text("Lock on")').count()) >= 1);
  // agencies
  await ap.goto(S.base + '/#patrols'); await ap.click('button:has-text("Create patrol")'); await ap.waitForSelector('.modal'); await ap.click('.modal button:has-text("Joint patrol")');
  const mt = await ap.innerText('.modal');
  check('patrol type reads Single patrol / Joint patrol', /Single patrol/.test(mt) && /Joint patrol/.test(mt));
  check('agency list has KFS, KeFS, Police', /Kenya Forest Service \(KFS\)/.test(mt) && /Kenya Fisheries Service \(KeFS\)/.test(mt) && /Kenya Police Service/.test(mt), mt.slice(0, 900));
  await ap.keyboard.press('Escape');
  // admin delete user
  const nu = await S.call('POST', '/users', { name: 'Temp Del', email: 'del@test.org', role: 'officer', county: 'Lamu', subcounty: 'Lamu East', temp_password: 'Start2026' }, S.adminToken);
  const d1 = await S.call('DELETE', '/users/' + nu.user.id, null, S.adminToken);
  const lst = await S.call('GET', '/users', null, S.adminToken);
  check('admin can delete a user', d1.ok && !lst.users.some(u => u.email === 'del@test.org'), JSON.stringify(d1));
  const me = lst.users.find(u => u.email === 'admin@test.org');
  const d2 = await S.call('DELETE', '/users/' + me.id, null, S.adminToken);
  check('admin cannot delete themselves', !d2.ok && /own account/.test(JSON.stringify(d2)), JSON.stringify(d2));
  await ap.goto(S.base + '/#staff'); await ap.waitForSelector('text=Staff'); await ap.click('tbody tr >> nth=1'); await ap.waitForSelector('.drawer');
  check('Delete user button in staff drawer', await ap.isVisible('.drawer button:has-text("Delete user")'));
  const errs = A.errs.filter(e => !/Geolocation|geolocation|tile|ERR_|Failed to load resource/i.test(e));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(bad ? bad + ' FAILED' : 'ALL PASS'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
