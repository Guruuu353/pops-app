const { start, browser, login } = require('./harness');
(async () => {
  const S = await start(); const B = await browser();
  const out = (n) => '../shots/' + n + '.png';
  const adm = await B.open(S.base, { viewport: { width: 1440, height: 900 } });
  await login(adm.page, S.base, 'admin@test.org', 'Admin2026pw');
  await adm.page.goto(S.base + '/#iweni-lmma'); await adm.page.waitForTimeout(1500); await adm.page.screenshot({ path: out('lmma-desk') });
  await adm.page.goto(S.base + '/#live-map'); await adm.page.waitForTimeout(1500); await adm.page.screenshot({ path: out('livemap-desk') });
  for (const [w, h, tag] of [[390, 844, 'm'], [768, 1024, 't']]) {
    const m = await B.open(S.base, { viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: true });
    await login(m.page, S.base, 'admin@test.org', 'Admin2026pw');
    for (const r of ['dashboard', 'patrols', 'iweni-lmma', 'boats', 'staff', 'tourism', 'reports', 'import']) { await m.page.goto(S.base + '/#' + r); await m.page.waitForTimeout(900); await m.page.screenshot({ path: out(tag + '-' + r) }); const ov = await m.page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 2) console.log('OVERFLOW', tag, r, ov); }
  }
  const rg = await B.open(S.base, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await login(rg.page, S.base, 'ranger@test.org', 'Start2026', 'Ranger2026pw'); await rg.page.waitForTimeout(1200); await rg.page.screenshot({ path: out('m-ranger') });
  const rd = await B.open(S.base, { viewport: { width: 1440, height: 900 } });
  await login(rd.page, S.base, 'ranger@test.org', 'Ranger2026pw'); await rd.page.waitForTimeout(1200); await rd.page.screenshot({ path: out('d-ranger') });
  await B.br.close(); S.server.close();
})().catch(e => { console.error(e); process.exit(1); });
