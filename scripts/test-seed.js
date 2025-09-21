<!-- scripts/test-seed.js -->
<script>
/**
 * Test data seeder (cloud-first).
 * Exposes:
 *   window.seedTestData()   -> seeds last-7-days demo data
 *   window.clearTestData()  -> removes demo data
 *
 * Requires:
 *   - cloud.js loaded first (for Supabase)  OR  db.js (for Dexie fallback)
 *   - your Supabase “demo write” policies enabled while testing
 *     (insert/update on: patients, slots, appointments, invoices, lab_invoices)
 */
(function () {
  const hasCloud = !!(window.cloud && window.cloud.insert && window.cloud.upsert && window.cloud.del);
  const hasDb = !!(window.db && window.db.tables);

  const log = (...a) => console.log('[seed]', ...a);
  const todayISO = () => new Date().toISOString().slice(0,10);
  const addDaysISO = (baseISO, delta) => {
    const d = baseISO ? new Date(baseISO) : new Date();
    d.setDate(d.getDate()+delta);
    return d.toISOString().slice(0,10);
  };
  const pad = n => String(n).padStart(2,'0');
  const toKey = (date, time24) => `${date}-${time24}`;

  // -------- demo data --------
  const DEMO_TAG = 'DEMO';                    // used in pid / source / reason to make cleanup easy
  const demoPatients = [
    { pid:`${DEMO_TAG}-P001`, phone:'9000000001', name:'Aarav',  parent:'Mr Rao',    dob:'2019-05-15' },
    { pid:`${DEMO_TAG}-P002`, phone:'9000000002', name:'Ishita', parent:'Mrs Reddy', dob:'2020-02-10' },
    { pid:`${DEMO_TAG}-P003`, phone:'9000000003', name:'Vihaan', parent:'Mr Kumar',  dob:'2018-11-22' },
    { pid:`${DEMO_TAG}-P004`, phone:'9000000004', name:'Saanvi', parent:'Mrs Iyer',  dob:'2021-07-01' },
    { pid:`${DEMO_TAG}-P005`, phone:'9000000005', name:'Advik',  parent:'Mr Singh',  dob:'2017-03-28' }
  ];

  // build a simple slot window
  function buildSlotsForDay(date, start='09:00', end='12:00', step=30) {
    const slots=[];
    const mins = (hhmm)=>{const [h,m]=hhmm.split(':').map(Number);return h*60+m;};
    const addm = (hhmm, s)=>{const t=mins(hhmm)+s; const h=Math.floor(t/60), m=t%60; return `${pad(h)}:${pad(m)}`;};
    for(let t=start, tok=1; mins(t)<mins(end); t=addm(t,step), tok++){
      slots.push({
        date, time: t, token: tok,
        key: toKey(date, t),
        status: 'free'
      });
    }
    return slots;
  }

  // map a few appointments for “today”
  function demoAppointmentsFromSlots(slots) {
    // take first five slots and mark with different statuses
    const pick = slots.slice(0,5);
    const statuses = ['pending','approved','approved','done','cancelled'];
    return pick.map((s, i) => {
      const p = demoPatients[i % demoPatients.length];
      return {
        date: s.date,
        time: s.time,
        token: s.token,
        pid: p.pid,
        name: p.name,
        phone: p.phone,
        status: statuses[i],
        source: `${DEMO_TAG}-seed`,
        reason: `${DEMO_TAG}-seed`
      };
    });
  }

  // ---- cloud helpers (wrap cloud.js or Dexie) ----
  async function upsertMany(table, rows, conflictCols) {
    if (!rows?.length) return {count:0};
    if (hasCloud) return window.cloud.upsert(table, rows, conflictCols);
    if (hasDb) {
      // very small, simple Dexie fallback
      if (conflictCols?.length) {
        for (const r of rows) {
          // build equals query using first conflict col
          const col = conflictCols[0];
          const old = await window.db[table].where(col).equals(r[col]).first();
          if (old) await window.db[table].update(old.id, r);
          else await window.db[table].add(r);
        }
        return {count: rows.length};
      }
      await window.db[table].bulkAdd(rows);
      return {count: rows.length};
    }
    throw new Error('No cloud or db available');
  }

  async function insertMany(table, rows) {
    if (!rows?.length) return {count:0};
    if (hasCloud) return window.cloud.insert(table, rows);
    if (hasDb)   { await window.db[table].bulkAdd(rows); return {count:rows.length}; }
    throw new Error('No cloud or db available');
  }

  async function deleteBy(table, where) {
    if (hasCloud) return window.cloud.del(table, where);
    if (hasDb)   {
      // very small Dexie filter delete
      const all = await window.db[table].toArray();
      const keep = all.filter(r => !where(r));
      await window.db[table].clear();
      await window.db[table].bulkAdd(keep);
      return {count: all.length - keep.length};
    }
    throw new Error('No cloud or db available');
  }

  // ---- public API ----
  async function seedTestData() {
    const today = todayISO();
    const from  = addDaysISO(today, -6);

    log('Seeding patients…');
    await upsertMany('patients', demoPatients.map(p=>({
      ...p,
      height_cm: null, weight_kg: null,
    })), ['pid']);

    log('Seeding slots for last 7 days…');
    let allSlots = [];
    for (let i=0;i<7;i++){
      const d = addDaysISO(from, i);
      allSlots = allSlots.concat( buildSlotsForDay(d, '09:00','12:00',30).map(s=>({
        ...s,
        // also mirror apptStatus for board fallback
        appt_status: 'pending'
      })));
    }
    // upsert on “key” (date-time)
    await upsertMany('slots', allSlots, ['key']);

    log('Seeding today’s appointments…');
    const todaysSlots = allSlots.filter(s=>s.date===today);
    const apps = demoAppointmentsFromSlots(todaysSlots);
    await insertMany('appointments', apps);

    log('Seeding pharmacy invoice + lab invoice (today)…');
    await insertMany('invoices', [{
      date: today, type:'sale', total: 820, party:`${DEMO_TAG}-seed`
    }]);
    await insertMany('lab_invoices', [{
      date: today, patient_id: demoPatients[0].pid, patient_name: demoPatients[0].name, amount: 450
    }]);

    log('Done ✅');
    return true;
  }

  async function clearTestData() {
    log('Clearing DEMO data…');

    // patients by pid prefix
    await deleteBy('patients', r => typeof r.pid === 'string' && r.pid.startsWith(`${DEMO_TAG}-`));

    // appointments marked by seed source/reason
    await deleteBy('appointments', r => (r?.source===`${DEMO_TAG}-seed`) || (r?.reason===`${DEMO_TAG}-seed`));

    // slots whose key/date exist in last 7 days AND have no non-demo booking (best-effort)
    const today = todayISO(), from = addDaysISO(today, -6);
    await deleteBy('slots', r => (r?.date>=from && r?.date<=today) && (!r?.pid || String(r.pid).startsWith(`${DEMO_TAG}-`)));

    // demo financials
    await deleteBy('invoices', r => r?.party === `${DEMO_TAG}-seed`);
    await deleteBy('lab_invoices', r => r?.patient_id?.startsWith?.(`${DEMO_TAG}-`));

    log('Cleared ✅');
    return true;
  }

  window.seedTestData  = seedTestData;
  window.clearTestData = clearTestData;
})();
</script>
