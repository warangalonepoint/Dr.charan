// scripts/pharmacy-seed.js
// Plain script. Exposes window.seedPharmacyData / window.clearPharmacyData

(function () {
  if (!window.Dexie) { console.error("pharmacy-seed: Dexie not loaded"); return; }
  if (!window.db)    { console.error("pharmacy-seed: window.db not found. Ensure scripts/db.js sets window.db = db"); return; }

  const REQUIRE_STORES = ["pharmacyItems","invoices","invoiceItems","vouchers"];
  const SEED_SKU_PREFIX = "SEED-";
  const SEED_SUPPLIER   = "Seed Supplier";
  const SEED_PARTY      = "Seed Walk-in";
  const SEED_BILL_PREFIX= "PS-";

  const CATALOG = [
    { sku: SEED_SKU_PREFIX+"PARA-250", barcode:"890101", name:"Paracetamol 250mg Syrup 60ml", mrp:55 },
    { sku: SEED_SKU_PREFIX+"ORS",      barcode:"890102", name:"ORS Pack 21g",                 mrp:18 },
    { sku: SEED_SKU_PREFIX+"COUGH-60", barcode:"890103", name:"Cough Syrup 60ml",             mrp:75 },
    { sku: SEED_SKU_PREFIX+"ZINC-10",  barcode:"890104", name:"Zinc Drops 10ml",              mrp:80 },
    { sku: SEED_SKU_PREFIX+"VITA-D",   barcode:"890105", name:"Vit D3 Drops 15ml",            mrp:95 },
    { sku: SEED_SKU_PREFIX+"THERM",    barcode:"890106", name:"Digital Thermometer",          mrp:180 }
  ];

  const dayISO=(off=0)=>{const d=new Date(); d.setDate(d.getDate()-off); return d.toISOString().slice(0,10);};
  const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];

  async function ensureReady(){
    await db.open();
    const have=db.tables.map(t=>t.name);
    const missing = REQUIRE_STORES.filter(s=>!have.includes(s));
    if(missing.length) throw new Error("pharmacy-seed: Missing stores — "+missing.join(", "));
    return { hasAlerts: have.includes("alerts") };
  }

  async function adjustStock(sku, delta){
    const item = await db.pharmacyItems.where("sku").equals(sku).first();
    if(!item) throw new Error("Stock item not found for "+sku);
    const stock = Number(item.stock||0) + Number(delta||0);
    await db.pharmacyItems.update(item.id, { stock });
    return stock;
  }

  async function clearPharmacyData(){
    await ensureReady();
    const items = await db.pharmacyItems.where("sku").startsWith(SEED_SKU_PREFIX).toArray();
    for(const it of items) await db.pharmacyItems.delete(it.id);

    const inv = await db.invoices.where("bill").startsWith(SEED_BILL_PREFIX).toArray();
    for(const v of inv){
      await db.invoiceItems.where("invoiceId").equals(v.id).delete();
      await db.invoices.delete(v.id);
    }

    const vch = await db.vouchers.where("party").equals(SEED_SUPPLIER).toArray();
    for(const v of vch) await db.vouchers.delete(v.id);

    try{
      localStorage.setItem("clinic.pulse", JSON.stringify({t:Date.now(),evt:"pharmacy:cleared"}));
      localStorage.removeItem("clinic.pulse");
    }catch{}
    console.info("pharmacy-seed: cleared");
    return true;
  }

  async function addInvoice({date,type,items,party=null,supplier=null,pid=null}){
    const total = items.reduce((s,it)=>s+Number(it.price)*Number(it.qty),0);
    const bill  = SEED_BILL_PREFIX + Math.random().toString(36).slice(2,7).toUpperCase();
    const invoiceId = await db.invoices.add({ date,type,total,pid,party,supplier,bill });
    for(const it of items){
      await db.invoiceItems.add({
        invoiceId, sku:it.sku, name:it.name, qty:it.qty, price:it.price,
        party: party || supplier || SEED_PARTY
      });
    }
    return { invoiceId, bill, total };
  }

  async function checkLowStockAndAlert(hasAlerts, threshold=5){
    const low = await db.pharmacyItems.where("stock").below(threshold).toArray();
    const today = new Date().toISOString().slice(0,10);
    for(const it of low){
      if(hasAlerts){
        try{ await db.alerts.add({ date:today, type:"low-stock", sku:it.sku, message:`${it.name} low stock: ${it.stock}` }); }catch{}
      }
      if("Notification" in window && Notification.permission==="granted"){
        new Notification("Low stock alert", {
          body: `${it.name} (SKU: ${it.sku}) — only ${it.stock} left`,
          tag: `lowstock-${it.sku}`,
          icon: "./public/assets/icon-192.png",
          badge: "./public/assets/icon-192.png"
        });
      }
    }
    return low.length;
  }

  async function seedPharmacyData(){
    const { hasAlerts } = await ensureReady();
    await clearPharmacyData();

    // Inventory zero; purchases will add stock
    for(const row of CATALOG){
      const exist = await db.pharmacyItems.where("sku").equals(row.sku).first();
      if(!exist) await db.pharmacyItems.add({ ...row, stock:0 });
    }

    // 7-day flow
    for(let d=6; d>=0; d--){
      const date = dayISO(d);

      // Purchases (+stock)
      const pItems=[];
      const pLines=rint(1,2);
      for(let i=0;i<pLines;i++){
        const it=pick(CATALOG); const qty=rint(5,15);
        pItems.push({ sku:it.sku, name:it.name, qty, price:Math.round(it.mrp*0.7) });
      }
      await addInvoice({ date, type:"purchase", supplier:SEED_SUPPLIER, items:pItems });
      for(const li of pItems) await adjustStock(li.sku, +li.qty);

      // sometimes purchase-return
      if(Math.random()<0.25){
        const r=pick(pItems); const rQty=Math.max(1,Math.floor(r.qty/2));
        await addInvoice({ date, type:"purchase-return", supplier:SEED_SUPPLIER, items:[{sku:r.sku,name:r.name,qty:rQty,price:r.price}] });
        await adjustStock(r.sku, -rQty);
      }

      // Sales (-stock)
      const bills=rint(1,3);
      for(let b=0;b<bills;b++){
        const lines=rint(1,3);
        const sItems=[];
        for(let i=0;i<lines;i++){
          const it=pick(CATALOG); const qty=rint(1,3);
          sItems.push({ sku:it.sku, name:it.name, qty, price:it.mrp });
        }
        await addInvoice({ date, type:"sale", party:SEED_PARTY, items:sItems });
        for(const li of sItems) await adjustStock(li.sku, -li.qty);

        if(Math.random()<0.2){
          const rr=pick(sItems); const rQty=1;
          await addInvoice({ date, type:"sale-return", party:SEED_PARTY, items:[{sku:rr.sku,name:rr.name,qty:rQty,price:rr.price}] });
          await adjustStock(rr.sku, +rQty);
        }
      }

      // Vouchers
      await db.vouchers.add({ date, type:"payment", amount:rint(500,2000), party:SEED_SUPPLIER, note:"Seed: Supplier payment" });
      await db.vouchers.add({ date, type:"expense", amount:rint(100,400), party:"Petty Cash", note:"Seed: Pharmacy expense" });
    }

    const lowCount = await checkLowStockAndAlert(hasAlerts);

    try{
      localStorage.setItem("clinic.pulse", JSON.stringify({t:Date.now(),evt:"pharmacy:seeded"}));
      localStorage.removeItem("clinic.pulse");
    }catch{}

    console.info("pharmacy-seed: seeded (low =", lowCount, ")");
    return true;
  }

  // expose
  window.seedPharmacyData  = seedPharmacyData;
  window.clearPharmacyData = clearPharmacyData;
})();