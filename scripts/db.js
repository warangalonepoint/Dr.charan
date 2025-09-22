// scripts/db.js
if (!self.Dexie) console.error('Dexie not present before db.js.');

const db = new Dexie('dr_charan_clinic');
db.version(4).stores({
  clinic: 'id',
  pins: 'role',
  patients: '++id, pid, phone, name, barcode, dob, parent, heightCm, weightKg, createdAt, updatedAt',
  appointments: '++id, date, time, pid, name, phone, token, status, source, reason, approvedAt, doneAt',
  slots: '++id, date, time, key, status, pid, name, phone, source, token, apptStatus',
  pharmacyItems: '++id, sku, barcode, name, stock, mrp',
  invoices: '++id, date, type, total, pid, party, supplier, bill',
  invoiceItems: '++id, invoiceId, sku, name, qty, price, party',
  vouchers: '++id, date, type, amount, party, note',
  labInvoices: '++id, date, patientId, patientName, amount',
  labStock: '++id, name, qty',
  labTests: '++id, code, name, price, barcode',
  patientHistory: '++id, pid, date, note, author, meta',
  staff: '++id, name, role, phone',
  attendance: '++id, date, staffId, inAt, outAt'
});
async function seedOnce(){
  await db.open();
  if(!(await db.clinic.get('meta'))){
    await db.clinic.put({ id:'meta', name:'Dr. Charan Child Clinic', address:'-', phone:'-' });
  }
  if(await db.labTests.count()===0){
    await db.labTests.bulkAdd([
      { code:'HB',  name:'Hemoglobin', price:150, barcode:'LT001' },
      { code:'CBC', name:'Complete Blood Count', price:400, barcode:'LT002' },
      { code:'CRP', name:'CRP', price:500, barcode:'LT003' },
      { code:'TSH', name:'TSH', price:350, barcode:'LT004' }
    ]);
  }
}
seedOnce().catch(console.error);

export default db;