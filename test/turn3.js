// Turn 3 features. Run: node --no-warnings test/turn3.js
const { start, browser, login } = require('./harness');
(async () => {
  const S = await start(); const B = await browser(); let bad = 0;
  const check = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' :: ' + (x || ''))); if (!c) bad++; };
  const docs0 = async (coll) => (await S.call('GET', '/docs', null, S.adminToken)).docs[coll] || [];
  // users carry phone and title
  const mk = await S.call('POST', '/users', { name: 'Sara Ranger', email: 'sara@test.org', role: 'ranger', county: 'Lamu', subcounty: 'Lamu East', phone: '0712000111', title: 'Marine Ranger', emergency_name: 'Zawadi', emergency_phone: '0722000222', temp_password: 'Start2026' }, S.adminToken);
  const us = (await S.call('GET', '/users', null, S.adminToken)).users.find((x) => x.email === 'sara@test.org');
  check('user saved with phone, title and emergency contact', us && us.phone === '0712000111' && us.title === 'Marine Ranger' && us.emergency_phone === '0722000222', JSON.stringify(us));
  const lk = await S.call('GET', '/lookups', null, S.adminToken);
  check('lookups give the ranger phone for forms', (lk.rangers.find((r) => r.name === 'Sara Ranger') || {}).phone === '0712000111');
  check('boat fees exist, to be priced by the admin', ['boat-speed', 'boat-dhow', 'boat-power'].every((c) => lk.fees.some((f) => f.code === c && f.per === 'boat')));
  const pf = await S.call('PUT', '/fees/boat-dhow', { label: 'Dhow, per boat', currency: 'KES', amount: 8000, per: 'boat' }, S.adminToken);
  check('admin can price a boat fee', pf.fees.some((f) => f.code === 'boat-dhow' && f.amount === 8000));
  // admin UI
  const A = await B.open(S.base, { viewport: { width: 1440, height: 900 } }); const ap = A.page;
  await login(ap, S.base, 'admin@test.org', 'Admin2026pw');
  const side = await ap.innerText('aside');
  check('Coral Restoration is gone from the menu', !/Coral Restoration/.test(side));
  check('Tourism and Finance is one menu item', /Tourism & Finance/.test(side) && !/Finance & Donations/.test(side) && !/Tourism Management/.test(side));
  await ap.goto(S.base + '/#projects'); await ap.waitForSelector('text=Conservation Projects');
  check('Coral Restoration is a project card', await ap.isVisible('text=Coral Restoration'));
  await ap.goto(S.base + '/#bmus'); await ap.waitForSelector('text=BMUs & Governance');
  const bt = await ap.innerText('main');
  check('profile no longer has community, next meeting or patrols', !/Next meeting|Community\b|Patrols on record/i.test(bt));
  check('other BMUs listed', ['Lamu BMU', 'Shela BMU', 'Mokowe BMU', 'Mtangawanda BMU', 'Faza BMU', 'Tchundwa BMU', 'Kizingitini BMU', 'Ndau BMU', 'Mbwajumwali BMU'].every((n) => bt.includes(n)));
  await ap.click('button:has-text("Edit") >> nth=0'); await ap.click('button:has-text("Add representative")');
  const names = ap.locator('[aria-label^="Representative"][aria-label$="name"]'); await names.nth(0).fill('Rep One'); await names.nth(1).fill('Rep Two');
  await ap.click('.modal button:has-text("Save")'); await ap.waitForTimeout(900);
  const br = (await docs0('bmus')).find((r) => r.reps && r.reps.length === 2);
  check('BMU keeps two representatives', !!br && br.reps[1].name === 'Rep Two');
  await ap.click('button:has-text("Board & committee")');
  check('Board & committee has Structure and Management', await ap.isVisible('text=Structure') && await ap.isVisible('text=Management'));
  await ap.goto(S.base + '/#iweni-lmma'); await ap.waitForSelector('text=Iweni LMMA Management');
  check('certificate is not under Iweni LMMA any more', !(await ap.isVisible('text=BMU certificate')));
  // staff: no BMU representative role, phone required
  await ap.goto(S.base + '/#staff'); await ap.waitForSelector('text=Staff & Users'); await ap.click('button:has-text("Add user")');
  const roleOpts = await ap.locator('#sr option').allInnerTexts();
  check('BMU representative is not offered as a role', !roleOpts.some((o) => /BMU rep/i.test(o)), roleOpts.join('|'));
  check('add user asks for phone', await ap.isVisible('#sph'));
  await ap.keyboard.press('Escape');
  // patrols: joint/single
  await ap.goto(S.base + '/#patrols'); await ap.waitForSelector('text=Patrols & Field Activities');
  await ap.click('button:has-text("New patrol"), button:has-text("Create")');
  check('patrol type offered', await ap.isVisible('button:has-text("Joint with other BMUs")'));
  await ap.click('button:has-text("Joint with other BMUs")');
  check('joint shows other BMUs and 30 min alert', await ap.isVisible('text=Shela BMU') && /30 minutes/.test(await ap.innerText('.modal')));
  await ap.keyboard.press('Escape');
  // ranger SOS on a phone, inside the LMMA
  const R = await B.open(S.base, { viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { latitude: -2.2, longitude: 41.0 } }); const rp = R.page;
  await login(rp, S.base, 'sara@test.org', 'Start2026', 'Pass2026word');
  await rp.waitForSelector('.sosbtn'); await rp.click('.sosbtn'); await rp.waitForSelector('text=Send SOS now');
  await rp.click('button:has-text("Send SOS now")'); await rp.waitForSelector('text=SOS sent'); await rp.waitForTimeout(1500);
  const sos = await docs0('sos');
  check('SOS saved with position, phone and name', sos.length === 1 && sos[0].lat != null && sos[0].phone === '0712000111' && sos[0].by === 'Sara Ranger' && sos[0].status === 'Active', JSON.stringify(sos));
  await ap.waitForSelector('.sosbar', { timeout: 25000 }).catch(() => {});
  check('admin sees the SOS bar', await ap.isVisible('.sosbar'));
  await ap.click('.sosbar button:has-text("I have seen it")'); await ap.waitForTimeout(1200);
  check('acknowledged on the server', (await docs0('sos'))[0].status === 'Acknowledged');
  await rp.waitForTimeout(500);
  // notification panel
  await ap.click('.bellbtn'); await ap.waitForSelector('.notifpanel');
  const box = await ap.locator('.notifpanel').boundingBox();
  check('notification panel is inside the screen', box && box.x >= 0 && box.y >= 0);
  await ap.click('.notifpanel li button >> nth=0'); await ap.waitForTimeout(600);
  check('notification opens the map for SOS', /live-map/.test(ap.url()));
  // map controls
  await ap.goto(S.base + '/#live-map'); await ap.waitForSelector('.geomap');
  await ap.click('[aria-label="Turn map right"]'); await ap.click('[aria-label="Turn map right"]');
  const tr = await ap.locator('.gm-rot').first().getAttribute('style');
  check('map rotates', /rotate\(30deg\)/.test(tr), tr);
  check('compass shows the angle', /30/.test(await ap.innerText('.gm-north')));
  await ap.click('.gm-north'); const tr2 = await ap.locator('.gm-rot').first().getAttribute('style');
  check('compass tap points north up', /none/.test(tr2), tr2);
  await ap.click('[aria-label="Full screen"]'); await ap.waitForTimeout(400);
  check('full screen on', await ap.locator('.geomap.gm-full').count() === 1);
  await ap.keyboard.press('Escape'); await ap.waitForTimeout(400);
  check('Escape leaves full screen', await ap.locator('.geomap.gm-full').count() === 0);
  await ap.click('.sosbar button:has-text("Resolved")'); await ap.waitForTimeout(1200);
  check('resolved on the server', (await docs0('sos'))[0].status === 'Resolved');
  // staff on map: admin shares
  await S.call('POST', '/pos', { lat: -2.205, lon: 41.0, doing: 'Visiting fishers' }, S.adminToken);
  const ps = await S.call('GET', '/pos', null, S.adminToken);
  check('staff position stored for admin', ps.staff.length === 1 && ps.staff[0].doing === 'Visiting fishers');
  // incident closed ticks step 5
  const inc = { id: 'IN-9', date: '1 Nov 2026', iso: '2026-11-01', cat: 'Infringement', desc: 'x', stage: 4, ranger: 'Sara Ranger', code: '', time: '10:00', loc: '', personsList: [], photos: [], persons: 'Not identified', ref: 'None', action: '—', patrol: '—' };
  await S.call('PUT', '/docs/incidents/IN-9', { data: inc }, S.adminToken);
  await ap.goto(S.base + '/#incidents'); await ap.waitForSelector('text=IN-9', { timeout: 25000 }); await ap.click('text=IN-9');
  await ap.waitForTimeout(500);
  const done = await ap.locator('.step.done').count();
  check('closed incident ticks all five steps', done === 5, 'done=' + done);
  // form 1A gets phone and JCMA
  const p = { id: 'PT-90', iso: '2026-11-02', date: '2 Nov 2026', leader: 'Sara Ranger', rangers: ['Sara Ranger'], status: 'Completed', review: 'Pending review', start: '06:00', end: '10:00', area: 'Iweni LMMA', boat: '', cox: '', bmu: 'pate', enc: [], seiz: [], track: [[-2.2, 41.0]], km: 2, objective: 'Surveillance' };
  await S.call('PUT', '/docs/patrols/PT-90', { data: p }, S.adminToken);
  await ap.goto(S.base + '/#patrols'); await ap.waitForSelector('text=PT-90', { timeout: 25000 }); await ap.click('table.tbl tbody tr:has-text("PT-90")'); await ap.waitForTimeout(500);
  await ap.click('button:has-text("Forms")'); await ap.waitForSelector('[data-doc="capture"]', { timeout: 8000 }).catch(() => {});
  const f1a = await ap.locator('[data-doc="capture"]').innerText().catch(() => '');
  check('Form 1A has the leader phone', /0712000111/.test(f1a), f1a.slice(0, 300));
  check('Form 1A has the JCMA name', /Pate.Shanga JCMA/.test(f1a), f1a.slice(0, 300));
  const errs = [...A.errs, ...R.errs].filter((e) => !/Geolocation|geolocation/.test(e));
  check('no browser errors', errs.length === 0, errs.slice(0, 4).join(' | '));
  console.log(bad ? 'FAILED ' + bad : 'ALL OK'); await B.br.close(); S.server.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
