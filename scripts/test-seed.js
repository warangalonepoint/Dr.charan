<!-- scripts/test-seed.js -->
<script>
/**
 * Test/demo seeder for clinic data.
 * Exposes:
 *   window.seedTestData()
 *   window.clearTestData()
 *
 * Works in two modes:
 *  - LOCAL  : uses Dexie (db.js / IndexedDB)
 *  - CLOUD  : uses window.cloud.* (provided by cloud.js) if available
 *
 * Force local even when cloud present: set window.__FORCE_LOCAL_SEED__ = true before loading this file.
 */

(function(){
  // --- resolve mode & helpers ---
  const cloud = (() => {
    if (window.__FORCE_LOCAL_SEED__) return null;
    if (!window.cloud || !window.cloud.mode) return null;
    const { insert, upsert, remove } = window.cloud;
    return { mode: window.cloud.mode, insert, upsert, remove };
  })();

  const todayISO = () => new Date().toISOString().slice(0,10);
  const addDays = (d, n) => {
    const dt = new Date(d); dt.setDate(dt.getDate()+n);
    return dt.toISOString().slice(0,10);
  };

  // Random helpers
  const randPick = (arr) => arr[Math.floor(Math.random()*arr.length)];
  const times = ["09:00","09:10","09:20","09:30","09:40","09:50","10:00","10:10","10:20","10:30","10:40","10:50","11:00"];

  // --- payloads ---
  function makePatients(){
    return [
      { pid:"P001", phone:"9000000001", name:"Aarav",   parent:"Rohan",  dob:"2018-07-10", heightCm:120, weightKg:22 },
      { pid:"P002", phone:"9000000002", name:"Aadhya",  parent:"Meera",  dob:"2017-12-03", heightCm:128, weightKg:26 },
      { pid:"P003", phone:"9000000003", name:"Vihaan",  parent:"Kiran",  dob:"2019-02-21", heightCm:110, weightKg:19 },
      { pid:"P004", phone:"9000000004", name:"Ira",     parent:"Anita",  dob:"2020-05-15", heightCm:98,  weightKg:16 },
      { pid:"P005", phone:"9000000005", name:"Advait",  parent:"Sanjay", dob:"2016-09-29", heightCm:135, weightKg:30 },
    ].map(r=>({ ...r, createdAt:Date.now(), updatedAt:Date.now() }));
  }

  function makeAppointmentsSlots(){
    const base = todayISO();
    const appts=[];           // last 7 days mixed statuses
    const slotsToday=[];      // today’s slots (fallback board)

    for (let d=-6; d<=0; d++){
      const date = addDays(base, d);
      let token=1;
      for (const p of ["P001","P002","P003","P004","P005"]){
        const time = times[(token-1) % times.length];
        const status = d< -2 ? randPick(["done","done","approved"]) :
                      d<  0 ? randPick(["approved","pending","done"]) :
                               randPick(["pending","approved"]);
        appts.push({
          date, time, pid:p, name:p, phone:"", token,
          reason: "Consultation",
          status, createdAt:Date.now(), updatedAt:Date.now()
        });
        token++;
      }
    }

    // slots for today (for board fallback / supervisor fallback)
    let sTok=1;
    for (const nm of ["Walkin-1","Walkin-2","Walkin-3","Walkin-4","Walkin-5","Walkin-6"]){
      const time=times[(sTok-1)%times.length];
      slotsToday.push({
        key:`${todayISO()}_${time}_${sTok}`,
        date: todayISO(),
        time, token: sTok, name: nm, phone:"",
        apptStatus: randPick(["pending","approved"]),
      });
      sTok++;
    }
    return { appts, slotsToday };
  }

  function makeInvoicesAndLabs(){
    const base = todayISO();
    const inv=[];       // pharmacy invoices (sales & sale-returns)
    const invItems=[];  // invoice lines
    const labInv=[];    // lab invoices
    const labTests=[    // master list if empty
      { code:"CBC",   name:"Complete Blood Count", price:350 },
      { code:"CRP",   name:"C-Reactive Protein",   price:450 },
      { code:"TSH",   name:"Thyroid Stimulating Hormone", price:400 },
      { code:"DENG",  name:"Dengue NS1 Antigen",   price:1100 },
    ];

    let invoiceIdSeed = 1000;

    for (let d=-6; d<=0; d++){
      const date = addDays(base, d);

      // 2 sales/day + sometimes a return
      for (let k=0; k<2; k++){
        const total = 100 + Math.round(Math.random()*400);
        const id = invoiceIdSeed++;
        inv.push({ date, type:"sale", total, party:null });
        invItems.push({ invoiceId:id, sku:null, name:"Paracetamol 250", qty:1, price:total });
      }
      if (Math.random()<0.3){
        const total = 50 + Math.round(Math.random()*100);
        const id = invoiceIdSeed++;
        inv.push({ date, type:"sale-return", total, party:null });
        invItems.push({ invoiceId:id, sku:null, name:"Zincovit", qty:-1, price:total });
      }

      // lab order
      const lam = 300 + Math.round(Math.random()*900);
      labInv.push({ date, patientId: randPick(["P001","P002","P003","P004","P005"]), patientName:"", amount: lam });
    }

    return { inv, invItems, labInv, labTests };
  }

  // --- write adapters ---
  async function ensureLabTestsExistLocal(db, tests){
    const cnt = await db.labTests.count();
    if (cnt===0) await db.labTests.bulkAdd(tests.map(t=>({ ...t, barcode:null })));
  }
  async function ensureLabTestsExistCloud(tests){
    // upsert by code
    for (const t of tests){
      await cloud.upsert('lab_tests', { code:t.code }, t, ['code']);
    }
  }

  // --- public API ---
  async function seedTestData(){
    const base = todayISO();
    const patients   = makePatients();
    const { appts, slotsToday } = makeAppointmentsSlots();
    const { inv, invItems, labInv, labTests } = makeInvoicesAndLabs();

    if (cloud){
      // CLOUD mode
      await cloud.upsert('patients', {}, patients); // simple multi upsert
      await cloud.upsert('appointments', {}, appts);
      await cloud.upsert('slots', {}, slotsToday);
      await ensureLabTestsExistCloud(labTests);
      await cloud.upsert('invoices', {}, inv);
      await cloud.upsert('invoice_items', {}, invItems);
      await cloud.upsert('lab_invoices', {}, labInv);
      alert('Cloud seed: inserted demo patients, appointments(7d), slots(today), invoices, lab invoices.');
      return;
    }

    // LOCAL mode
    if (!window.db){ alert('db.js not loaded'); return; }
    const db = window.db;

    // patients
    await db.patients.bulkPut(patients);

    // appointments & slots
    await db.appointments.bulkAdd(appts);
    await db.slots.bulkAdd(slotsToday);

    // labs
    await ensureLabTestsExistLocal(db, labTests);
    await db.labInvoices.bulkAdd(labInv);

    // pharmacy (just invoices/lines; inventory is seeded by pharmacy-seed.js)
    for (const row of inv) await db.invoices.add(row);
    for (const li of invItems) await db.invoiceItems.add(li);

    alert('Local seed: demo patients, appointments(7d), slots(today), invoices, lab invoices added.');
  }

  async function clearTestData(){
    if (cloud){
      // ⚠️ Clears demo rows broadly
      await cloud.remove('appointments', {});
      await cloud.remove('slots', {});
      await cloud.remove('invoices', {});
      await cloud.remove('invoice_items', {});
      await cloud.remove('lab_invoices', {});
      await cloud.remove('patients', {});
      alert('Cloud: cleared demo clinic tables.');
      return;
    }
    if (!window.db){ alert('db.js not loaded'); return; }
    const db = window.db;
    await db.appointments.clear();
    await db.slots.clear();
    await db.invoices.clear();
    await db.invoiceItems.clear();
    await db.labInvoices.clear();
    await db.patients.clear();
    alert('Local: cleared demo clinic tables.');
  }

  // expose
  window.seedTestData  = seedTestData;
  window.clearTestData = clearTestData;
})();
</script>
