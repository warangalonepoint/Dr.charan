// scripts/settings.js
// Self-contained Settings wiring + built-in local seeders (no external seed files)

// --- Shell / theme / misc ---
(function initShell(){
  const html=document.documentElement;
  html.setAttribute('data-theme',localStorage.getItem('theme')||'dark');

  document.getElementById('themeBtn').onclick=()=>{
    const n=html.getAttribute('data-theme')==='dark'?'light':'dark';
    html.setAttribute('data-theme',n); localStorage.setItem('theme',n);
  };
  document.getElementById('logoutBtn').onclick=()=>{ localStorage.removeItem('role'); location.href='./login.html'; };
  document.getElementById('clearCacheBtn').onclick=async()=>{
    if(!confirm('Clear caches + local DB?')) return;
    if('caches' in window){ const names=await caches.keys(); for(const n of names) await caches.delete(n); }
    if (window.db && typeof window.db.delete==='function'){ try{ await window.db.delete(); }catch{} }
    const keep=localStorage.getItem('theme'); localStorage.clear(); if(keep) localStorage.setItem('theme',keep);
    location.reload();
  };
})();

// --- Notifications toggle ---
(function notifications(){
  const chk = document.getElementById('notifyChk');
  chk.checked = localStorage.getItem('notify')==='1';
  chk.onchange = async ()=>{
    if(chk.checked){
      const perm = await Notification.requestPermission();
      if(perm!=='granted'){ chk.checked=false; alert('Notifications blocked by browser.'); return; }
      localStorage.setItem('notify','1');
    }else{
      localStorage.removeItem('notify');
    }
  };
})();

// --- Service worker ---
document.getElementById('regSwBtn').onclick = async ()=>{
  try{
    if('serviceWorker' in navigator){
      await navigator.serviceWorker.register('/service-worker.js');
      alert('Service worker registered.');
    }else{
      alert('Service worker not supported in this browser.');
    }
  }catch(e){ console.error(e); alert('SW registration failed'); }
};

// ---------------------------------------------------------------------------
// Seed helpers (local Dexie only)
// ---------------------------------------------------------------------------
const dbOk = !!(window.db && typeof window.db.transaction==='function');
if(!dbOk){
  console.warn('[settings] window.db not ready. Make sure scripts/db.js sets window.db');
}

const todayISO = () => new Date().toISOString().slice(0,10);
const dateShift = (d, deltaDays) => {
  const x=new Date(d); x.setDate(x.getDate()+deltaDays); return x.toISOString().slice(0,10);
};
const rand = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;
const pick = (arr)=> arr[Math.floor(Math.random()*arr.length)];

// --- Seed Test Data (patients, appointments, slots, lab) -------------------
async function seedTestData(){
  if(!dbOk) return alert('DB not ready');

  const base = todayISO();
  const PIDS = ['P001','P002','P003','P004','P005'];
  const NAMES= ['Aarav','Vihaan','Ira','Anaya','Kabir'];
  const PHONES=['9000000001','9000000002','9000000003','9000000004','9000000005'];

  // Patients (upsert by phone or pid)
  for(let i=0;i<PIDS.length;i++){
    const rec = { pid:PIDS[i], phone:PHONES[i], name:NAMES[i], parent:'Parent '+(i+1), dob:'2019-01-0'+(i+1) };
    const dupe = await db.patients.where('phone').equals(rec.phone).first()
                  || await db.patients.where('pid').equals(rec.pid).first();
    if(dupe) await db.patients.update(dupe.id,{...rec,updatedAt:Date.now()});
    else await db.patients.add({...rec,createdAt:Date.now(),updatedAt:Date.now()});
  }

  // Appointments for last 7 days (random mix)
  for(let d=6; d>=0; d--){
    const day = dateShift(base, -d);
    for(let t=0; t<rand(3,7); t++){
      const idx = rand(0, PIDS.length-1);
      const token = t+1;
      const time = ('0'+rand(9,13)).slice(-2)+':'+(rand(0,1)?'00':'30'); // 09:00..13:30
      const st = pick(['pending','approved','done','approved','pending']); // more realistic
      await db.appointments.add({
        date: day, time, token, pid:PIDS[idx], name:NAMES[idx], phone:PHONES[idx],
        reason: pick(['Fever','Cold','Routine','Cough','Rash']),
        status: st
      });
    }
  }

  // Slots for today (fallback board)
  const today = base;
  const existingSlots = await db.slots.where('date').equals(today).count();
  if(existingSlots===0){
    const tokens = Array.from({length:12},(_,i)=>i+1);
    for(const tk of tokens){
      const tm = ('0'+(9+Math.floor((tk-1)/2))).slice(-2)+':'+(tk%2?'00':'30');
      await db.slots.add({
        date: today, time: tm, token: tk,
        name:'', phone:'', apptStatus: pick(['pending','approved','pending'])
      });
    }
  }

  // Lab tests master (minimal)
  if(await db.labTests.count()===0){
    await db.labTests.bulkAdd([
      { code:'HB',   name:'Hemoglobin', price:180 },
      { code:'CBC',  name:'Complete Blood Count', price:350 },
      { code:'CRP',  name:'C-Reactive Protein', price:420 },
    ]);
  }

  // One lab order today for a random patient
  const i = rand(0,PIDS.length-1);
  await db.labInvoices.add({ date:base, patientId:PIDS[i], patientName:NAMES[i], amount: 350 });

  alert('Seed Test Data: done.');
}

