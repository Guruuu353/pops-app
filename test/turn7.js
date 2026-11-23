const { start, browser, login } = require('./harness');
(async () => {
  const S = await start(); const B = await browser(); let bad = 0;
  const check = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' :: ' + (x || ''))); if (!c) bad++; };
  const A = await B.open(S.base, { permissions: ['geolocation'] }); const ap = A.page; await login(ap, S.base, 'admin@test.org', 'Admin2026pw');
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(Date.now() - 864e5); const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const txt = d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
  const t = []; for (let i = 0; i < 40; i++) t.push([-2.2 + Math.sin(i / 6) * 0.001, 41.0 + i * 0.0004, 0, 1760000000 + i * 5]);
  await S.call('PUT', '/docs/patrols/PT-A', { data: { id: 'PT-A', iso, date: txt, leader: 'Amina Hassan', rangers: ['Amina'], status: 'Completed', start: '14:05', end: '17:30', track: t, km: 1.9, enc: [], seiz: [], events: [], review: 'Pending review', seen: new Date().toISOString() } }, S.adminToken);
  await ap.evaluate(async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); });
  await ap.goto(S.base + '/#dashboard'); await ap.goto(S.base + '/#live-map'); await ap.reload(); await ap.waitForSelector('.routebar', { timeout: 10000 });
  await ap.click('.routebar button:has-text("All patrols")'); await ap.waitForTimeout(600);
  // zoom in a bit then pan, so the view is not the starting one
  for (let i = 0; i < 2; i++) await ap.click('.gm-ctl button[aria-label="Zoom in"]');
  await ap.waitForTimeout(300);
  const pts = () => ap.evaluate(() => document.querySelector('polyline.gm-track') && document.querySelector('polyline.gm-track').getAttribute('points').slice(0, 40));
  const before = await pts();
  await ap.locator('polyline.gm-track').first().click({ force: true }); await ap.waitForTimeout(500);
  check('clicking a route does not move the map', (await pts()) === before, before + ' vs ' + await pts());
  await ap.click('.routebar select, .routebar button:has-text("Live routes only")'); await ap.waitForTimeout(300);
  await ap.click('.routebar button:has-text("All patrols")'); await ap.waitForTimeout(500);
  const b2 = await pts(); await ap.locator('polyline.gm-track').first().click({ force: true }); await ap.waitForTimeout(400);
  await ap.click('.gm-ctl button[aria-label="Zoom in"]'); await ap.waitForTimeout(300);
  await ap.locator('polyline.gm-track').first().click({ force: true }); await ap.waitForTimeout(400);
  check('map stays where the user put it after zoom and clicks (no snap back)', !!(await pts()) && (await pts()) !== b2, await pts());
  // gallery in preview
  await ap.evaluate(() => { openPreview({ url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>', name: 'a.svg', mime: 'image/svg+xml', list: [1, 2, 3].map(n => ({ url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>', name: 'img' + n + '.svg', mime: 'image/svg+xml' })), idx: 0 }); });
  await ap.waitForSelector('.pv-nav.next'); check('preview shows 1 of 3', /1 of 3/.test(await ap.innerText('.pv header')));
  await ap.click('.pv-nav.next'); check('next image', /2 of 3/.test(await ap.innerText('.pv header')) && /img2/.test(await ap.innerText('.pv header')));
  await ap.keyboard.press('ArrowLeft'); await ap.click('.pv-nav.prev'); check('previous wraps to the last', /3 of 3/.test(await ap.innerText('.pv header')));
  check('no page errors', A.errs.filter(e => !/eolocation|tile|ERR_|Failed to load/i.test(e)).length === 0, A.errs.join('|'));
  console.log(bad ? bad + ' FAILED' : 'ALL PASS'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
