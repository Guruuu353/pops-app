const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { open, seed, uid, nowIso, hashPw, checkPw } = require('./db');
const D = require('./domain');
const { ROLES } = require('./reference');

const nairobiNow = () => { const p = new Date(Date.now() + 3 * 3600e3).toISOString(); return { date: p.slice(0, 10), hour: +p.slice(11, 13) }; };
const ROLE_KEYS = Object.keys(ROLES);
const PW_RULE = (p) => (typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p) ? null : 'Password needs at least 8 characters with letters and numbers');

class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const bad = (m) => new HttpError(400, m), forbid = (m = 'Not allowed') => new HttpError(403, m), nf = (m = 'Not found') => new HttpError(404, m);

function createApp({ dbFile, webDir, adminEmail, adminPassword }) {
  const db = open(dbFile);
  const boot = seed(db, { adminEmail, adminPassword });
  const secret = db.getSetting('secret');
  const q = (sql, ...a) => db.prepare(sql).all(...a);
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const run = (sql, ...a) => db.prepare(sql).run(...a);
  const audit = (u, action, entity, id, detail) => run('INSERT INTO audit(ts,user_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?,?)', nowIso(), u ? u.id : null, action, entity, id, detail ? JSON.stringify(detail) : null);

  // ---- sessions: signed token, 12 h (72 h for field staff who may be offline at sea), invalidated when the password changes (token_version) ----
  const sign = (s) => crypto.createHmac('sha256', secret).update(s).digest('base64url');
  const mkToken = (u) => { const b = `${u.id}.${u.token_version}.${Date.now() + (['ranger', 'cox'].includes(u.role) ? 72 : 12) * 3600e3}`; return b + '.' + sign(b); };
  const readToken = (t) => {
    const p = String(t || '').split('.'); if (p.length !== 4) return null;
    const b = p.slice(0, 3).join('.'); const sg = Buffer.from(p[3]), ex = Buffer.from(sign(b));
    if (sg.length !== ex.length || !crypto.timingSafeEqual(sg, ex) || +p[2] < Date.now()) return null;
    const u = one('SELECT * FROM users WHERE id=?', p[0]);
    return u && u.active && u.token_version === +p[1] ? u : null;
  };
  const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, role_label: ROLES[u.role], county: u.county, subcounty: u.subcounty, bmu: u.bmu || '', phone: u.phone || '', title: u.title || '', emergency_name: u.emergency_name || '', emergency_phone: u.emergency_phone || '', active: !!u.active, must_change: !!u.must_change, last_login: u.last_login, created_at: u.created_at });

  const tries = new Map();
  const throttled = (k) => { const now = Date.now(); const a = (tries.get(k) || []).filter((t) => now - t < 15 * 60e3); tries.set(k, a); return a.length >= 8; };
  const fail = (k) => tries.set(k, [...(tries.get(k) || []), Date.now()]);

  const rowOut = (r) => ({ id: r.id, kind: r.kind, status: r.status, author_id: r.author_id, project_id: r.project_id, occurred_at: r.occurred_at, data: JSON.parse(r.data), imported: !!r.imported, version: r.version, created_at: r.created_at, updated_at: r.updated_at, submitted_at: r.submitted_at, reviewed_by: r.reviewed_by, reviewed_at: r.reviewed_at, review_note: r.review_note });
  const occurred = (d) => (d.date ? d.date + 'T' + (d.time || d.time_out || d.dep_time || '00:00') : null);
  const boatCtx = (d) => (d.boat_id ? { boat: one('SELECT * FROM boats WHERE id=?', d.boat_id) } : {});
  const sizeCheck = (d) => { if (JSON.stringify(d).length > 400000) throw bad('Record is too large'); };

  const mayEdit = (u, r) => {
    if (['admin'].includes(u.role)) return true;
    return r.author_id === u.id && ['draft', 'returned'].includes(r.status);
  };

  // ---------- uploaded files (scan images, photos) live on the server disk next to the database ----------
  const filesDir = path.join(path.dirname(dbFile), 'files'); fs.mkdirSync(filesDir, { recursive: true });
  db.exec('CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,name TEXT,mime TEXT,size INTEGER,author_id TEXT,created_at TEXT)');
  const OKMIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'application/pdf': '.pdf' };
  const fileSig = (id) => sign('file:' + id).slice(0, 22);
  const fileUrl = (id) => '/api/files/' + id + '?k=' + fileSig(id);
  const saveFile = (buf, mime, name, userId) => {
    if (!OKMIME[mime]) throw bad('Only images (JPG, PNG, WEBP) and PDF files can be stored');
    if (buf.length > 10 * 1024 * 1024) throw new HttpError(413, 'File is larger than 10 MB');
    const id = crypto.randomBytes(12).toString('hex');
    fs.writeFileSync(path.join(filesDir, id), buf);
    run('INSERT INTO files(id,name,mime,size,author_id,created_at) VALUES(?,?,?,?,?,?)', id, String(name || 'file').slice(0, 120), mime, buf.length, userId || null, nowIso());
    return { id, url: fileUrl(id), name: String(name || 'file').slice(0, 120), mime, size: buf.length };
  };
  // any photo pasted into a record as a data: address is moved to a file and replaced by its short address
  const moveInlineImages = (v, userId) => {
    if (typeof v === 'string') {
      const m = /^data:(image\/(?:jpeg|png|webp|gif)|application\/pdf);base64,/.exec(v);
      if (m && v.length > 1500) return saveFile(Buffer.from(v.slice(m[0].length), 'base64'), m[1], 'photo', userId).url;
      return v;
    }
    if (Array.isArray(v)) return v.map((x) => moveInlineImages(x, userId));
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = moveInlineImages(v[k], userId); return o; }
    return v;
  };

  // ---------- routes ----------
  const routes = [];
  const R = (m, p, auth, fn) => routes.push({ m, re: new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), auth, fn });

  R('POST', '/api/login', false, ({ body, ip }) => {
    const email = String(body.email || '').trim().toLowerCase(); const k = email + '|' + ip;
    if (throttled(k)) throw new HttpError(429, 'Too many attempts. Wait 15 minutes and try again.');
    const u = one('SELECT * FROM users WHERE email=?', email);
    if (!u || !u.active || !checkPw(String(body.password || ''), u.pw_hash)) { fail(k); audit(null, 'login_failed', 'user', null, { email }); throw new HttpError(401, 'Email or password is not correct'); }
    run('UPDATE users SET last_login=? WHERE id=?', nowIso(), u.id); audit(u, 'login', 'user', u.id);
    return { token: mkToken(u), user: pub(u) };
  });
  R('GET', '/api/me', true, ({ user }) => ({ user: pub(user) }));
  R('POST', '/api/password', true, ({ user, body }) => {
    if (!checkPw(String(body.current || ''), user.pw_hash)) throw new HttpError(400, 'Current password is not correct');
    const e = PW_RULE(body.password); if (e) throw bad(e);
    if (body.password === body.current) throw bad('Choose a different password from the temporary one');
    run('UPDATE users SET pw_hash=?, must_change=0, token_version=token_version+1 WHERE id=?', hashPw(body.password), user.id);
    audit(user, 'password_changed', 'user', user.id);
    const u = one('SELECT * FROM users WHERE id=?', user.id);
    return { token: mkToken(u), user: pub(u) };
  });

  // lookups for forms
  R('GET', '/api/lookups', true, ({ user }) => ({
    infringements: q('SELECT code,category,label,paper FROM infringements WHERE active=1 ORDER BY category,code'),
    fees: q('SELECT code,label,currency,amount,per FROM fees WHERE active=1'),
    projects: q("SELECT id,name,partner FROM projects WHERE status='active' ORDER BY name"),
    boats: q('SELECT * FROM boats WHERE active=1 ORDER BY name'),
    rangers: q("SELECT id,name,phone,title FROM users WHERE active=1 AND role='ranger' ORDER BY name"),
    coxswains: q("SELECT id,name,phone,title FROM users WHERE active=1 AND role='cox' ORDER BY name"),
    bmu: db.getSetting('bmu'), points: db.getSetting('points'), compliance: db.getSetting('compliance'), roles: ROLES,
    today: nairobiNow().date,
  }));

  R('PUT', '/api/fees/:code', true, ({ user, params, body }) => {
    if (!['admin', 'tourfin'].includes(user.role)) throw forbid('Only the administrator or the Tourism and Finance Officer can change prices');
    const code = String(params.code).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40); if (!code) throw bad('Invalid code');
    const label = String(body.label || '').trim(); if (!label) throw bad('Enter a name for the price');
    const amount = +body.amount; if (!isFinite(amount) || amount < 0) throw bad('Enter the amount');
    const cur = body.currency === 'USD' ? 'USD' : 'KES'; const per = ['guest', 'boat', 'group'].includes(body.per) ? body.per : 'guest';
    run('INSERT INTO fees(code,label,currency,amount,per,active) VALUES(?,?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET label=excluded.label,currency=excluded.currency,amount=excluded.amount,per=excluded.per,active=excluded.active', code, label, cur, amount, per, body.active === false ? 0 : 1);
    audit(user, 'fee_saved', 'fee', code, { label, amount, cur, per });
    return { fees: q('SELECT code,label,currency,amount,per FROM fees WHERE active=1') };
  });

  // ---- admin: users ----
  const adminOnly = (u) => { if (u.role !== 'admin') throw forbid('Administrators only'); };
  R('GET', '/api/users', true, ({ user }) => { if (!['admin', 'board'].includes(user.role)) throw forbid(); return { users: q('SELECT * FROM users ORDER BY name').map(pub) }; });
  R('POST', '/api/users', true, ({ user, body }) => {
    adminOnly(user);
    const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase();
    if (!name) throw bad('Name is required');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('A valid email is required');
    if (!ROLE_KEYS.includes(body.role)) throw bad('Choose a role');
    const e = PW_RULE(body.temp_password); if (e) throw bad(e);
    if (one('SELECT 1 FROM users WHERE email=?', email)) throw new HttpError(409, 'A user with that email already exists');
    const id = uid();
    run('INSERT INTO users(id,name,email,role,county,subcounty,bmu,phone,title,emergency_name,emergency_phone,pw_hash,must_change,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,?)', id, name, email, body.role, body.county || '', body.subcounty || '', body.bmu || '', String(body.phone || '').trim(), String(body.title || '').trim(), String(body.emergency_name || '').trim(), String(body.emergency_phone || '').trim(), hashPw(body.temp_password), nowIso());
    for (const pid of body.project_ids || []) if (one('SELECT 1 FROM projects WHERE id=?', pid)) run('INSERT OR IGNORE INTO project_members VALUES(?,?)', pid, id);
    audit(user, 'user_created', 'user', id, { email, role: body.role });
    return { user: pub(one('SELECT * FROM users WHERE id=?', id)) };
  });
  R('PATCH', '/api/users/:id', true, ({ user, params, body }) => {
    adminOnly(user);
    const u = one('SELECT * FROM users WHERE id=?', params.id); if (!u) throw nf();
    if (body.role && !ROLE_KEYS.includes(body.role)) throw bad('Unknown role');
    if (u.id === user.id && (body.active === false || (body.role && body.role !== 'admin'))) throw bad('You cannot deactivate or demote your own account');
    const f = { name: body.name ?? u.name, role: body.role ?? u.role, county: body.county ?? u.county, subcounty: body.subcounty ?? u.subcounty, bmu: body.bmu ?? u.bmu ?? '', phone: body.phone ?? u.phone ?? '', title: body.title ?? u.title ?? '', emergency_name: body.emergency_name ?? u.emergency_name ?? '', emergency_phone: body.emergency_phone ?? u.emergency_phone ?? '', active: body.active === undefined ? u.active : body.active ? 1 : 0 };
    run('UPDATE users SET name=?,role=?,county=?,subcounty=?,bmu=?,phone=?,title=?,emergency_name=?,emergency_phone=?,active=?,token_version=token_version+? WHERE id=?', f.name, f.role, f.county, f.subcounty, f.bmu, f.phone, f.title, f.emergency_name, f.emergency_phone, f.active, f.active ? 0 : 1, u.id);
    if (Array.isArray(body.project_ids)) { run('DELETE FROM project_members WHERE user_id=?', u.id); for (const pid of body.project_ids) run('INSERT OR IGNORE INTO project_members VALUES(?,?)', pid, u.id); }
    audit(user, 'user_updated', 'user', u.id, body);
    return { user: pub(one('SELECT * FROM users WHERE id=?', u.id)) };
  });
  R('POST', '/api/users/:id/reset', true, ({ user, params, body }) => {
    adminOnly(user);
    const e = PW_RULE(body.temp_password); if (e) throw bad(e);
    if (!one('SELECT 1 FROM users WHERE id=?', params.id)) throw nf();
    run('UPDATE users SET pw_hash=?, must_change=1, token_version=token_version+1 WHERE id=?', hashPw(body.temp_password), params.id);
    audit(user, 'password_reset', 'user', params.id);
    return { ok: true };
  });

  // ---- projects ----
  R('GET', '/api/projects', true, () => ({ projects: q('SELECT * FROM projects ORDER BY status, name').map((p) => ({ ...p, members: q('SELECT user_id FROM project_members WHERE project_id=?', p.id).map((m) => m.user_id) })) }));
  R('POST', '/api/projects', true, ({ user, body }) => {
    if (!['admin'].includes(user.role)) throw forbid();
    if (!String(body.name || '').trim()) throw bad('Project name is required');
    const id = uid();
    run('INSERT INTO projects(id,name,partner,description,start_date,end_date,created_at) VALUES(?,?,?,?,?,?,?)', id, body.name.trim(), body.partner || '', body.description || '', body.start_date || null, body.end_date || null, nowIso());
    for (const m of body.members || []) run('INSERT OR IGNORE INTO project_members VALUES(?,?)', id, m);
    audit(user, 'project_created', 'project', id, { name: body.name });
    return { id };
  });
  R('PATCH', '/api/projects/:id', true, ({ user, params, body }) => {
    if (!['admin'].includes(user.role)) throw forbid();
    const p = one('SELECT * FROM projects WHERE id=?', params.id); if (!p) throw nf();
    run('UPDATE projects SET name=?,partner=?,description=?,status=?,start_date=?,end_date=? WHERE id=?', body.name ?? p.name, body.partner ?? p.partner, body.description ?? p.description, body.status ?? p.status, body.start_date ?? p.start_date, body.end_date ?? p.end_date, p.id);
    if (Array.isArray(body.members)) { run('DELETE FROM project_members WHERE project_id=?', p.id); for (const m of body.members) run('INSERT OR IGNORE INTO project_members VALUES(?,?)', p.id, m); }
    audit(user, 'project_updated', 'project', p.id, body);
    return { ok: true };
  });

  // ---- boats and vessel hours ----
  const boatOut = (b) => {
    const services = q('SELECT * FROM boat_service WHERE boat_id=? ORDER BY date DESC', b.id);
    const logs = q("SELECT data FROM records WHERE kind='vessel_log' AND status IN ('submitted','approved') AND json_extract(data,'$.boat_id')=?", b.id).map((r) => JSON.parse(r.data));
    return { ...b, tracks_hours: !!b.tracks_hours, active: !!b.active, services, status: D.boatStatus(b, services, logs) };
  };
  R('GET', '/api/boats', true, ({ user }) => { if (!D.canSeeKind(user, 'vessel_log')) throw forbid(); return { boats: q('SELECT * FROM boats ORDER BY name').map(boatOut) }; });
  const boatFields = (b, o = {}) => ({
    name: String(b.name ?? o.name ?? '').trim(), reg: b.reg ?? o.reg ?? '', engine_count: Math.min(2, Math.max(1, +(b.engine_count ?? o.engine_count ?? 1))),
    tracks_hours: b.tracks_hours === undefined ? o.tracks_hours || 0 : b.tracks_hours ? 1 : 0,
    svc_interval: +(b.svc_interval ?? o.svc_interval ?? 100), warn_before: +(b.warn_before ?? o.warn_before ?? 10), notes: b.notes ?? o.notes ?? '',
    active: b.active === undefined ? (o.active ?? 1) : b.active ? 1 : 0,
  });
  R('POST', '/api/boats', true, ({ user, body }) => {
    if (!['admin'].includes(user.role)) throw forbid();
    const f = boatFields(body); if (!f.name) throw bad('Boat name is required');
    if (!(f.svc_interval > 0)) throw bad('Service interval must be more than zero');
    const id = uid();
    run('INSERT INTO boats(id,name,reg,engine_count,tracks_hours,svc_interval,warn_before,notes,active) VALUES(?,?,?,?,?,?,?,?,?)', id, f.name, f.reg, f.engine_count, f.tracks_hours, f.svc_interval, f.warn_before, f.notes, f.active);
    audit(user, 'boat_created', 'boat', id, f);
    return { id };
  });
  R('PATCH', '/api/boats/:id', true, ({ user, params, body }) => {
    if (!['admin'].includes(user.role)) throw forbid();
    const o = one('SELECT * FROM boats WHERE id=?', params.id); if (!o) throw nf();
    const f = boatFields(body, o);
    run('UPDATE boats SET name=?,reg=?,engine_count=?,tracks_hours=?,svc_interval=?,warn_before=?,notes=?,active=? WHERE id=?', f.name, f.reg, f.engine_count, f.tracks_hours, f.svc_interval, f.warn_before, f.notes, f.active, o.id);
    audit(user, 'boat_updated', 'boat', o.id, body);
    return { ok: true };
  });
  R('POST', '/api/boats/:id/service', true, ({ user, params, body }) => {
    if (!['admin', 'cox'].includes(user.role)) throw forbid();
    const b = one('SELECT * FROM boats WHERE id=?', params.id); if (!b) throw nf();
    const engines = body.engine === 'all' ? Array.from({ length: b.engine_count }, (_, i) => i + 1) : [+body.engine];
    if (!D.isoDate(body.date)) throw bad('Service date is required');
    for (const n of engines) {
      if (!(n >= 1 && n <= b.engine_count)) throw bad('Engine not found on this boat');
      const m = body['meter_' + n] ?? body.meter_h;
      run('INSERT INTO boat_service VALUES(?,?,?,?,?,?,?)', uid(), b.id, n, body.date, m === '' || m === undefined || m === null ? null : +m, body.note || '', user.name);
    }
    audit(user, 'boat_serviced', 'boat', b.id, body);
    return { ok: true };
  });

  // ---- records (drafts, submit, review) ----
  R('GET', '/api/records', true, ({ user, query }) => {
    const kind = query.kind; if (kind && !D.KINDS.includes(kind)) throw bad('Unknown kind');
    const kinds = kind ? [kind] : D.KINDS.filter((k) => D.canSeeKind(user, k));
    const out = [];
    for (const k of kinds) {
      if (!D.canSeeKind(user, k)) throw forbid();
      const where = ['kind=?']; const args = [k];
      if (!D.canReadAll(user, k)) { where.push('author_id=?'); args.push(user.id); }
      if (query.status) { where.push('status=?'); args.push(query.status); }
      if (query.mine === '1') { where.push('author_id=?'); args.push(user.id); }
      if (query.from) { where.push('occurred_at>=?'); args.push(query.from); }
      if (query.to) { where.push('occurred_at<=?'); args.push(query.to + 'T99'); }
      out.push(...q(`SELECT * FROM records WHERE ${where.join(' AND ')} ORDER BY occurred_at DESC, created_at DESC LIMIT ${Math.min(+query.limit || 500, 2000)}`, ...args));
    }
    return { records: out.map(rowOut) };
  });
  R('GET', '/api/records/:id', true, ({ user, params }) => {
    const r = one('SELECT * FROM records WHERE id=?', params.id); if (!r) throw nf();
    if (!D.canSeeKind(user, r.kind) || (!D.canReadAll(user, r.kind) && r.author_id !== user.id)) throw forbid();
    return { record: rowOut(r) };
  });

  // create or upsert by client id. Drafts may be incomplete; submitting validates.
  const saveRecord = (user, body, { importing = false, batch = null } = {}) => {
    const kind = body.kind; if (!D.KINDS.includes(kind)) throw bad('Unknown kind');
    if (!D.canCreate(user, kind)) throw forbid(`Your role cannot create ${kind.replace('_', ' ')} records`);
    const d = body.data && typeof body.data === 'object' ? body.data : {}; sizeCheck(d);
    const want = body.submit ? 'submitted' : 'draft';
    const id = body.id && /^[\w-]{8,64}$/.test(body.id) ? body.id : uid();
    const old = one('SELECT * FROM records WHERE id=?', id);
    if (want === 'submitted') {
      const errs = D.validateForSubmit(kind, d, boatCtx(d)); if (errs.length) { const e = bad('Cannot submit: ' + errs.join('; ')); e.errors = errs; throw e; }
    }
    if (body.project_id && !one('SELECT 1 FROM projects WHERE id=?', body.project_id)) throw bad('Unknown project');
    const t = nowIso();
    if (!old) {
      run('INSERT INTO records(id,kind,status,author_id,project_id,occurred_at,data,imported,import_batch,version,created_at,updated_at,submitted_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?,?)',
        id, kind, want, user.id, body.project_id || null, occurred(d), JSON.stringify(d), importing ? 1 : 0, batch, t, t, want === 'submitted' ? t : null);
      audit(user, want === 'submitted' ? 'record_submitted' : 'record_draft_created', kind, id);
    } else {
      if (old.kind !== kind) throw bad('Kind cannot change');
      if (!mayEdit(user, old)) throw forbid('This record is submitted and can no longer be edited by you');
      if (body.base_version && +body.base_version !== old.version) throw new HttpError(409, 'This record was changed by someone else. Reload it before saving.');
      const st = ['approved'].includes(old.status) ? old.status : want === 'submitted' ? 'submitted' : old.status === 'submitted' ? 'submitted' : 'draft';
      run('UPDATE records SET status=?,project_id=?,occurred_at=?,data=?,version=version+1,updated_at=?,submitted_at=COALESCE(submitted_at,?) WHERE id=?',
        st, body.project_id ?? old.project_id, occurred(d), JSON.stringify(d), t, want === 'submitted' ? t : null, id);
      audit(user, 'record_edited', kind, id, { by_role: user.role, status: st });
    }
    return rowOut(one('SELECT * FROM records WHERE id=?', id));
  };
  R('POST', '/api/records', true, ({ user, body }) => ({ record: saveRecord(user, body) }));
  R('PUT', '/api/records/:id', true, ({ user, params, body }) => ({ record: saveRecord(user, { ...body, id: params.id }) }));
  R('POST', '/api/records/:id/submit', true, ({ user, params }) => {
    const r = one('SELECT * FROM records WHERE id=?', params.id); if (!r) throw nf();
    if (r.author_id !== user.id && !D.APPROVERS.includes(user.role)) throw forbid();
    if (!['draft', 'returned'].includes(r.status)) throw bad('Only drafts can be submitted');
    const d = JSON.parse(r.data); const errs = D.validateForSubmit(r.kind, d, boatCtx(d));
    if (errs.length) { const e = bad('Cannot submit: ' + errs.join('; ')); e.errors = errs; throw e; }
    run("UPDATE records SET status='submitted',submitted_at=?,updated_at=?,version=version+1 WHERE id=?", nowIso(), nowIso(), r.id);
    audit(user, 'record_submitted', r.kind, r.id);
    return { record: rowOut(one('SELECT * FROM records WHERE id=?', r.id)) };
  });
  R('POST', '/api/records/:id/review', true, ({ user, params, body }) => {
    if (!D.APPROVERS.includes(user.role)) throw forbid('Only managers and administrators review records');
    const r = one('SELECT * FROM records WHERE id=?', params.id); if (!r) throw nf();
    if (r.status !== 'submitted') throw bad('Only submitted records can be reviewed');
    if (!['approve', 'return'].includes(body.action)) throw bad('Action must be approve or return');
    if (r.kind === 'txn' && r.author_id === user.id) throw forbid('Maker-checker: you cannot approve a finance entry that you entered');
    if (body.action === 'return' && !String(body.note || '').trim()) throw bad('Say what needs to be corrected');
    run('UPDATE records SET status=?,reviewed_by=?,reviewed_at=?,review_note=?,version=version+1,updated_at=? WHERE id=?', body.action === 'approve' ? 'approved' : 'returned', user.id, nowIso(), body.note || '', nowIso(), r.id);
    audit(user, 'record_' + body.action, r.kind, r.id, { note: body.note });
    return { record: rowOut(one('SELECT * FROM records WHERE id=?', r.id)) };
  });
  R('DELETE', '/api/records/:id', true, ({ user, params }) => {
    const r = one('SELECT * FROM records WHERE id=?', params.id); if (!r) throw nf();
    if (r.status !== 'draft' || (r.author_id !== user.id && user.role !== 'admin')) throw forbid('Only your own drafts can be deleted');
    run('DELETE FROM records WHERE id=?', r.id); audit(user, 'draft_deleted', r.kind, r.id);
    return { ok: true };
  });

  // historical import: validated rows are saved as submitted records flagged imported, in one transaction
  R('POST', '/api/import', true, ({ user, body }) => {
    if (!['admin'].includes(user.role)) throw forbid('Only managers and administrators import history');
    const rows = Array.isArray(body.records) ? body.records : []; if (!rows.length) throw bad('Nothing to import');
    if (rows.length > 3000) throw bad('Import at most 3000 rows at a time');
    const batch = body.batch || uid(); const saved = [], skipped = [];
    db.exec('BEGIN');
    try {
      for (const r of rows) {
        const key = r.data && r.data.import_key;
        if (key && one("SELECT 1 FROM records WHERE import_batch IS NOT NULL AND json_extract(data,'$.import_key')=?", key)) { skipped.push({ key, reason: 'already imported' }); continue; }
        const rec = saveRecord(user, { ...r, id: undefined, submit: true }, { importing: true, batch });
        run('UPDATE records SET status=?,reviewed_by=?,reviewed_at=? WHERE id=?', 'approved', user.id, nowIso(), rec.id);
        saved.push(rec.id);
      }
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    audit(user, 'import', 'records', batch, { saved: saved.length, skipped: skipped.length, source: body.source });
    return { batch, saved: saved.length, skipped };
  });

  // scans kept as evidence next to the typed records
  R('POST', '/api/attachments', true, ({ user, body }) => {
    if (!['admin', 'ranger', 'cox', 'tourfin'].includes(user.role)) throw forbid();
    const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(body.data_url || ''); if (!m) throw bad('Attach an image or PDF');
    if (!/^(image\/(png|jpeg|webp)|application\/pdf)$/.test(m[1])) throw bad('Only images and PDF files can be attached');
    const buf = Buffer.from(m[2], 'base64'); if (buf.length > 8e6) throw bad('File is larger than 8 MB');
    const id = uid(); run('INSERT INTO attachments VALUES(?,?,?,?,?,?,?,?)', id, body.record_id || null, body.label || '', m[1], buf.length, buf, user.id, nowIso());
    return { id };
  });
  R('GET', '/api/attachments', true, ({ user, query }) => {
    if (!D.canSeeKind(user, 'patrol')) throw forbid();
    return { attachments: q('SELECT id,record_id,label,mime,size,created_at FROM attachments' + (query.record_id ? ' WHERE record_id=?' : ' ORDER BY created_at DESC LIMIT 200'), ...(query.record_id ? [query.record_id] : [])) };
  });
  R('GET', '/api/attachments/:id/file', true, ({ params }) => {
    const a = one('SELECT * FROM attachments WHERE id=?', params.id); if (!a) throw nf();
    return { raw: Buffer.from(a.data), mime: a.mime };
  });

  // ---- map zones ----
  const zoneOut = (z) => { const f = JSON.parse(z.feature); return { id: z.id, name: z.name, kind: z.kind, stated_km2: z.stated_km2, feature: f, area_km2: Math.round(D.featureAreaKm2(f) * 100) / 100, updated_at: z.updated_at }; };
  R('GET', '/api/zones', true, () => ({ zones: q('SELECT * FROM zones ORDER BY kind').map(zoneOut), points: db.getSetting('points'), bmu: db.getSetting('bmu'), landmarks: db.getSetting('landmarks', []) }));
  R('PUT', '/api/zones/:id', true, ({ user, params, body }) => {
    if (!['admin'].includes(user.role)) throw forbid();
    const f = body.feature; if (!f || f.type !== 'Feature' || !f.geometry || !['Polygon', 'MultiPolygon'].includes(f.geometry.type)) throw bad('Zone must be a GeoJSON polygon');
    const bad2 = JSON.stringify(f.geometry.coordinates).match(/-?\d+\.?\d*/g).some((x) => !Number.isFinite(+x)); if (bad2) throw bad('Invalid coordinates');
    const flat = JSON.stringify(f.geometry.coordinates).match(/-?\d+\.?\d*/g).map(Number); const lons = flat.filter((_, i) => i % 2 === 0), lats = flat.filter((_, i) => i % 2 === 1);
    if (lons.some((x) => x < 39 || x > 42.5) || lats.some((y) => y < -3.5 || y > -0.5)) throw bad('Coordinates are outside the Lamu coast. Check that each point is longitude, latitude (for example 41.0095, -2.2147).');
    const km = D.featureAreaKm2(f); if (km < 0.001 || km > 500) throw bad('Zone area looks wrong (' + km.toFixed(3) + ' km2). Coordinates must be longitude, latitude.');
    const z = one('SELECT * FROM zones WHERE id=?', params.id);
    if (z) run('UPDATE zones SET name=?,kind=?,stated_km2=?,feature=?,updated_at=? WHERE id=?', body.name ?? z.name, body.kind ?? z.kind, body.stated_km2 ?? z.stated_km2, JSON.stringify(f), nowIso(), z.id);
    else { if (!['lmma', 'gear', 'ntz', 'other'].includes(body.kind)) throw bad('Zone kind must be lmma, gear, ntz or other'); run('INSERT INTO zones VALUES(?,?,?,?,?,?)', params.id, body.name || 'Zone', body.kind, body.stated_km2 ?? null, JSON.stringify(f), nowIso()); }
    audit(user, 'zone_saved', 'zone', params.id, { area_km2: km });
    return { zone: zoneOut(one('SELECT * FROM zones WHERE id=?', params.id)) };
  });
  R('DELETE', '/api/zones/:id', true, ({ user, params }) => { if (!['admin'].includes(user.role)) throw forbid(); run('DELETE FROM zones WHERE id=?', params.id); audit(user, 'zone_deleted', 'zone', params.id); return { ok: true }; });
  R('PUT', '/api/landmarks', true, ({ user, body }) => {
    if (!['admin'].includes(user.role)) throw forbid();
    const rows = (body.landmarks || []).slice(0, 200).map((p, i) => ({ id: String(p.id || 'lm-' + i + '-' + Date.now().toString(36)), name: String(p.name || '').trim().slice(0, 80), kind: String(p.kind || 'village').slice(0, 20), lat: +p.lat, lon: +p.lon }));
    if (rows.some((p) => !p.name || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || p.lon < 39 || p.lon > 42.5 || p.lat < -3.5 || p.lat > -0.5)) throw bad('Each place needs a name and coordinates on the Lamu coast');
    db.setSetting('landmarks', rows); audit(user, 'landmarks_saved', 'zone', null, { n: rows.length }); return { landmarks: rows };
  });
  R('PUT', '/api/points', true, ({ user, body }) => {
    if (!['admin'].includes(user.role)) throw forbid();
    const pts = (body.points || []).map((p, i) => ({ n: +p.n || i + 1, lat: +p.lat, lon: +p.lon, tag: p.tag || null }));
    if (pts.some((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180)) throw bad('Invalid coordinates');
    db.setSetting('points', pts); audit(user, 'points_saved', 'zone', null, { n: pts.length }); return { ok: true };
  });

  // ---- dashboards ----
  R('GET', '/api/compliance', true, ({ user, query }) => {
    if (!['admin', 'board', 'fisheries'].includes(user.role)) throw forbid();
    const now = nairobiNow(); const to = D.isoDate(query.to) ? query.to : now.date;
    const from = D.isoDate(query.from) ? query.from : new Date(Date.parse(to) - 29 * 864e5).toISOString().slice(0, 10);
    if (Date.parse(to) - Date.parse(from) > 800 * 864e5) throw bad('Range is too long');
    const patrols = q("SELECT status,data FROM records WHERE kind='patrol' AND occurred_at>=? AND occurred_at<=?", from, to + 'T99').map((r) => ({ status: r.status, data: JSON.parse(r.data) }));
    const lm = one("SELECT feature FROM zones WHERE kind='lmma' LIMIT 1");
    const cfg = db.getSetting('compliance', { daily_required: true, cutoff_hour: 20 });
    return { from, to, ...D.compliance({ patrols, lmmaFeature: lm ? JSON.parse(lm.feature) : null, from, to, today: now.date, nowHour: now.hour, cutoffHour: cfg.cutoff_hour, required: cfg.daily_required, startDate: cfg.start_date || (one("SELECT MIN(substr(occurred_at,1,10)) d FROM records WHERE kind='patrol'").d) || now.date }) };
  });
  R('PUT', '/api/settings/compliance', true, ({ user, body }) => {
    if (!['admin'].includes(user.role)) throw forbid();
    if (body.start_date && !D.isoDate(body.start_date)) throw bad('Start date must be YYYY-MM-DD');
    db.setSetting('compliance', { daily_required: !!body.daily_required, cutoff_hour: Math.min(23, Math.max(0, +body.cutoff_hour || 20)), start_date: body.start_date || null });
    audit(user, 'settings_saved', 'compliance'); return { ok: true };
  });
  R('GET', '/api/summary', true, ({ user }) => {
    const c = (sql, ...a) => one(sql, ...a).c;
    const s = {};
    if (['admin', 'board', 'fisheries'].includes(user.role)) {
      s.awaiting_review = c("SELECT COUNT(*) c FROM records WHERE status='submitted'");
      s.patrols_30d = c("SELECT COUNT(*) c FROM records WHERE kind='patrol' AND status!='draft' AND occurred_at>=?", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
      s.incidents_30d = c("SELECT COUNT(*) c FROM records WHERE kind='incident' AND status!='draft' AND occurred_at>=?", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
      s.service_alerts = q('SELECT * FROM boats WHERE active=1').flatMap((b) => boatOut(b).status.filter((e) => e.state !== 'ok').map((e) => ({ boat: b.name, ...e })));
    }
    s.my_drafts = c("SELECT COUNT(*) c FROM records WHERE author_id=? AND status IN ('draft','returned')", user.id);
    return s;
  });
  R('GET', '/api/audit', true, ({ user, query }) => {
    if (user.role !== 'admin') throw forbid('Administrators only');
    return { audit: q('SELECT a.*,u.name user_name FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT ?', Math.min(+query.limit || 200, 1000)) };
  });

  // ---- document store: the working records of each module, saved as the app creates and edits them ----
  const COLL = {
    patrols:   { r: ['admin', 'board', 'ranger', 'cox', 'fisheries', 'bmu', 'officer'], w: ['admin', 'ranger', 'cox'] },
    incidents: { r: ['admin', 'board', 'ranger', 'fisheries'], w: ['admin', 'ranger'] },
    enc:       { r: ['admin', 'board', 'ranger', 'fisheries'], w: ['admin', 'ranger'] },
    seiz:      { r: ['admin', 'board', 'ranger', 'fisheries'], w: ['admin', 'ranger'] },
    pre:       { r: ['admin', 'ranger'], w: ['admin', 'ranger'] },
    obs:       { r: ['admin', 'board', 'ranger', 'fisheries'], w: ['admin', 'ranger', 'cox'] },
    checks:    { r: ['admin', 'board', 'ranger', 'fisheries'], w: ['admin', 'ranger'] },
    tour:      { r: ['admin', 'board', 'tourfin'], w: ['admin', 'tourfin'] },
    fin:       { r: ['admin', 'board', 'tourfin'], w: ['admin', 'tourfin', 'board'] },
    donors:    { r: ['admin', 'board', 'tourfin'], w: ['admin', 'tourfin'] },
    coral:     { r: ['admin', 'board', 'officer', 'fisheries'], w: ['admin', 'officer'] },
    vlog:      { r: ['admin', 'board', 'cox'], w: ['admin', 'cox'] },
    projects:  { r: ['admin', 'board', 'officer', 'fisheries', 'bmu', 'ranger', 'cox', 'tourfin'], w: ['admin'] },
    projwork:  { r: ['admin', 'board', 'officer'], w: ['admin', 'officer'] },
    bmus:      { r: ['admin', 'board', 'bmu', 'fisheries'], w: ['admin'] },
    partners:  { r: ['admin', 'board'], w: ['admin'] },
    meetings:  { r: ['admin', 'board'], w: ['admin'] },
    docs:      { r: ['admin', 'board', 'officer', 'fisheries'], w: ['admin'] },
    fleet:     { r: ['admin', 'board', 'cox', 'ranger', 'fisheries'], w: ['admin', 'cox'] },
    assign:    { r: ['admin', 'officer'], w: ['admin'] },
    equip:     { r: ['admin', 'cox'], w: ['admin', 'cox'] },
    sos:       { r: ['admin', 'board', 'ranger', 'cox', 'officer'], w: ['admin', 'ranger', 'cox', 'officer'] },
    settings:  { r: ['admin', 'board', 'ranger', 'cox', 'officer', 'fisheries', 'bmu', 'tourfin'], w: ['admin'] },
  };
  // live positions of staff (admin, officers, rangers): one row per user, kept only for the latest fix and a short trail
  R('POST', '/api/pos', true, ({ user, body }) => {
    const lat = +body.lat, lon = +body.lon;
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw bad('Invalid position');
    const prev = one("SELECT data FROM docs WHERE coll='pos' AND id=?", user.id);
    let trail = []; try { trail = (JSON.parse(prev.data).trail || []).slice(-39); } catch (e) {}
    const now = nowIso(); trail.push([lat, lon, now]);
    const d = JSON.stringify({ id: user.id, name: user.name, role: user.role, phone: user.phone || '', lat, lon, acc: +body.acc || 0, doing: String(body.doing || '').slice(0, 60), at: now, trail });
    run("INSERT INTO docs(coll,id,data,author_id,created_at,updated_at) VALUES('pos',?,?,?,?,?) ON CONFLICT(coll,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at", user.id, d, user.id, now, now);
    return { ok: true };
  });
  R('GET', '/api/pos', true, ({ user }) => {
    if (!['admin', 'board'].includes(user.role)) throw forbid();
    const cutoff = Date.now() - 12 * 3600e3;
    return { staff: q("SELECT data FROM docs WHERE coll='pos'").map((r) => JSON.parse(r.data)).filter((x) => Date.parse(x.at) > cutoff) };
  });
  const collOf = (name, user, mode) => { const c = COLL[name]; if (!c) throw nf('Unknown collection'); if (!c[mode].includes(user.role)) throw forbid('Your role cannot ' + (mode === 'w' ? 'change' : 'view') + ' this'); return c; };
  R('GET', '/api/docs', true, ({ user, query }) => {
    const out = {}; const only = query && query.only ? String(query.only).split(',') : null; // ?only=patrols,incidents for light live refreshes
    for (const [name, c] of Object.entries(COLL)) if (c.r.includes(user.role) && (!only || only.includes(name))) out[name] = q('SELECT id,data,version FROM docs WHERE coll=?', name).map((r) => ({ ...JSON.parse(r.data), id: r.id, _v: r.version }));
    return { docs: out };
  });
  R('PUT', '/api/docs/:coll/:id', true, ({ user, params, body }) => {
    collOf(params.coll, user, 'w');
    if (!/^[^/\\<>"]{1,80}$/.test(params.id)) throw bad('Bad id');
    let d = body.data; if (!d || typeof d !== 'object' || Array.isArray(d)) throw bad('Data is required');
    d = moveInlineImages(d, user.id);
    const txt = JSON.stringify(d); if (txt.length > 600000) throw bad('Record is too large');
    const old = one('SELECT * FROM docs WHERE coll=? AND id=?', params.coll, params.id); const t = nowIso();
    if (old && body.base_version && +body.base_version !== old.version) throw new HttpError(409, 'This record was changed by someone else. Reload it before saving.');
    if (old) run('UPDATE docs SET data=?,version=version+1,updated_at=? WHERE coll=? AND id=?', txt, t, params.coll, params.id);
    else run('INSERT INTO docs(coll,id,data,author_id,created_at,updated_at) VALUES(?,?,?,?,?,?)', params.coll, params.id, txt, user.id, t, t);
    audit(user, old ? 'edited' : 'created', params.coll, params.id, { status: d.status });
    return { id: params.id, version: (old ? old.version : 0) + 1 };
  });
  R('DELETE', '/api/docs/:coll/:id', true, ({ user, params }) => {
    collOf(params.coll, user, 'w');
    const old = one('SELECT * FROM docs WHERE coll=? AND id=?', params.coll, params.id); if (!old) return { ok: true };
    const d = JSON.parse(old.data); if (!['admin'].includes(user.role) && !(old.author_id === user.id && (/draft/i.test(d.status || '') || d.draft === true))) throw forbid('Only your own drafts can be deleted');
    run('DELETE FROM docs WHERE coll=? AND id=?', params.coll, params.id); audit(user, 'deleted', params.coll, params.id);
    return { ok: true };
  });

  R('POST', '/api/files', true, ({ user, body }) => {
    const b64 = String(body.data || '').replace(/^data:[^,]*,/, '');
    if (!b64) throw bad('No file received');
    return saveFile(Buffer.from(b64, 'base64'), String(body.mime || ''), body.name, user.id);
  });
  R('GET', '/api/files/:id', false, ({ params, query }) => {
    if (!/^[a-f0-9]{24}$/.test(params.id) || query.k !== fileSig(params.id)) throw nf('File not found');
    const meta = one('SELECT * FROM files WHERE id=?', params.id); if (!meta) throw nf('File not found');
    return { raw: fs.readFileSync(path.join(filesDir, params.id)), mime: meta.mime };
  });
  R('GET', '/api/health', false, () => ({ ok: true, time: nowIso() }));

  // ---------- http ----------
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const send = (res, code, obj, hdr = {}) => { const b = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...hdr }); res.end(b); };
  const readBody = (req) => new Promise((ok, no) => { let n = 0; const c = []; req.on('data', (d) => { n += d.length; if (n > 14e6) { no(new HttpError(413, 'Request too large')); req.destroy(); } else c.push(d); }); req.on('end', () => { try { ok(c.length ? JSON.parse(Buffer.concat(c).toString()) : {}); } catch (e) { no(bad('Request body is not valid JSON')); } }); });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('referrer-policy', 'same-origin');
    try {
      if (url.pathname.startsWith('/api/')) {
        const rt = routes.find((r) => r.m === req.method && r.re.test(url.pathname));
        if (!rt) throw nf('Unknown endpoint');
        const params = Object.fromEntries(Object.entries(url.pathname.match(rt.re).groups || {}).map(([k, v]) => { try { return [k, decodeURIComponent(v)]; } catch (e) { return [k, v]; } }));
        let user = null;
        if (rt.auth) {
          const h = req.headers.authorization || ''; user = readToken(h.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('t'));
          if (!user) throw new HttpError(401, 'Please sign in');
          if (user.must_change && !(req.method === 'POST' && url.pathname === '/api/password') && url.pathname !== '/api/me') throw new HttpError(403, 'Change your temporary password first');
        }
        const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
        const out = await rt.fn({ user, params, body, query: Object.fromEntries(url.searchParams), ip: req.socket.remoteAddress });
        if (out && out.raw) { res.writeHead(200, { 'content-type': out.mime, 'cache-control': 'private, max-age=3600' }); return res.end(out.raw); }
        return send(res, 200, out);
      }
      // static
      let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
      let f = path.join(webDir, p); if (!f.startsWith(webDir)) throw nf();
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(webDir, 'index.html');
      if (!fs.existsSync(f)) throw nf('Web app is not built. Run: npm run build');
      const ext = path.extname(f);
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': /\.(html|js|css|webmanifest)$/.test(f) ? 'no-cache' : 'public, max-age=3600' });
      fs.createReadStream(f).pipe(res);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.code, { error: e.message, errors: e.errors });
      console.error(e); send(res, 500, { error: 'Something went wrong on the server' });
    }
  });
  return { server, db, boot };
}

module.exports = { createApp };

if (require.main === module) {
  const port = +process.env.PORT || 8080;
  const dbFile = process.env.POPS_DB || path.join(__dirname, '..', 'data', 'pops.sqlite');
  const { server, boot } = createApp({ dbFile, webDir: path.join(__dirname, '..', 'web', 'dist'), adminEmail: process.env.POPS_ADMIN_EMAIL, adminPassword: process.env.POPS_ADMIN_PASSWORD });
  process.on('uncaughtException', (e) => console.error('uncaught', e));
  process.on('unhandledRejection', (e) => console.error('unhandled', e));
  server.keepAliveTimeout = 65000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`POps running on http://localhost:${port}`);
    if (boot.adminCreated) console.log(`\nFirst administrator created.\n  Email: ${boot.adminEmail}\n  Temporary password: ${boot.tempPassword}\n  You will be asked to change it at first sign-in.\n`);
  });
}