// Clear only demo rows created by the seeder (safe)
async function clearTestData(){
  if(!dbOk) return alert('DB not ready');
  if(!confirm('Clear ALL test data?')) return;

  const pids = ['P001','P002','P003','P004','P005'];

  // patients
  for(const pid of pids){
    const rows = await db.patients.where('pid').equals(pid).toArray();
    for(const r of rows) await db.patients.delete(r.id);
  }

  // appointments by pid set
  const appts = await db.appointments.toArray();
  for(const a of appts) if(pids.includes(a.pid||'')) await db.appointments.delete(a.id);

  // slots (only today; harmless to clear all today’s)
  const today = todayISO();
  const slots = await db.slots.where('date').equals(today).toArray();
  for(const s of slots) await db.slots.delete(s.id);

  // lab demo any with those pids
  const labs = await db.labInvoices.toArray();
  for(const l of labs) if(pids.includes(l.patientId||'')) await db.labInvoices.delete(l.id);

  alert('Cleared test data.');
}

// --- Seed Pharmacy (items SEED-*, stock, sample invoices, vouchers) -------
async function seedPharmacyData(){
  if(!dbOk) return alert('DB not ready');

  const items = [
    {sku:'SEED-PARA-250', name:'Paracetamol 250mg', mrp:28,  stock:150},
    {sku:'SEED-PARA-500', name:'Paracetamol 500mg', mrp:36,  stock:180},
    {sku:'SEED-IBU-200',  name:'Ibuprofen 200mg',   mrp:32,  stock:120},
    {sku:'SEED-ZINC',     name:'Zincovit Syrup',    mrp:95,  stock:60},
    {sku:'SEED-ORS',      name:'ORS Sachet',        mrp:20,  stock:300},
  ];

  for(const it of items){
    const old = await db.pharmacyItems.where('sku').equals(it.sku).first();
    if(old) await db.pharmacyItems.update(old.id,it);
    else await db.pharmacyItems.add(it);
  }

  // Create a couple of invoices today
  const d = todayISO();
  const saleId = await db.invoices.add({ date:d, type:'sale', total: 280, party:'P001' });
  await db.invoiceItems.bulkAdd([
    { invoiceId:saleId, sku:'SEED-PARA-250', name:'Paracetamol 250mg', qty:2, price:28, party:'P001' },
    { invoiceId:saleId, sku:'SEED-ZINC',     name:'Zincovit Syrup',    qty:1, price:95, party:'P001' },
    { invoiceId:saleId, sku:'SEED-ORS',      name:'ORS Sachet',        qty:5, price:20, party:'P001' },
  ]);
  // adjust stock for the items above
  for(const line of await db.invoiceItems.where('invoiceId').equals(saleId).toArray()){
    const it = await db.pharmacyItems.where('sku').equals(line.sku).first();
    if(it) await db.pharmacyItems.update(it.id,{ stock: Number(it.stock||0) - Number(line.qty||0) });
  }

  // Receipt voucher (demo)
  await db.vouchers.add({ date:d, type:'receipt', amount:280, party:'P001', note:'DEMO receipt for sale #'+saleId });

  alert('Seed Pharmacy Data: done.');
}

async function clearPharmacyData(){
  if(!dbOk) return alert('DB not ready');
  if(!confirm('Clear pharmacy demo data?')) return;

  // delete items & adjust dependent demo docs
  const items = await db.pharmacyItems.toArray();
  for(const it of items){
    if((it.sku||'').startsWith('SEED-')) await db.pharmacyItems.delete(it.id);
  }

  // invoices & lines that reference SEED-* or have DEMO notes
  const lines = await db.invoiceItems.toArray();
  const seedLineIds = lines.filter(l=>(l.sku||'').startsWith('SEED-')).map(l=>l.invoiceId);
  const inv = await db.invoices.toArray();
  for(const i of inv){
    if(seedLineIds.includes(i.id)) await db.invoices.delete(i.id);
  }
  for(const l of lines){
    if((l.sku||'').startsWith('SEED-')) await db.invoiceItems.delete(l.id);
  }

  const vouchers = await db.vouchers.toArray();
  for(const v of vouchers){ if((v.note||'').startsWith('DEMO')) await db.vouchers.delete(v.id); }

  alert('Cleared pharmacy demo data.');
}

// --- Wire buttons ---
document.getElementById('seedBtn').onclick       = ()=>seedTestData().catch(console.error);
document.getElementById('clearBtn').onclick      = ()=>clearTestData().catch(console.error);
document.getElementById('seedPharmBtn').onclick  = ()=>seedPharmacyData().catch(console.error);
document.getElementById('clearPharmBtn').onclick = ()=>clearPharmacyData().catch(console.error);
