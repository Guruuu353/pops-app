// Business rules that do not touch HTTP: permissions, validation, compliance, vessel hours, geometry.

const KINDS = ['patrol', 'fisher_check', 'incident', 'observation', 'vessel_log', 'visitor', 'txn'];

// Who may create / edit own drafts of each kind
const CREATE = {
  admin: KINDS,
  ranger: ['patrol', 'fisher_check', 'incident', 'observation'],
  cox: ['vessel_log', 'observation', 'patrol'],
  tourfin: ['visitor', 'txn'],
};
// Who may read all records of a kind (others only see their own)
const READ_ALL = {
  admin: KINDS,
  board: KINDS,
  fisheries: ['patrol', 'incident', 'observation', 'fisher_check'],
  bmu: ['patrol'],
  officer: ['patrol', 'observation'],
  ranger: ['patrol', 'incident', 'observation', 'fisher_check'],
  cox: ['vessel_log', 'patrol'],
  tourfin: ['visitor', 'txn'],
};
const APPROVERS = ['admin', 'board'];

const canCreate = (u, kind) => (CREATE[u.role] || []).includes(kind);
// Rangers see only their own records. Coxswains share the fleet log. Tourism and finance share their own two kinds.
const canReadAll = (u, kind) => {
  if (u.role === 'ranger') return false;
  if (u.role === 'cox') return kind === 'vessel_log';
  return (READ_ALL[u.role] || []).includes(kind);
};
const canSeeKind = (u, kind) => (READ_ALL[u.role] || []).includes(kind) || canCreate(u, kind);

const need = (d, ...keys) => keys.filter((k) => d[k] === undefined || d[k] === null || d[k] === '' || (Array.isArray(d[k]) && !d[k].length));
const hhmm = (s) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(s || ''));
const isoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

// Returns a list of problems that stop a record from being submitted. Drafts can be incomplete.
function validateForSubmit(kind, d, ctx = {}) {
  const e = [];
  const miss = (...k) => need(d, ...k).forEach((x) => e.push(`${x.replace(/_/g, ' ')} is required`));
  if (d.date && !isoDate(d.date)) e.push('date must be YYYY-MM-DD');
  switch (kind) {
    case 'patrol':
      miss('date', 'time_out', 'time_in', 'location', 'rangers');
      if (d.time_out && !hhmm(d.time_out)) e.push('time out must be HH:MM');
      if (d.time_in && !hhmm(d.time_in)) e.push('time in must be HH:MM');
      break;
    case 'fisher_check':
      miss('date', 'time', 'location', 'fishers');
      if (Array.isArray(d.fishers) && d.fishers.some((f) => !String(f.name || '').trim())) e.push('every fisher needs a name');
      break;
    case 'incident':
      miss('date', 'time', 'type', 'description');
      if (d.type === 'infringement' && !d.infringement_code) e.push('infringement code is required');
      if (!d.persons_unknown && !(d.persons || []).length) e.push('add the persons involved, or tick "persons not identified"');
      if (Array.isArray(d.persons) && d.persons.some((f) => !String(f.name || '').trim())) e.push('every person needs a name');
      break;
    case 'observation':
      miss('date', 'time', 'text');
      break;
    case 'vessel_log': {
      miss('boat_id', 'date', 'dep_time', 'arr_time');
      const b = ctx.boat;
      if (b && b.tracks_hours) {
        if (d.e1_arr === undefined || d.e1_arr === '' || d.e1_arr === null) e.push('engine 1 hour meter at arrival is required for this boat');
        if (b.engine_count > 1 && (d.e2_arr === undefined || d.e2_arr === '' || d.e2_arr === null)) e.push('engine 2 hour meter at arrival is required for this boat');
      }
      break;
    }
    case 'visitor':
      miss('date', 'visitor_type', 'name', 'count');
      if (d.visitor_type && !['guest', 'bmu', 'other'].includes(d.visitor_type)) e.push('visitor type must be guest, bmu or other');
      if (d.visitor_type === 'other' && !d.visitor_type_other) e.push('say what kind of visitor (other)');
      break;
    case 'txn':
      miss('date', 'category', 'amount');
      if (!(Number(d.amount) > 0)) e.push('amount must be more than zero');
      break;
    default:
      e.push('unknown record kind');
  }
  return e;
}

const timeToMin = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
// trip length in hours; arrival earlier than departure means the trip ran past midnight
function tripHours(dep, arr) {
  const a = timeToMin(dep), b = timeToMin(arr);
  if (a === null || b === null) return 0;
  return (b >= a ? b - a : b + 1440 - a) / 60;
}

