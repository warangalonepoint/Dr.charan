// scripts/test-seed.js
// Plain script (no modules). Exposes window.seedTestData / window.clearTestData

(function () {
  if (!window.Dexie) { console.error("test-seed: Dexie not loaded"); return; }
  if (!window.db)    { console.error("test-seed: window.db not found. Ensure scripts/db.js sets window.db = db"); return; }

  const REQUIRED = [
    "patients","appointments","invoices","invoiceItems","labInvoices","patientHistory","staff"
  ];

  const demoPatients = [
    { pid: "P001", name: "Test Child 1", phone: "9000000001", parent: "Parent 1" },
    { pid: "P002", name: "Test Child 2", phone: "9000000002", parent: "Parent 2" },
    { pid: "P003", name: "Test Child 3", phone: "9000000003", parent: "Parent 3" },
    { pid: "P004", name: "Test Child 4", phone: "9000000004", parent: "Parent 4" },
    { pid: "P005", name: "Test Child 5", phone: "9000000005", parent: "Parent 5" }
  ];

  const todayISO = () => new Date().toISOString().slice(0,10);
  const dayISO = (off=0)=>{ const d=new Date(); d.setDate(d.getDate()-off); return d.toISOString().slice(0,10); };
  const rint = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;

  async function ensureReady(){
    await db.open();
    const have = db.tables.map(t=>t.name);
    const missing = REQUIRED.filter(n=>!have.includes(n));
    if(missing.length){
      throw new Error("test-seed: Missing stores in db.js — "+missing.join(", "));
    }
  }

  async function clearTestData(){
    await ensureReady();
    for(const p of demoPatients){
      await db.appointments.where("pid").equals(p.pid).delete();
      await db.invoiceItems.where("party").equals(p.name).delete();
      await db.invoices.where("pid").equals(p.pid).delete();
      await db.labInvoices.where("patientId").equals(p.pid).delete();
      await db.patientHistory.where("pid").equals(p.pid).delete();
      await db.patients.where("pid").equals(p.pid).delete();
    }
    const seedStaff = await db.staff.where("role").startsWith("Seed ").toArray();
    for(const s of seedStaff) await db.staff.delete(s.id);

    try{
      localStorage.setItem("clinic.pulse", JSON.stringify({t:Date.now(),evt:"test-data-cleared"}));
      localStorage.removeItem("clinic.pulse");
    }catch{}
    console.info("test-seed: cleared");
    return true;
  }

  async function seedTestData(){
    await ensureReady();
    await clearTestData();

    const today = todayISO();

    // Patients
    for(const p of demoPatients){
      await db.patients.add({
        pid:p.pid, phone:p.phone, name:p.name, barcode:p.pid, dob:"2020-01-01",
        parent:p.parent, heightCm:90+rint(0,20), weightKg:12+rint(0,8),
        createdAt:Date.now(), updatedAt:Date.now()
      });
    }

    // Appointments today (mixed statuses)
    let token=1;
    for(const p of demoPatients){
      const status = ["pending","approved","done","cancelled"][(token-1)%4];
      await db.appointments.add({
        date:today, time:`${9+token}:00`, pid:p.pid, name:p.name, phone:p.phone,
        token, status, source: token%2 ? "walk-in":"online",
        reason:"General Checkup", approvedAt: status!=="pending"?Date.now():null,
        doneAt: status==="done"?Date.now():null
      });
      token++;
    }

    // Pharmacy invoices 7 days
    let billNo=1;
    for(let d=6; d>=0; d--){
      const date = dayISO(d);
      for(const p of demoPatients){
        const total = 120 + rint(0,3)*60;
        const invoiceId = await db.invoices.add({
          date, type:"sale", total, pid:p.pid, party:p.name, supplier:null,
          bill:`INV${String(billNo).padStart(4,"0")}`
        });
        await db.invoiceItems.add({
          invoiceId, sku:`MED${String(billNo).padStart(3,"0")}`, name:"Paracetamol Syrup",
          qty:1, price:total, party:p.name
        });
        if(Math.random()<0.15){
          await db.invoices.add({
            date, type:"sale-return", total:Math.round(total*0.5),
            pid:p.pid, party:p.name, supplier:null, bill:`RET${String(billNo).padStart(4,"0")}`
          });
        }
        billNo++;
      }
    }

    // Lab invoices today
    for(const p of demoPatients){
      await db.labInvoices.add({ date:today, patientId:p.pid, patientName:p.name, amount:300+rint(0,4)*100 });
    }

    // Patient history
    for(const p of demoPatients){
      await db.patientHistory.add({ pid:p.pid, date:today, note:"Auto-seeded consultation note.", author:"Dr. Charan", meta:{source:"auto-test"} });
    }

    // Seed staff
    await db.staff.bulkAdd([
      { name:"Seed Front Office", role:"Seed FrontOffice", phone:"9000090000" },
      { name:"Seed Supervisor",   role:"Seed Supervisor",  phone:"9000090001" }
    ]);

    try{
      localStorage.setItem("clinic.pulse", JSON.stringify({t:Date.now(),evt:"test-data-seeded",payload:{n:demoPatients.length}}));
      localStorage.removeItem("clinic.pulse");
    }catch{}

    console.info("test-seed: seeded");
    return true;
  }

  // expose globals (required by settings.html buttons)
  window.seedTestData  = seedTestData;
  window.clearTestData = clearTestData;
})();