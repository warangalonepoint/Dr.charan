<script>
// pharmacy-seed.js
(function(){
  const hasCloud = !!(window.cloud && typeof window.cloud.insert === 'function');
  let db;
  async function ensureDB(){
    if (db) return db;
    if (!window.Dexie || !window.db) throw new Error('[pharm-seed] Dexie/db.js not loaded');
    db = window.db || (await import('./db.js')).default;
    return db;
  }
  function today(d=0){ const t=new Date(); t.setDate(t.getDate()+d); return t.toISOString().slice(0,10); }

  async function seedPharmacyData(){
    await ensureDB();
    console.log('[pharm-seed] start');

    const items = [
      { name:'Paracetamol 250mg', sku:'SEED-PARA-250', mrp:35, stock:80, barcode:'PARA250' },
      { name:'Cetrizine 10mg',   sku:'SEED-CET-10',   mrp:28, stock:90, barcode:'CET10' },
      { name:'ORS 1L',           sku:'SEED-ORS-1L',   mrp:22, stock:60, barcode:'ORS1' }
    ];
    for (const it of items){
      const ex = await db.pharmacyItems.where('sku').equals(it.sku).first();
      if (ex) await db.pharmacyItems.update(ex.id,it); else await db.pharmacyItems.add(it);
    }

    // seed some purchases + receipts and sales
    for (let d=-3; d<=0; d++){
      const invP = await db.invoices.add({ date:today(d), type:'purchase', total:500 + d*20, supplier:'SEED-SUP', bill:'BILL-'+(100+d) });
      await db.invoiceItems.add({ invoiceId:invP, sku:'SEED-PARA-250', name:'Paracetamol 250mg', qty:10, price:30, party:'SEED-SUP' });
      // bump stock
      const it = await db.pharmacyItems.where('sku').equals('SEED-PARA-250').first();
      if (it) await db.pharmacyItems.update(it.id,{ stock: (it.stock||0) + 10 });

      const invS = await db.invoices.add({ date:today(d), type:'sale', total:120 + d*10, party:null });
      await db.invoiceItems.add({ invoiceId:invS, sku:'SEED-CET-10', name:'Cetrizine 10mg', qty:2, price:28, party:null });
      const it2 = await db.pharmacyItems.where('sku').equals('SEED-CET-10').first();
      if (it2) await db.pharmacyItems.update(it2.id,{ stock: Math.max(0,(it2.stock||0) - 2) });
    }

    // Zero-amount journal to show in reports
    await db.vouchers.add({ date:today(0), type:'journal', amount:0, party:'note', note:'pharmacy demo seed' });

    if (hasCloud){
      try{
        for (const it of items){
          await window.cloud.upsert('pharmacy_items', { sku:it.sku, name:it.name, barcode:it.barcode, mrp:it.mrp, stock:it.stock }, ['sku']);
        }
        console.log('[pharm-seed] cloud mirror ok');
      }catch(e){ console.warn('[pharm-seed] cloud mirror skipped:', e.message); }
    }

    console.log('[pharm-seed] done');
    return true;
  }

  async function clearPharmacyData(){
    await ensureDB();
    const seedItems = await db.pharmacyItems.where('sku').startsWith('SEED-').toArray();
    for (const r of seedItems) await db.pharmacyItems.delete(r.id);

    const inv = await db.invoices.toArray();
    for (const i of inv){
      if ((i.supplier||'').includes('SEED') || i.type==='sale' || i.type==='purchase'){
        await db.invoices.delete(i.id);
      }
    }
    await db.invoiceItems.clear();

    const vAll = await db.vouchers.toArray();
    for (const v of vAll){ if ((v.note||'').includes('demo seed') || v.party==='note') await db.vouchers.delete(v.id); }

    if (hasCloud){
      try{ await window.cloud.delete('pharmacy_items', { sku: 'SEED-%' }); }catch{}
    }
    return true;
  }

  window.seedPharmacyData = seedPharmacyData;
  window.clearPharmacyData = clearPharmacyData;
})();
</script>
