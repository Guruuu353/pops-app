const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const ref = require('./reference');

const SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL,
  county TEXT, subcounty TEXT, bmu TEXT DEFAULT '', pw_hash TEXT NOT NULL, must_change INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1, token_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, last_login TEXT);
CREATE TABLE IF NOT EXISTS projects(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, partner TEXT, description TEXT, status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT, end_date TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS project_members(
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(project_id,user_id));
CREATE TABLE IF NOT EXISTS boats(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, reg TEXT, engine_count INTEGER NOT NULL DEFAULT 1,
  tracks_hours INTEGER NOT NULL DEFAULT 0, svc_interval REAL NOT NULL DEFAULT 100, warn_before REAL NOT NULL DEFAULT 10,
  notes TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS boat_service(
  id TEXT PRIMARY KEY, boat_id TEXT NOT NULL REFERENCES boats(id) ON DELETE CASCADE, engine INTEGER NOT NULL,
  date TEXT NOT NULL, meter_h REAL, note TEXT, by_user TEXT);
CREATE TABLE IF NOT EXISTS records(
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT, occurred_at TEXT, data TEXT NOT NULL, imported INTEGER NOT NULL DEFAULT 0, import_batch TEXT,
  version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, submitted_at TEXT,
  reviewed_by TEXT, reviewed_at TEXT, review_note TEXT);
CREATE INDEX IF NOT EXISTS rec_kind ON records(kind,occurred_at);
CREATE INDEX IF NOT EXISTS rec_author ON records(author_id,status);
CREATE TABLE IF NOT EXISTS attachments(
  id TEXT PRIMARY KEY, record_id TEXT, label TEXT, mime TEXT, size INTEGER, data BLOB, uploaded_by TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS zones(id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, stated_km2 REAL, feature TEXT NOT NULL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS infringements(code TEXT PRIMARY KEY, category TEXT NOT NULL, label TEXT NOT NULL, paper INTEGER, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS fees(code TEXT PRIMARY KEY, label TEXT NOT NULL, currency TEXT NOT NULL, amount REAL NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS docs(
  coll TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, author_id TEXT, version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(coll,id));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, user_id TEXT, action TEXT NOT NULL, entity TEXT, entity_id TEXT, detail TEXT);
`;

const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64);
  return `s1$${salt.toString('hex')}$${h.toString('hex')}`;
}
function checkPw(pw, stored) {
  const [v, s, h] = String(stored).split('$');
  if (v !== 's1') return false;
  const got = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64);
  const want = Buffer.from(h, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  try { db.exec("ALTER TABLE users ADD COLUMN bmu TEXT DEFAULT ''"); } catch (e) { /* column already there */ }
  const get = (k, d) => { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(k); return r ? JSON.parse(r.value) : d; };
  const set = (k, v) => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, JSON.stringify(v));
  db.getSetting = get; db.setSetting = set;
  return db;
}

// Seed reference data on first start only. No users other than the first administrator, and no activity records.
function seed(db, { adminEmail, adminPassword } = {}) {
  const out = { adminCreated: false, tempPassword: null };
  if (!db.getSetting('secret')) db.setSetting('secret', crypto.randomBytes(32).toString('hex'));
  if (!db.getSetting('seeded')) {
    db.exec('BEGIN');
    try {
      for (const z of ref.SEED_ZONES)
        db.prepare('INSERT INTO zones(id,name,kind,stated_km2,feature,updated_at) VALUES(?,?,?,?,?,?)').run(z.id, z.name, z.kind, z.stated_km2, JSON.stringify(z.feature), nowIso());
      for (const i of ref.INFRINGEMENTS)
        db.prepare('INSERT INTO infringements(code,category,label,paper) VALUES(?,?,?,?)').run(i.code, i.category, i.label, i.paper);
      for (const f of ref.FEES) db.prepare('INSERT INTO fees(code,label,currency,amount) VALUES(?,?,?,?)').run(f.code, f.label, f.currency, f.amount);
      ref.PROJECTS.forEach((p, i) => db.prepare('INSERT INTO docs(coll,id,data,author_id,created_at,updated_at) VALUES(?,?,?,?,?,?)').run('projects', 'p' + (i + 1), JSON.stringify({ name: p.name, partner: p.partner, desc: p.description, status: 'Active' }), null, nowIso(), nowIso()));
      db.setSetting('bmu', ref.BMU);
      db.setSetting('points', ref.LMMA_POINTS);
      db.setSetting('compliance', { daily_required: true, cutoff_hour: 20 });
      db.setSetting('seeded', true);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  // Upgrade zones that still hold the first placeholder shapes (convex hulls) to the ordered-table shapes. Edited zones are left alone.
  for (const z of ref.SEED_ZONES) {
    const row = db.prepare('SELECT feature FROM zones WHERE id=?').get(z.id);
    if (!row) continue;
    let note = ''; try { note = (JSON.parse(row.feature).properties || {}).note || ''; } catch (e) {}
    if (/convex hull|^Placeholder|^Hull of/i.test(note))
      db.prepare('UPDATE zones SET feature=?,updated_at=? WHERE id=?').run(JSON.stringify(z.feature), nowIso(), z.id);
  }
  const n = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (n === 0) {
    const email = (adminEmail || 'admin@patteconservation.org').toLowerCase();
    const pw = adminPassword || crypto.randomBytes(6).toString('base64url');
    db.prepare('INSERT INTO users(id,name,email,role,county,subcounty,pw_hash,must_change,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(uid(), 'System Administrator', email, 'admin', 'Lamu', 'Lamu East', hashPw(pw), 1, nowIso());
    out.adminCreated = true; out.tempPassword = pw; out.adminEmail = email;
  }
  return out;
}

module.exports = { open, seed, uid, nowIso, hashPw, checkPw };
