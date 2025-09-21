<script>
// test-seed.js
// Seeds core clinic demo data: patients, appointments, slots, labInvoices, invoices

(function(){
  const hasCloud = !!(window.cloud && typeof window.cloud.insert === 'function');

  // Lazy import db (Dexie) when the script tag executes after db.js
  let db;
  async function ensureDB(){
    if (db) return db;
    if (!window.Dexie || !window.db){ 
      throw new Error('[seed] Dexie/db.js not loaded');
    }
    db = window.db || (await import('./db.js')).default; // supports ESM or global
    return db;
  }

  function today(d=0){
    const t = new Date(); t.setDate(t.getDate()+d);
    return t.toISOString().slice(0,10);
  }

  function at(h, m){ const d=new Date(); d.setHours(h,m,0,0); return String(d.toTimeString().slice(0,5)); }

  // ---------- LOCAL WRITE HELPERS ----------
  async function addLocalPatients(){
    const P = [
      { pid:'P001', phone:'9000000001', name:'Aarav', parent:'Ravi',  dob:'2020-01-10', heightCm:95, weightKg:13 },
      { pid:'P002', phone:'9000000002', name:'Diya',  parent:'Priya', dob:'2019-04-14', heightCm:104, weightKg:16 },
      { pid:'P003', phone:'9000000003', name:'Vihaan',parent:'Arun',  dob:'2021-09-02', heightCm:88, weightKg:12 },
      { pid:'P004', phone:'9000000004', name:'Sara',  parent:'Meera', dob:'2022-03-20', heightCm:76, weightKg:10 },
      { pid:'P005', phone:'9000000005', name:'Ishaan',parent:'Kiran', dob:'2018-12-11', heightCm:112,weightKg:18 }
    ];
    const _db = await ensureDB();
    for (const r of P){
      const dupe = await _db.patients.where('phone').equals(r.phone).first();
      if (dupe) await _db.patients.update(dupe.id, {...r, updatedAt:Date.now()});
      else await _db.patients.add({...r, createdAt:Date.now(), updatedAt:Date.now()});
    }
    return P;
  }

  async function addLocalAppointments(){
    const _db = await ensureDB();
    const dates = [today(-2), today(-1), today(0)];
    const base = [
      { pid:'P001', phone:'9000000001', name:'Aarav',  reason:'Fever' },
      { pid:'P002', phone:'9000000002', name:'Diya',   reason:'Cough' },
      { pid:'P003', phone:'9000000003', name:'Vihaan', reason:'Follow-up' },
      { pid:'P004', phone:'9000000004', name:'Sara',   reason:'Vaccine' },
      { pid:'P005', phone:'9000000005', name:'Ishaan', reason:'General' }
    ];
    let token = 1;
    for (const d of dates){
      let i=0;
      for (const b of base){
        const row = {
          date:d, time: at(10 + i, i%2?30:0), token: token++,
          ...b,
          status: d < today(0) ? 'done' : (i%3===0 ? 'approved' : 'pending'),
          createdAt: Date.now()
        };
        await _db.appointments.add(row);
      i++;
      }
    }
  }

  async function addLocalSlots(){
    const _db = await ensureDB();
    const d = today(0);
    // 12 tokens across the day
    for (let i=1;i<=12;i++){
      await _db.slots.add({
        key:`${d}#${i}`,
        date:d,
        token:i,
        time: at(9 + Math.floor((i-1)/2), (i%2)*30),
        name: i%3===0 ? 'Walk-in' : '',
        phone: '',
        apptStatus: (i<=3) ? 'approved' : 'pending',
      });
    }
  }

  async function addLocalPharmacyAndLab(){
    const _db = await ensureDB();

    // Lab tests master
    const tests = [
      { code:'HB', name:'Hemoglobin', price:150 },
      { code:'CBC',name:'CBC',        price:350 },
      { code:'CRP',name:'CRP',        price:500 },
    ];
    for (const t of tests){
      const ex = await _db.labTests.where('code').equals(t.code).first();
      if (ex) await _db.labTests.update(ex.id, t); else await _db.labTests.add(t);
    }

    // Lab invoices (spread last 7 days)
    for (let d=-6; d<=0; d++){
      const list = await _db.patients.toArray();
      const who = list[d%list.length];
      const amount = 150 + (Math.abs(d)*50);
      await _db.labInvoices.add({ date:today(d), patientId: who?.pid||'P001', patientName: who?.name||'Aarav', amount });
    }

    // Pharmacy items
    const items = [
      { name:'Paracetamol 250mg', sku:'SEED-PARA-250', mrp:35, stock:40, barcode:'PARA250' },
      { name:'Cetrizine 10mg',   sku:'SEED-CET-10',   mrp:28, stock:55, barcode:'CET10' },
      { name:'ORS 1L',           sku:'SEED-ORS-1L',   mrp:22, stock:30, barcode:'ORS1' }
    ];
    for (const it of items){
      let row = await _db.pharmacyItems.where('sku').equals(it.sku).first();
      if (row) await _db.pharmacyItems.update(row.id, it);
      else await _db.pharmacyItems.add(it);
    }

    // Pharmacy invoices & items
    for (let d=-6; d<=0; d++){
      const invId = await _db.invoices.add({ date:today(d), type:'sale', total: 100 + (Math.abs(d)*20), party:null });
      await _db.invoiceItems.add({ invoiceId:invId, sku:'SEED-PARA-250', name:'Paracetamol 250mg', qty:1+((d+6)%3), price:35 });
    }
  }

  // ---------- CLOUD MIRROR (optional) ----------
  async function mirrorToCloud(){
    if (!hasCloud) return;
    console.log('[seed] Cloud mirror: start');

    // simple mirrors with UPSERT-like behaviour (conflict on unique-ish natural keys)
    const patients = await db.patients.toArray();
    for (const p of patients){
      await window.cloud.upsert('patients', { 
        phone: p.phone, pid: p.pid, name: p.name, parent:p.parent, dob:p.dob, heightCm:p.heightCm, weightKg:p.weightKg 
      }, ['phone']);
    }

    const appts = await db.appointments.toArray();
    for (const a of appts){
      await window.cloud.upsert('appointments', {
        date:a.date, time:a.time, token:a.token, phone:a.phone, name:a.name, pid:a.pid, reason:a.reason, status:a.status
      }, ['date','token']);
    }

    const slots = await db.slots.toArray();
    for (const s of slots){
      await window.cloud.upsert('slots', {
        key:s.key, date:s.date, token:s.token, time:s.time, name:s.name, phone:s.phone, apptStatus:s.apptStatus
      }, ['key']);
    }

    const tests = await db.labTests.toArray();
    for (const t of tests){
      await window.cloud.upsert('lab_tests', { code:t.code, name:t.name, price:t.price }, ['code']);
    }

    const labs = await db.labInvoices.toArray();
    for (const l of labs){
      await window.cloud.insert('lab_invoices', { date:l.date, patient_id:l.patientId, patient_name:l.patientName, amount:l.amount });
    }

    const items = await db.pharmacyItems.toArray();
    for (const it of items){
      await window.cloud.upsert('pharmacy_items', { sku:it.sku, name:it.name, barcode:it.barcode, mrp:it.mrp, stock:it.stock }, ['sku']);
    }

    const inv = await db.invoices.toArray();
    for (const v of inv){
      await window.cloud.insert('invoices', { date:v.date, type:v.type, total:v.total, party:v.party || null });
    }

    const invItems = await db.invoiceItems.toArray();
    for (const li of invItems){
      await window.cloud.insert('invoice_items', { invoice_id:null, sku:li.sku, name:li.name, qty:li.qty, price:li.price, party:li.party||null });
    }

    console.log('[seed] Cloud mirror: done');
  }

  // ---------- PUBLIC API ----------
  async function seedTestData(){
    try{
      console.log('[seed] Start test data seed…');
      await ensureDB();
      await addLocalPatients();
      await addLocalAppointments();
      await addLocalSlots();
      await addLocalPharmacyAndLab();
      console.log('[seed] Local seed complete');
      await mirrorToCloud().catch(e=>console.warn('[seed] Cloud mirror skipped/failed:', e.message));
      return true;
    }catch(e){
      console.error('[seed] FAILED:', e);
      alert('Seed failed: '+ e.message);
      return false;
    }
  }

  async function clearTestData(){
    try{
      await ensureDB();
      // Only remove “seed-like” rows to be safe
      const phones = ['9000000001','9000000002','9000000003','9000000004','9000000005'];
      for (const ph of phones){
        const p = await db.patients.where('phone').equals(ph).first();
        if (p) await db.patients.delete(p.id);
      }
      // purge recent generated records
      const from = today(-10), to = today(0);
      const purge = async (tbl, key='date')=>{
        const list = await db[tbl].toArray();
        for (const r of list){
          const d = (r[key]||'');
          if (d>=from && d<=to) await db[tbl].delete(r.id);
        }
      };
      await purge('appointments');
      await purge('slots');
      await purge('labInvoices');
      await purge('invoices');
      const it = await db.pharmacyItems.where('sku').startsWith('SEED-').toArray();
      for (const r of it) await db.pharmacyItems.delete(r.id);
      await db.invoiceItems.clear(); // safe in demo

      console.log('[seed] Local test data cleared');

      if (hasCloud){
        // best-effort cloud cleanup (demo)
        for (const ph of phones){
          await window.cloud.delete('patients', { phone: ph });
        }
      }
      return true;
    }catch(e){
      console.error('[seed] clear FAILED:', e);
      alert('Clear failed: '+e.message);
      return false;
    }
  }

  window.seedTestData = seedTestData;
  window.clearTestData = clearTestData;
})();
</script>
