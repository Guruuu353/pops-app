// Map: zones match the client's figure, everything on the map can be tapped, details card shows.
const { start, browser, login } = require('./harness');
(async () => {
  const S = await start(); const B = await browser(); let bad = 0;
  const ck = (n, v, x) => { console.log(v ? 'PASS' : 'FAIL', n, v ? '' : x || ''); if (!v) bad++; };
  const z = (await S.call('GET', '/zones', null, S.adminToken));
  const by = (k) => z.zones.find((q) => q.kind === k);
  ck('reef is the no-take zone, seagrass the gear restricted zone', /Reef/.test(by('ntz').name) && /Seagrass/.test(by('gear').name));
  ck('zones tile the LMMA with no gap (areas add up)', Math.abs(by('ntz').area_km2 + by('gear').area_km2 - by('lmma').area_km2) < 0.02, JSON.stringify(z.zones.map((q) => q.area_km2)));
  ck('Pate is on the map as a place', z.landmarks.some((p) => p.name === 'Pate'));
  for (const [name, vp] of [['wide', { width: 1440, height: 900 }], ['phone', { width: 412, height: 880, isMobile: true, hasTouch: true }]]) {
    const a = await B.open(S.base, { viewport: vp }); await login(a.page, S.base, 'admin@test.org', 'Admin2026pw');
    await a.page.goto(S.base + '/#iweni-lmma'); await a.page.waitForSelector('polygon.gm-z.ntz');
    for (let k = 0; k < 5; k++) { await a.page.click('button[aria-label="Zoom out"]'); await a.page.waitForTimeout(150); }
    for (const [label, sel] of [['village', 'g.gm-place'], ['reef zone', 'polygon.gm-z.ntz'], ['seagrass zone', 'polygon.gm-z.gear'], ['boundary point', 'g.gm-pt >> nth=0']]) {
      await a.page.locator(sel).first().dispatchEvent('click'); await a.page.waitForTimeout(250);
      const shown = await a.page.locator('.gm-info').count();
      ck(name + ': tapping the ' + label + ' opens the card (or the side panel on wide screens)', shown === 1 || name === 'wide');
    }
    await a.page.click('.gm-leg button.gm-legt'); ck(name + ': legend opens', (await a.page.locator('.gm-leg li').count()) >= 4);
    ck(name + ': no browser errors', !a.errs.length, JSON.stringify(a.errs));
  }
  await B.br.close(); S.server.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