// Engine hours since last service. Boats with a working hour meter use the meter; others use trip time.
function boatStatus(boat, services, logs) {
  const engines = [];
  for (let n = 1; n <= boat.engine_count; n++) {
    const sv = services.filter((s) => s.engine === n).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
    const mine = logs.filter((l) => l.date >= (sv ? sv.date : '0000'));
    let run = 0, meter = null, basis = 'trip time';
    if (boat.tracks_hours) {
      basis = 'hour meter';
      const readings = logs.map((l) => Number(l['e' + n + '_arr'])).filter((x) => Number.isFinite(x));
      meter = readings.length ? Math.max(...readings) : null;
      if (meter !== null && sv && sv.meter_h !== null && sv.meter_h !== undefined) run = Math.max(0, meter - sv.meter_h);
      else run = mine.reduce((s, l) => s + (Number.isFinite(Number(l['e' + n + '_arr'])) && Number.isFinite(Number(l['e' + n + '_dep'])) ? Number(l['e' + n + '_arr']) - Number(l['e' + n + '_dep']) : tripHours(l.dep_time, l.arr_time)), 0);
    } else {
      run = mine.reduce((s, l) => s + tripHours(l.dep_time, l.arr_time), 0);
    }
    run = Math.round(run * 10) / 10;
    const left = Math.round((boat.svc_interval - run) * 10) / 10;
    const state = left <= 0 ? 'overdue' : left <= boat.warn_before ? 'soon' : 'ok';
    engines.push({ engine: n, last_service: sv ? sv.date : null, last_service_meter: sv ? sv.meter_h : null, run_since_service: run, hours_left: left, meter, basis, state });
  }
  return engines;
}

// ---- geometry ----
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inFeature(lon, lat, f) {
  const g = f.geometry;
  if (!g) return false;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return polys.some((p) => pointInRing(lon, lat, p[0]) && !p.slice(1).some((h) => pointInRing(lon, lat, h)));
}
function ringAreaKm2(ring) {
  // equirectangular local projection, adequate at this scale
  const R = 6371.0088, lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const xy = ring.map(([lo, la]) => [R * (lo * Math.PI / 180) * Math.cos(lat0 * Math.PI / 180), R * (la * Math.PI / 180)]);
  let a = 0;
  for (let i = 0, j = xy.length - 1; i < xy.length; j = i++) a += (xy[j][0] * xy[i][1]) - (xy[i][0] * xy[j][1]);
  return Math.abs(a / 2);
}
function featureAreaKm2(f) {
  const g = f.geometry; if (!g) return 0;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return polys.reduce((s, p) => s + ringAreaKm2(p[0]) - p.slice(1).reduce((t, h) => t + ringAreaKm2(h), 0), 0);
}

const INSIDE = ['inside', 'both'];
// Daily LMMA visit compliance. A day counts as visited when a non-draft patrol says it went inside the LMMA,
// or a recorded GPS track has a point inside the LMMA polygon.
function compliance({ patrols, lmmaFeature, from, to, today, nowHour, cutoffHour, required = true, startDate = null }) {
  const days = new Map();
  const add = (d) => { if (!days.has(d)) days.set(d, { date: d, visited: false, patrols: 0, drafts: 0, rangers: new Set(), by_gps: false }); return days.get(d); };
  for (let t = Date.parse(from + 'T00:00:00Z'); t <= Date.parse(to + 'T00:00:00Z'); t += 864e5) add(new Date(t).toISOString().slice(0, 10));
  for (const p of patrols) {
    const d = p.data; const day = days.get(d.date); if (!day) continue;
    if (p.status === 'draft') { day.drafts++; continue; }
    day.patrols++;
    (d.rangers || []).forEach((r) => day.rangers.add(typeof r === 'string' ? r : r.name));
    let inside = INSIDE.includes(d.location);
    if (!inside && lmmaFeature && Array.isArray(d.track) && d.track.some((pt) => inFeature(pt[1], pt[0], lmmaFeature))) { inside = true; day.by_gps = true; }
    if (inside) day.visited = true;
  }
  const list = [...days.values()].map((d) => {
    const over = d.date < today || (d.date === today && nowHour >= cutoffHour);
    const status = d.visited ? 'visited' : !required ? 'not required' : startDate && d.date < startDate ? 'not tracked' : over ? 'missed' : 'pending';
    return { ...d, rangers: [...d.rangers], status };
  });
  const done = list.filter((d) => d.status === 'visited').length;
  const due = list.filter((d) => d.status === 'visited' || d.status === 'missed').length;
  let streak = 0;
  for (let i = list.length - 1; i >= 0; i--) { if (list[i].status === 'visited') streak++; else if (list[i].status === 'pending') continue; else break; }
  return { days: list, visited: done, due, rate: due ? Math.round((done / due) * 100) : null, streak, missed: list.filter((d) => d.status === 'missed').map((d) => d.date) };
}

module.exports = { KINDS, canCreate, canReadAll, canSeeKind, APPROVERS, validateForSubmit, tripHours, boatStatus, inFeature, featureAreaKm2, compliance, hhmm, isoDate };
