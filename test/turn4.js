// Turn 4 features. Run: node --no-warnings test/turn4.js
const { start, browser, login } = require('./harness');
(async () => {
  const S = await start(); const B = await browser(); let bad = 0;
  const check = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' :: ' + (x || ''))); if (!c) bad++; };
  const docs0 = async (coll) => (await S.call('GET', '/docs', null, S.adminToken)).docs[coll] || [];
  await S.call('POST', '/users', { name: 'Sara Ranger', email: 'sara@test.org', role: 'ranger', county: 'Lamu', subcounty: 'Lamu East', phone: '0712000111', title: 'Marine Ranger', temp_password: 'Start2026' }, S.adminToken);
  const A = await B.open(S.base, { viewport: { width: 1440, height: 900 } }); const ap = A.page;
  await login(ap, S.base, 'admin@test.org', 'Admin2026pw');
  // patrol with several BMUs, agencies, other leader
  await ap.goto(S.base + '/#patrols'); await ap.waitForSelector('text=Patrols & Field Activities');
  await ap.click('button:has-text("New patrol"), button:has-text("Create")');
  await ap.click('button:has-text("Joint with other BMUs")');
  await ap.click('label:has-text("Shela BMU") input'); await ap.click('label:has-text("Faza BMU") input');
  await ap.fill('[aria-label="Other BMU name"]', 'Siyu BMU'); await ap.click('.modal button:has-text("Add") >> nth=0');
  await ap.click('label:has-text("Kenya Wildlife Service") input'); await ap.click('label:has-text("Kenya Forest") input').catch(() => {});
  await ap.fill('[aria-label="Other agency name"]', 'Lamu Conservation Trust'); await ap.click('.modal button:has-text("Add") >> nth=1');
  await ap.selectOption('#pl', '__other');
  await ap.fill('#plon', 'Juma Other'); await ap.fill('#plop', '0799123456'); await ap.selectOption('#plrb', 'Sara Ranger');
  await ap.click('.modal button:has-text("Create and assign")'); await ap.waitForTimeout(1500);
  const ps = await docs0('patrols'); const p = ps[0] || {};
  check('patrol keeps several BMUs', (p.jointWith || []).includes('shela') && (p.jointWith || []).includes('faza') && (p.bmuOther || []).includes('Siyu BMU'), JSON.stringify(p).slice(0, 300));
  check('patrol keeps agencies and typed agency', (p.agencies || []).includes('kws') && (p.partnersOther || []).includes('Lamu Conservation Trust'));
  check('other leader name and phone saved, runs on ranger device', p.leader === 'Juma Other' && p.leaderOther && p.leaderOther.phone === '0799123456' && (p.rangers || [])[0] === 'Sara Ranger');
  // phone: share location popover is reachable
  const P = await B.open(S.base, { viewport: { width: 360, height: 640 } }); const pp = P.page;
  await login(pp, S.base, 'admin@test.org', 'Admin2026pw');
  await pp.click('button:has-text("Share location")'); await pp.waitForSelector('.sharepop');
  const bx = await pp.locator('.sharepop').boundingBox();
  check('share location panel fits a 360 px phone', bx && bx.x >= 0 && bx.x + bx.width <= 360 && bx.y >= 0 && bx.y + bx.height <= 640, JSON.stringify(bx));
  await pp.click('.sharepop input[type=checkbox]');
  check('share location checkbox is clickable', await pp.isChecked('.sharepop input[type=checkbox]'));
  await pp.click('.sharepop button:has-text("Done")');
  // map world zoom and live list
  await ap.goto(S.base + '/#live-map'); await ap.waitForSelector('.geomap');
  await ap.click('[aria-label="Show the whole earth"]'); await ap.waitForTimeout(300);
  check('world button turns into back button', await ap.isVisible('[aria-label="Back to the LMMA"]'));
  await ap.click('[aria-label="Back to the LMMA"]');
  // tourism entry with vessel, other BMU, receipt
  await ap.goto(S.base + '/#tourism'); await ap.waitForSelector('text=New visitor entry'); await ap.click('button:has-text("New visitor entry")');
  await ap.fill('#tn', 'Test group'); await ap.fill('#tvn', 'Mihreen'); await ap.fill('#tvr', 'lfb 3817');
  await ap.selectOption('#tb', 'other'); await ap.fill('#tbo', 'Kiunga'); await ap.selectOption('#tfb', 'shela'); await ap.selectOption('#ttb', 'other'); await ap.fill('#tto', 'Siyu');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await ap.setInputFiles('#trcf', { name: 'r.png', mimeType: 'image/png', buffer: png }); await ap.waitForSelector('.rcpt-v');
  await ap.click('.modal button:has-text("Submit")'); await ap.waitForTimeout(1500);
  const t = (await docs0('tour'))[0] || {};
  check('visitor entry has typed vessel, registration, movement, other BMU', t.vessel === 'Mihreen' && t.vreg === 'LFB 3817' && t.fromBmu === 'shela' && t.toOther === 'Siyu' && t.bmuOther === 'Kiunga', JSON.stringify(t).slice(0, 300));
  check('receipt stored with the record', t.rcpt && t.rcpt.url, JSON.stringify(t.rcpt || {}).slice(0, 80));
  // imported patrol fills the forms from the entry log
  await S.call('PUT', '/docs/patrols/IMP-1', { data: { id: 'IMP-1', iso: '2025-05-19', date: '19 May 2025', leader: 'Ali Shee', rangers: ['Ali Shee'], bmu: 'pate', start: '16:00', end: '18:30', status: 'Completed', imported: true, challenges: 'No boundary markers', observations: 'Fishermen inside', action: 'Awareness' } }, S.adminToken);
  await S.call('PUT', '/docs/incidents/IMPI-1', { data: { id: 'IMPI-1', iso: '2025-05-19', date: '19 May 2025', time: '17:00', cat: 'Infringement', imported: true, patrol: '—', code: 'H1', personsList: [{ name: 'Said Omar', id: '', phone: '' }], persons: 'Said Omar', desc: 'Stone collecting', action: 'Warning', loc: 'Inside the LMMA', stage: 0 } }, S.adminToken);
  await ap.goto(S.base + '/#patrols'); await ap.waitForSelector('text=Patrols & Field Activities'); await ap.waitForTimeout(12000);
  await ap.click('text=IMP-1').catch(() => {}); await ap.waitForTimeout(500);
  const forms = ap.locator('button:has-text("Forms"), [role=tab]:has-text("Forms")'); if (await forms.count()) await forms.first().click();
  await ap.waitForSelector('.paper', { timeout: 8000 }).catch(() => {});
  const ptxt = await ap.innerText('.paper').catch(() => '');
  check('imported patrol Form 1A shows the entry-log row', /Said Omar/.test(ptxt) && /Stone collecting/.test(ptxt), ptxt.slice(0, 200));
  const hb = await ap.evaluate(() => { const h = document.querySelector('.pp-head'), l = document.querySelector('.pp-logo'); if (!h || !l) return null; const a = h.getBoundingClientRect(), b = l.getBoundingClientRect(); return { rule: a.bottom, logo: b.bottom }; });
  check('logo sits above the header rule', hb && hb.logo <= hb.rule - 1, JSON.stringify(hb));
  // outbox: offline save then reconnect
  await A.ctx.setOffline(true);
  await ap.goto(S.base + '/#projects').catch(() => {});
  await ap.evaluate(() => (0, eval)("ob.push({coll:'projects',id:'prj-offline',data:{id:'prj-offline',name:'Offline Project',status:'Active'}})"));
  await ap.waitForTimeout(500);
  check('record waits in the outbox offline', (await docs0('projects')).every((x) => x.id !== 'prj-offline'));
  await A.ctx.setOffline(false); await ap.evaluate(() => (0, eval)('ob.flush()')); await ap.waitForTimeout(1500);
  check('record sent after the network returns', (await docs0('projects')).some((x) => x.id === 'prj-offline'));
  // a refused record does not block the rest
  await ap.evaluate(() => { (0, eval)("ob.push({coll:'projects',id:'bad/id',data:{id:'bad/id',name:'x'}})"); (0, eval)("ob.push({coll:'projects',id:'prj-after',data:{id:'prj-after',name:'After',status:'Active'}})"); return (0, eval)('ob.flush()'); });
  await ap.waitForTimeout(1500);
  check('refused record is flagged and the next one still sent', (await docs0('projects')).some((x) => x.id === 'prj-after') && await ap.evaluate(() => (0, eval)('ob.failed().length')) === 1);
  // GPS: jitter and jumps are not distance; real movement is
  const R = await B.open(S.base, { viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { latitude: -2.2, longitude: 41.0, accuracy: 10 } }); const rp = R.page;
  await login(rp, S.base, 'sara@test.org', 'Start2026', 'Pass2026word');
  await rp.click('button:has-text("Start a new patrol")'); await rp.click('button:has-text("Start patrol")'); await rp.waitForSelector('text=Fisher check');
  const mv = async (la, lo, acc = 10) => { await R.ctx.setGeolocation({ latitude: la, longitude: lo, accuracy: acc }); await rp.waitForTimeout(1300); };
  for (let i = 0; i < 6; i++) await mv(-2.2 + (i % 2 ? 0.00003 : -0.00003), 41.0 + (i % 2 ? -0.00002 : 0.00002));
  const km0 = await rp.evaluate(() => (0, eval)('0') ) ;
  await mv(-2.2, 41.0, 300); await mv(-2.5, 41.3);
  await rp.waitForTimeout(500);
  for (let i = 1; i <= 5; i++) await mv(-2.2 + i * 0.0001, 41.0);
  await rp.waitForTimeout(21000);
  const pt = (await docs0('patrols')).find((x) => x.leader === 'Sara Ranger' && x.status === 'Active') || {};
  check('standing still with GPS drift adds no distance, a 300 m fix and a glitch jump are ignored; real walk counts', pt.km > 0.03 && pt.km < 0.08, 'km=' + pt.km + ' pts=' + (pt.track || []).length);
  console.log(bad ? 'FAILED ' + bad : 'ALL TURN 4 OK'); process.exit(bad ? 1 : 0);
})();
