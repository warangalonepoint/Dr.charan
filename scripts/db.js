// scripts/db.js
// Local Dexie DB (IndexedDB) — NO Supabase

if (!window.db) {
  const db = new Dexie("ClinicDB");

  db.version(1).stores({
    // Patients
    patients: "++id,pid,phone,name,parent,dob,createdAt,updatedAt",
    // IMPORTANT: keep this exact name; pages read db.patientHistory
    patientHistory: "++id,pid,date,author,note",

    // Bookings
    appointments: "++id,date,time,token,pid,phone,name,status,reason",
    slots: "++id,date,time,token,apptStatus,key",

    // Pharmacy
    invoices: "++id,date,type,total,party,supplier,bill",
    invoiceItems: "++id,invoiceId,sku,name,qty,price,party",
    vouchers: "++id,date,type,amount,party,note",

    pharmacyItems: "++id,sku,name,mrp,stock,barcode",

    // Lab
    labTests: "++id,code,name,price,barcode",
    labInvoices: "++id,date,patientId,patientName,amount",

    // Staff
    staff: "++id,name,role,phone"
  });

  window.db = db;
}
