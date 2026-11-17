// Shared helpers: start the real server on a free port, create one user per role, open pages with the CDN libraries served locally.
const { chromium } = require('playwright');
const path = require('node:path');
const { createApp } = require('../server/index');
const ROLES = ['admin', 'board', 'ranger', 'cox', 'officer', 'fisheries', 'bmu', 'tourfin'];
const MODS = ['dashboard', 'live-map', 'patrols', 'incidents', 'iweni-lmma', 'projects', 'coral', 'staff', 'bmus', 'partners', 'boats', 'tourism', 'finance', 'reports', 'permissions', 'audit'];
async function start() {
  const { server } = createApp({ dbFile: ':memory:', webDir: path.join(__dirname, '../web/dist'), adminEmail: 'admin@test.org', adminPassword: 'Temp1234' });
  await new Promise((ok) => server.listen(0, ok));
  const base = 'http://127.0.0.1:' + server.address().port;
  const call = async (m, p, b, t) => (await fetch(base + '/api' + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
  let l = await call('POST', '/login', { email: 'admin@test.org', password: 'Temp1234' });
  const ch = await call('POST', '/password', { current: 'Temp1234', password: 'Admin2026pw' }, l.token);
  const tok = ch.token; const users = {};
  for (const r of ROLES.filter((x) => x !== 'admin')) { const u = await call('POST', '/users', { name: 'User ' + r, email: r + '@test.org', role: r, county: 'Lamu', subcounty: 'Lamu East', bmu: r === 'bmu' ? 'pate' : '', temp_password: 'Start2026' }, tok); users[r] = u.user; }
  return { server, base, call, adminToken: tok, users };
}
async function browser() {
  const sharp = require('sharp'); const TILE = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#2a6f8f' } }).png().toBuffer();
  const br = await chromium.launch();
  const open = async (base, opts = {}) => {
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, ...opts }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/Failed to load resource|favicon/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
    await page.route('**/*', (r) => {
      const u = r.request().url();
      if (u.startsWith(base)) return r.continue();
      if (u.includes('react.production.min.js')) return r.fulfill({ path: path.join(__dirname, 'react-bundle.js'), contentType: 'application/javascript' });
      if (u.includes('react-dom.production.min.js')) return r.fulfill({ body: '', contentType: 'application/javascript' });
      if (u.includes('htm.umd.js')) return r.fulfill({ path: path.join(__dirname, 'mini-htm.js'), contentType: 'application/javascript' });
      if (u.includes('fonts.googleapis') || u.includes('fonts.gstatic')) return r.fulfill({ body: '', contentType: 'text/css' });
      if (/arcgisonline|openstreetmap/.test(u)) return r.fulfill({ body: TILE, contentType: 'image/png' });
      return r.abort();
    });
    return { page, errs, ctx };
  };
  return { br, open };
}
const login = async (page, base, email, pw, newpw) => {
  await page.goto(base); await page.fill('#em', email); await page.fill('#pw', pw); await page.click('button[type=submit]');
  if (newpw) { await page.waitForSelector('#np'); await page.fill('#cp', pw); await page.fill('#np', newpw); await page.fill('#np2', newpw); await page.click('button[type=submit]'); }
  await page.waitForSelector('.app, .fa', { timeout: 10000 });
};
module.exports = { start, browser, login, ROLES, MODS };
