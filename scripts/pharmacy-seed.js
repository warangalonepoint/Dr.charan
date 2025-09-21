<!-- scripts/pharmacy-seed.js -->
<script>
/**
 * Pharmacy seed / clear.
 * Exposes:
 *   window.seedPharmacyData()
 *   window.clearPharmacyData()
 *
 * Dual-mode (LOCAL via Dexie / CLOUD via cloud.js). Respects window.__FORCE_LOCAL_SEED__.
 */
(function(){
  const cloud = (() => {
    if (window.__FORCE_LOCAL_SEED__) return null;
    if (!window.cloud || !window.cloud.mode) return null;
    const { insert, upsert, remove } = window.cloud;
    return { mode: window.cloud.mode, insert, upsert, remove };
  })();

  const money = (n)=>Number(n||0);
  const today = ()=>new Date().toISOString().slice(0,10);

  const items = [
    { sku:"SEED-PARA-250", name:"Paracetamol 250mg", mrp:30,  barcode:"890000000001", stock:120 },
    { sku:"SEED-PARA-500", name:"Paracetamol 500mg", mrp:38,  barcode:"890000000002", stock:180 },
    { sku:"SEED-ZINCOV",   name:"Zincovit Syrup",    mrp:95,  barcode:"890000000003", stock:80  },
    { sku:"SEED-AZITH",    name:"Azithromycin 250",  mrp:110, barcode:"890000000004", stock:70  },
    { sku:"SEED-ORS",      name:"ORS 200ml",         mrp:22,  barcode:"890000000005", stock:200 },
  ];

  async function seedPharmacyData(){
    if (cloud){
      // upsert items by sku
      for (const it of items){
        await cloud.upsert('pharmacy_items', { sku: it.sku }, it, ['sku']);
      }
      // add a purchase invoice to demonstrate reports + stock movement
      const invId = Date.now() % 100000;
      await cloud.insert('invoices', { date: today(), type:'purchase', total: 5000, supplier:'Seeder', bill:'SEED-'+invId });
      for (const it of items){
        await cloud.insert('invoice_items', { invoiceId: invId, sku: it.sku, name: it.name, qty: 10, price: it.mrp, party:'Seeder' });
      }
      // add a receipt voucher to show accounts
      await cloud.insert('vouchers', { date: today(), type:'receipt', amount: 2500, party:'Cash', note:'Seeder opening balance' });
      alert('Cloud: Pharmacy items upserted + sample purchase and voucher added.');
      return;
    }

    // LOCAL (IndexedDB)
    if (!window.db){ alert('db.js not loaded'); return; }
    const db = window.db;

    // items
    for (const it of items){
      const existing = await db.pharmacyItems.where('sku').equals(it.sku).first();
      if (existing) await db.pharmacyItems.update(existing.id, it);
      else await db.pharmacyItems.add(it);
    }

    // sample purchase invoice (doesn’t auto-change stock; we adjust stock directly for demo)
    const id = await db.invoices.add({ date: today(), type:'purchase', total: 5000, supplier:'Seeder', bill:'SEED-'+(Date.now()%100000) });
    for (const it of items){
      await db.invoiceItems.add({ invoiceId:id, sku: it.sku, name: it.name, qty: 10, price: it.mrp, party:'Seeder' });
    }

    // stock set per items seed
    for (const it of items){
      const row = await db.pharmacyItems.where('sku').equals(it.sku).first();
      if (row) await db.pharmacyItems.update(row.id, { stock: it.stock });
    }

    // accounts voucher
    await db.vouchers.add({ date: today(), type:'receipt', amount: 2500, party:'Cash', note:'Seeder opening balance' });

    alert('Local: Pharmacy items seeded, sample purchase & voucher added, stock set.');
  }

  async function clearPharmacyData(){
    if (cloud){
      await cloud.remove('pharmacy_items', {});
      await cloud.remove('invoices', {});
      await cloud.remove('invoice_items', {});
      await cloud.remove('vouchers', {});
      alert('Cloud: cleared pharmacy tables.');
      return;
    }
    if (!window.db){ alert('db.js not loaded'); return; }
    const db = window.db;
    await db.pharmacyItems.clear();
    await db.invoices.clear();
    await db.invoiceItems.clear();
    await db.vouchers.clear();
    alert('Local: cleared pharmacy tables.');
  }

  window.seedPharmacyData = seedPharmacyData;
  window.clearPharmacyData = clearPharmacyData;
})();
</script>
