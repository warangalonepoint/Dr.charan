// scripts/db.js
// Local Dexie DB (IndexedDB) — no Supabase, works offline

if (!window.db) {
  const db = new Dexie("ClinicDB");

  db.version(1).stores({
    // Patients
    patients: "++id,pid,phone,name,parent,dob,createdAt,updatedAt",
    patients_history: "++id,pid,date,visit,doctor,note",

    // Bookings
    appointments: "++id,date,time,token,pid,status,reason",
    slots: "++id,date,time,token,apptStatus",

    // Pharmacy
    invoices: "++id,date,type,total,party",
    invoiceItems: "++id,invoiceId,sku,name,qty,price,party",
    vouchers: "++id,date,type,amount,party,note",
    pharmacyItems: "++id,sku,name,mrp,stock",

    // Lab
    labTests: "++id,code,name,price",
    labInvoices: "++id,date,patientId,patientName,amount",

    // Staff
    staff: "++id,name,role,phone"
  });

  window.db = db;
}
