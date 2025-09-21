// scripts/pharmacy-seed.js
// Seeds basic pharmacy masters + stock and vouchers.
// Works in: Local Dexie OR Supabase via cloud.js

(function () {
  const isCloud = !!(window.cloud && typeof window.cloud.insert === "function");
  const today = () => new Date().toISOString().slice(0, 10);

  async function upsert(table, rows, conflictCols) {
    if (!rows?.length) return;
    if (isCloud) return window.cloud.upsert(table, rows, conflictCols);
    // local
    const tx = window.db.transaction(table, "readwrite");
    const store = window.db[table];
    for (const r of rows) await store.add(r).catch(async () => { /* ignore duplicates */ });
    await tx.done?.catch?.(()=>{});
  }

  async function seedPharmacyData() {
    const items = [
      { sku: "SEED-PARA-250", name: "Paracetamol 250mg", mrp: 35, stock: 120, barcode: "890000000001", meta:{seed:true}},
      { sku: "SEED-AZ-500",   name: "Azithromycin 500mg", mrp: 120, stock: 60, barcode: "890000000002", meta:{seed:true}},
      { sku: "SEED-ZINC",     name: "Zincovit",           mrp: 95, stock: 80, barcode: "890000000003", meta:{seed:true}},
      { sku: "SEED-ORS",      name: "ORS 200ml",          mrp: 25, stock: 200, barcode: "890000000004", meta:{seed:true}},
    ];
    await upsert(isCloud ? "pharmacy_items" : "pharmacyItems", items, ["sku"]);

    // Optional: a zero-amount voucher to indicate seeding
    const v = { date: today(), type: "journal", party: "seed", amount: 0, note: "pharmacy-seed", meta:{seed:true} };
    if (isCloud) await window.cloud.insert("vouchers", v).catch(()=>{});
    else await window.db.vouchers.add(v).catch(()=>{});

    return true;
  }

  async function clearPharmacyData() {
    if (isCloud) {
      await window.cloud.del("pharmacy_items", { "sku": "like.SEED-%" }).catch(()=>{});
      await window.cloud.del("vouchers", { "party": "seed" }).catch(()=>{});
    } else {
      const rows = await window.db.pharmacyItems.toArray();
      const ids = rows.filter(x => (x.sku||"").startsWith("SEED-")).map(x => x.id);
      await window.db.pharmacyItems.bulkDelete(ids);
      const v = await window.db.vouchers.toArray();
      const vids = v.filter(x => x.party === "seed").map(x => x.id);
      await window.db.vouchers.bulkDelete(vids);
    }
  }

  window.seedPharmacyData = seedPharmacyData;
  window.clearPharmacyData = clearPharmacyData;
})();
