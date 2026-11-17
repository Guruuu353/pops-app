const { start, browser, login, ROLES, MODS } = require('./harness');
const path = require('node:path');
(async () => {
  const S = await start(); const B = await browser(); let bad = 0;
  for (const role of ROLES) {
    const { page, errs } = await B.open(S.base);
    await login(page, S.base, role === 'admin' ? 'admin@test.org' : role + '@test.org', role === 'admin' ? 'Admin2026pw' : 'Start2026', role === 'admin' ? null : 'Pass2026word');
    await page.waitForTimeout(300);
    const boot = errs.splice(0); if (boot.length) { bad++; console.log(role, 'BOOT', boot.join(' | ')); }
    for (const m of MODS) {
      await page.evaluate((h) => { location.hash = h; }, m); await page.waitForTimeout(80);
      const info = await page.evaluate(() => ({ len: (document.querySelector('#content') || document.body).innerText.length }));
      const e = errs.splice(0);
      if (e.length || info.len < 20) { bad++; console.log(role, m, info.len, e.join(' | ').slice(0, 400)); }
    }
    await page.screenshot({ path: path.join(__dirname, 'shots', 'role-' + role + '.png') });
    await page.close();
  }
  await B.br.close(); S.server.close(); console.log(bad ? 'PROBLEMS: ' + bad : 'ALL ROLES x MODULES OK');
})().catch((e) => { console.error(e); process.exit(1); });
