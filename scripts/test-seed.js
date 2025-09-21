// scripts/test-seed.js
// Seeds core clinic data for demos (patients, appointments, slots, lab, invoices)
// Works in: Local Dexie (window.db) OR Supabase via window.cloud (cloud.js)

(function () {
  const isCloud = !!(window.cloud && typeof window.cloud.insert === "function");

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const addDays = (d, n) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().slice(0, 10);
  };

  async function insert(table, row) {
    if (isCloud) return window.cloud.insert(table, row);
    return window.db[table].add(row);
  }
  async function bulkInsert(table, rows) {
    if (!rows.length) return;
    if (isCloud) {
      // upsert by (id/date+token) where applicable
      return window.cloud.upsert(table, rows);
    }
    return window.db[table].bulkAdd(rows);
  }
  async function clearSeed() {
    if (isCloud) {
      // Best-effort: delete where meta.seed = true (cloud.js `del` supports match)
      await window.cloud.del("appointments", { "meta->>seed": "true" }).catch(() => {});
      await window.cloud.del("slots", { "meta->>seed": "true" }).catch(() => {});
      await window.cloud.del("patients", { "meta->>seed": "true" }).catch(() => {});
      await window.cloud.del("lab_invoices", { "meta->>seed": "true" }).catch(() => {});
      await window.cloud.del("invoices", { "meta->>seed": "true" }).catch(() => {});
      await window.cloud.del("invoice_items", { "meta->>seed": "true" }).catch(() => {});
      return;
    }
    // Local: wipe only seeded rows if we can, else drop tables
    const tables = ["appointments", "slots", "patients", "labInvoices", "invoices", "invoiceItems"];
    for (const t of tables) {
      const hasMeta = await window.db[t].where("meta").notEqual(undefined).count().catch(() => 0);
      if (hasMeta) {
        const rows = await window.db[t].toArray();
        const ids = rows.filter(r => r?.meta?.seed).map(r => r.id);
        await window.db[t].bulkDelete(ids);
      } else {
        // fallback: do nothing destructive
      }
    }
  }

  async function seedTestData() {
    const today = todayISO();

    // 1) Patients
    const patients = Array.from({ length: 5 }).map((_, i) => ({
      pid: `P00${i + 1}`,
      phone: `90000000${i + 1}`,
      name: `Child ${i + 1}`,
      parent: `Parent ${i + 1}`,
      dob: addDays(today, -(365 * (i + 1))),
      heightCm: 90 + i * 5,
      weightKg: 12 + i * 2,
      meta: { seed: true }
    }));
    await bulkInsert(isCloud ? "patients" : "patients", patients);

    // 2) Appointments for last 7 days + today
    const appts = [];
    for (let d = -6; d <= 0; d++) {
      const date = addDays(today, d);
      for (let t = 1; t <= 6; t++) {
        const token = t;
        const status = t < 3 ? "approved" : (t === 3 ? "pending" : (t === 5 ? "done" : "cancelled"));
        appts.push({
          date,
          time: `1${t}:00`,
          token,
          pid: patients[(t - 1) % patients.length].pid,
          name: patients[(t - 1) % patients.length].name,
          phone: patients[(t - 1) % patients.length].phone,
          status,
          reason: "General checkup",
          meta: { seed: true }
        });
      }
    }
    await bulkInsert(isCloud ? "appointments" : "appointments", appts);

    // 3) Slots for today (fallback board)
    const slots = [];
    for (let t = 1; t <= 12; t++) {
      const p = patients[(t - 1) % patients.length];
      slots.push({
        date: today,
        time: `1${(t % 10)}:10`,
        token: t,
        name: p.name,
        phone: p.phone,
        apptStatus: t % 4 === 0 ? "approved" : (t % 5 === 0 ? "done" : "pending"),
        key: `${today}#${t}`,
        meta: { seed: true }
      });
    }
    await bulkInsert(isCloud ? "slots" : "slots", slots);

    // 4) Lab invoices last 7 days
    const labInvs = [];
    for (let d = -6; d <= 0; d++) {
      const date = addDays(today, d);
      labInvs.push({
        date,
        patientId: patients[(d + 6) % patients.length].pid,
        patientName: patients[(d + 6) % patients.length].name,
        amount: 200 + (d + 6) * 10,
        meta: { seed: true }
      });
    }
    await bulkInsert(isCloud ? "lab_invoices" : "labInvoices", labInvs);

    // 5) Pharmacy invoices (sales + returns)
    const pharmInvs = [];
    for (let d = -6; d <= 0; d++) {
      const date = addDays(today, d);
      pharmInvs.push({ date, type: "sale", total: 500 + (d + 6) * 25, party: null, meta: { seed: true } });
      if ((d + 6) % 3 === 0) pharmInvs.push({ date, type: "sale-return", total: 50, party: null, meta: { seed: true } });
    }
    await bulkInsert(isCloud ? "invoices" : "invoices", pharmInvs);

    // invoice_items (minimal)
    const items = pharmInvs.map((inv, i) => ({
      invoiceId: i + 1, // local Dexie will differ; purely demo; safe in analytics views
      sku: "DEMO",
      name: "Paracetamol 250mg",
      qty: 1,
      price: Number(inv.total || 0),
      meta: { seed: true }
    }));
    await bulkInsert(isCloud ? "invoice_items" : "invoiceItems", items);

    return true;
  }

  // Expose globals
  window.seedTestData = seedTestData;
  window.clearTestData = clearSeed;
})();
