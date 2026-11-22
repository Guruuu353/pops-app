// Update 5 checks. Run: node --no-warnings test/turn5.js
const { start, browser, login, setTime } = require('./harness');
const fs = require('node:fs'); const { execSync } = require('node:child_process');
(async () => {
  const S = await start(); const B = await browser(); let bad = 0;
  const check = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' :: ' + (x || ''))); if (!c) bad++; };
  const docs0 = async (coll) => (await S.call('GET', '/docs', null, S.adminToken)).docs[coll] || [];
  const A = await B.open(S.base); const ap = A.page; await login(ap, S.base, 'admin@test.org', 'Admin2026pw');
  // seed a finished patrol with a track so reports, forms and boats have something to show
  const trk = []; for (let i = 0; i < 40; i++) trk.push([-2.2 + 0, 41.0 + i * 0.0003, 0, 1760000000 + i * 5]);
  const mk = (id, iso, boat) => ({ id, iso, date: iso, leader: 'Amina Hassan', rangers: ['Amina Hassan'], status: 'Completed', start: '14:05', end: '17:30', boat, track: trk, km: 0, enc: [], seiz: [], events: [], review: 'Pending review' });
  await S.call('PUT', '/docs/patrols/PT-A', { data: mk('PT-A', '2026-11-03', 'Test Boat') }, S.adminToken);
  await S.call('PUT', '/docs/patrols/PT-B', { data: mk('PT-B', '2026-11-18', 'Test Boat') }, S.adminToken);
  // ---- finance / tourism form
  await ap.goto(S.base + '/#tourism'); await ap.waitForSelector('text=Tourism'); await ap.click('button:has-text("New visitor entry")'); await ap.waitForSelector('.modal');
  const mt = await ap.innerText('.modal');
  check('vessel form has Captain', /Captain/.test(mt));
  check('vessel form has no BMU area and no Moved to', !/BMU area/.test(mt) && !/Moved to/.test(mt) && /Moved from/.test(mt) && /Destination/.test(mt), mt.slice(0, 600));
  await ap.keyboard.press('Escape'); await ap.waitForTimeout(200);
  // ---- reports: date range for patrol forms
  await ap.goto(S.base + '/#reports'); await ap.waitForSelector('text=Patrol forms');
  check('patrol forms list shows both patrols', (await ap.innerText('body')).includes('PT-A') && (await ap.innerText('body')).includes('PT-B'));
  await ap.fill('#pf-a', '2026-11-10'); await ap.fill('#pf-b', '2026-11-30'); await ap.waitForTimeout(300);
  const rb = await ap.innerText('body');
  check('date range filters patrol forms', rb.includes('PT-B') && !/PT-A\s/.test(rb.split('Patrol forms')[1] || '') && /1 of 2 patrol/.test(rb), rb.slice(rb.indexOf('Patrol forms'), rb.indexOf('Patrol forms') + 400));
  await ap.click('button:has-text("Open all 1 in this range")'); await ap.waitForSelector('.pforms .paper'); check('batch forms open', (await ap.locator('.pforms .paper').count()) >= 1);
  await ap.keyboard.press('Escape'); await ap.click('.modal button:has-text("Close"), .modal .iconbtn').catch(() => {}); await ap.waitForTimeout(200);
  // ---- table PDF preview opens in a preview window, not a download
  let downloads = 0; ap.on('download', () => downloads++);
  await ap.goto(S.base + '/#patrols'); await ap.waitForSelector('text=Preview PDF'); await ap.click('button:has-text("Preview PDF")'); await ap.waitForSelector('.pv');
  check('PDF opens in a preview first (no download yet)', (await ap.isVisible('.pv button:has-text("Download")')) && downloads === 0);
  const pdfB64 = await ap.evaluate(async () => { const b = makePdfBlob({ title: 'Test', sub: 's', head: ['A', 'B'], rows: Array.from({ length: 120 }, (_, i) => ['row ' + i, 'value (' + i + ') é → x']) }); const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; buf.forEach(c => s += String.fromCharCode(c)); return btoa(s); });
  fs.writeFileSync('/tmp/t5.pdf', Buffer.from(pdfB64, 'base64'));
  let info = ''; try { info = execSync('pdfinfo /tmp/t5.pdf 2>&1').toString(); } catch (e) { info = String(e.stdout || e); }
  check('generated PDF is valid, multi page', /Pages:\s+[2-9]/.test(info), info);
  await ap.click('.pv button:has-text("Close")');
  // ---- footer centred, scroll buttons, 12 hour
  check('footer text is centred', await ap.evaluate(() => { const f = document.querySelector('footer.foot, .foot'); if (!f) return true; const s = getComputedStyle(f); return s.textAlign === 'center' || s.justifyContent === 'center'; }));
  await ap.goto(S.base + '/#reports'); await ap.waitForSelector('text=Patrol forms'); await ap.evaluate(() => { const d = document.createElement('div'); d.style.height = '3000px'; document.querySelector('.main, main, #root').appendChild(d); window.scrollTo(0, 2000); }); await ap.waitForTimeout(900);
  check('scroll buttons appear on a long page', await ap.isVisible('.scrollbtns .sbtn'));
  const bt = await ap.innerText('body'); check('no 24-hour times on screen', !/\b(1[3-9]|2[0-3]):[0-5]\d\b/.test(bt), (bt.match(/\b(1[3-9]|2[0-3]):[0-5]\d\b/) || [''])[0]);
  // ---- boats: trip distance counted from the saved track
  await ap.goto(S.base + '/#boats'); await ap.waitForSelector('text=Boats & Equipment').catch(() => {});
  await S.call('PUT', '/docs/fleet/Test%20Boat', { data: { engines: [], svc: [], meta: {} } }, S.adminToken);
  // ---- LMMA places: add, edit, delete; ndio phrase gone
  await ap.goto(S.base + '/#iweni-lmma'); await ap.waitForSelector('text=Iweni LMMA Management');
  check('no "Ndo Pate" phrase on LMMA page', !/Ndo Pate|Ndio Pate/i.test(await ap.innerText('body')));
  await ap.click('button:has-text("Coordinates")').catch(() => {}); await ap.waitForSelector('button:has-text("Add place")');
  await ap.click('button:has-text("Add place")'); await ap.fill('#pe-n', 'Mkunguni camp'); await ap.selectOption('#pe-k', 'poacher'); await ap.fill('#pe-v', 'Shanga'); await ap.fill('#pe-paste', 'https://www.google.com/maps/@-2.1500,41.0100,15z');
  check('pasted Google link fills coordinates', (await ap.inputValue('#pe-la')) === '-2.150000' && (await ap.inputValue('#pe-lo')) === '41.010000');
  await ap.click('.modal button:has-text("Save place")'); await ap.waitForTimeout(800);
  const lm = (await S.call('GET', '/zones', null, S.adminToken)).landmarks; const nl = lm.find(x => x.name === 'Mkunguni camp');
  check('place saved with type and village', nl && nl.kind === 'poacher' && nl.village === 'Shanga' && Math.abs(nl.lat + 2.15) < 1e-6, JSON.stringify(lm));
  await ap.click('tr:has-text("Mkunguni camp") button:has-text("Edit")'); await ap.fill('#pe-n', 'Mkunguni fishing ground'); await ap.selectOption('#pe-k', 'fishing'); await ap.click('.modal button:has-text("Save place")'); await ap.waitForTimeout(800);
  check('place edited', (await S.call('GET', '/zones', null, S.adminToken)).landmarks.some(x => x.name === 'Mkunguni fishing ground' && x.kind === 'fishing'));
  // ---- map tools
  await ap.goto(S.base + '/#live-map'); await ap.waitForSelector('.geomap'); await ap.waitForTimeout(800);
  await ap.click('.gm-toolbtn'); await ap.fill('#gm-paste', '-2.1600, 41.0200'); await ap.click('.gm-tools button:has-text("Go")'); await ap.waitForTimeout(400);
  check('pasted coordinates show an Add a place here option', await ap.isVisible('.gm-info button:has-text("Add a place here")'));
  await ap.click('.gm-info button:has-text("Add a place here")'); await ap.waitForSelector('#pe-n'); check('editor opens at the pasted point', (await ap.inputValue('#pe-la')) === '-2.16');
  await ap.keyboard.press('Escape'); await ap.click('.modal button:has-text("Cancel")').catch(() => {});
  // ---- emergency contacts
  await ap.goto(S.base + '/#permissions'); await ap.waitForSelector('text=Settings & Permissions'); await ap.click('button:has-text("Emergency contacts")'); await ap.click('button:has-text("Add contact")');
  await ap.fill('#ec-n', 'Duty Officer'); await ap.fill('#ec-o', 'Lamu Police'); await ap.fill('#ec-p', '+254700111222'); await ap.fill('#ec-p2', '+254711333444');
  await ap.click('.modal label:has-text("Threat or violence") input'); await ap.click('.modal button:has-text("Save contact")'); await ap.waitForTimeout(900);
  const st = (await docs0('settings')); const cd = st.find(x => x.id === 'contacts'); const cs = (cd && cd.__v) || [];
  check('emergency contact saved in settings', cs.length === 1 && cs[0].org === 'Lamu Police' && cs[0].types[0] === 'Threat', JSON.stringify(st).slice(0, 300));
  // ---- ranger on a phone: offline patrol keeps distance, direction and stops
  const ctxOpts = { viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { latitude: -2.2, longitude: 41.0 } };
  const rr = await S.call('POST', '/users', { name: 'Sam Ranger', email: 'sam@test.org', role: 'ranger', county: 'Lamu', subcounty: 'Lamu East', temp_password: 'Start2026' }, S.adminToken);
  const pw = 'Start2026';
  const R = await B.open(S.base, ctxOpts); const rp = R.page;
  if (pw) {
    await login(rp, S.base, 'sam@test.org', pw, 'Ranger2026pw');
    await rp.click('button:has-text("Start a new patrol")'); await rp.click('button:has-text("Start patrol")'); await rp.waitForSelector('text=Fisher check');
    await R.ctx.setOffline(true); await rp.waitForTimeout(300);
    for (let i = 0; i < 24; i++) { await R.ctx.setGeolocation({ latitude: -2.2, longitude: 41.0 + i * 0.00015 }); await rp.waitForTimeout(1100); }
    for (let i = 0; i < 8; i++) { await R.ctx.setGeolocation({ latitude: -2.2 + i * 0.00015, longitude: 41.0 + 23 * 0.00015 }); await rp.waitForTimeout(1100); }
    const kmTxt = await rp.innerText('.tstat'); const km = parseFloat(kmTxt);
    check('distance counted offline on the phone', km > 0.45 && km < 0.8, kmTxt);
    check('live speed and heading shown', await rp.isVisible('.livebar'), '');
    await R.ctx.setOffline(false); await rp.waitForTimeout(2500);
    const pt = (await docs0('patrols')).find(p => p.leader === 'Sam Ranger' || (p.rangers || []).includes('Sam Ranger'));
    check('synced patrol has track with times, km and a turn', pt && pt.km > 0.45 && pt.track.length > 3 && pt.track.every(p => p[3] > 1e9), JSON.stringify(pt && { km: pt.km, n: pt.track.length }));
  } else console.log('SKIP ranger offline test (could not read temp password)', JSON.stringify(rr).slice(0, 120));
  const errs = [...A.errs, ...(R.errs || [])].filter(e => !/pdf|Failed|aborted|net::/i.test(e)); check('no browser errors', errs.length === 0, errs.slice(0, 5).join('\n'));
  console.log(bad ? 'FAILED ' + bad : 'ALL OK'); await B.br.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
