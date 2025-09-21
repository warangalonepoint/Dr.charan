// scripts/settings.js
// Works with local Dexie only (window.db). Safe to call multiple times.

(function () {
  const html = document.documentElement;

  // ----- Theme / buttons -----
  const E = (id) => document.getElementById(id);
  const notifyChk = E('notifyChk');
  const regSwBtn = E('regSwBtn');

  const seedBtn = E('seedBtn');
  const clearBtn = E('clearBtn');
  const seedPharmBtn = E('seedPharmBtn');
  const clearPharmBtn = E('clearPharmBtn');

  html.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');
  E('themeBtn')?.addEventListener('click', () => {
    const n = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', n);
    localStorage.setItem('theme', n);
  });

  E('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('role');
    location.href = './login.html';
  });

  E('clearCacheBtn')?.addEventListener('click', async () => {
    if (!confirm('Clear caches + DB?')) return;
    if ('caches' in window) {
      const names = await caches.keys();
      for (const n of names) await caches.delete(n);
    }
    try { await db.delete(); } catch {}
    const keep = localStorage.getItem('theme');
    localStorage.clear();
    if (keep) localStorage.setItem('theme', keep);
    location.reload();
  });

  // Notifications checkbox
  notifyChk?.addEventListener('change', async () => {
    if (notifyChk.checked) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('Notifications not granted by browser.');
        notifyChk.checked = false;
      }
    }
    localStorage.setItem('notifyAllowed', notifyChk.checked ? '1' : '0');
  });
  notifyChk.checked = localStorage.getItem('notifyAllowed') === '1';

  // Register SW
  regSwBtn?.addEventListener('click', async () => {
    try {
      if ('serviceWorker' in navigator) {
        const r = await navigator.serviceWorker.register('/service-worker.js');
        alert('Service worker registered: ' + (r?.scope || '(ok)'));
      } else {
        alert('Service worker not supported');
      }
    } catch (e) {
      alert('SW error: ' + e.message);
    }
  });

  // ======== Seeding helpers (LOCAL ONLY) ========
  function today(n = 0) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function timeOf(h, m = 0) {
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toTimeString().slice(0, 5);
  }
  function tokenKey(date, token) { return `${date}#${token}`; }

  async function ensureDB() {
    if (!window.db) throw new Error('DB not ready');
    // trigger open
    await db.open();
    return db;
  }

  // ---- Clear groups (safe) ----
  async function clearClinicData() {
    const d = await ensureDB();
    await d.transaction('rw', d.patients, d.appointments, d.slots, d.patientHistory, d.labInvoices, async () => {
      await d.patients.clear();
      await d.appointments.clear();
      await d.slots.clear();
      await d.patientHistory.clear();
      await d.labInvoices.clear();
    });
  }
  async function clearPharmacyData() {
    const d = await ensureDB();
    await d.transaction('rw', d.pharmacyItems, d.invoices, d.invoiceItems, d.vouchers, d.labTests, async () => {
      await d.pharmacyItems.clear();
      await d.invoices.clear();
      await d.invoiceItems.clear();
      await d.vouchers.clear();
      await d.labTests.clear();
    });
  }

  // ---- Seed clinic (patients + 7-day bookings/slots + small lab) ----
  async function seedClinicData() {
    const d = await ensureDB();

    const patients = [
      { pid:'P001', phone:'9000000001', name:'Aarav',  parent:'Mr. Rao' },
      { pid:'P002', phone:'9000000002', name:'Diya',   parent:'Ms. Mehta' },
      { pid:'P003', phone:'9000000003', name:'Ishaan', parent:'Mr. Khan' },
      { pid:'P004', phone:'9000000004', name:'Mira',   parent:'Mrs. Das' },
      { pid:'P005', phone:'9000000005', name:'Riya',   parent:'Mr. Patil' },
    ].map(p => ({ ...p, createdAt:Date.now(), updatedAt:Date.now() }));

    const days = [...Array(7)].map((_,i)=> today(-i)).reverse();
    const appts = [];
    const slots  = [];

    let tkn = 1;
    for (const dte of days) {
      for (let i = 0; i < 6; i++) {
        const pat = patients[i % patients.length];
        const token = tkn++;
        const st = i % 3 === 0 ? 'approved' : (i % 5 === 0 ? 'done' : 'pending');
        appts.push({
          date:dte, time: timeOf(9 + (i % 6), (i % 2) * 30),
          token, pid: pat.pid, phone: pat.phone, name: pat.name,
          status: st, reason: i%2 ? 'Fever' : 'Routine'
        });
        slots.push({
          date:dte, time: timeOf(9 + (i % 6), (i % 2) * 30),
          token, apptStatus: st, key: tokenKey(dte, token)
        });
      }
    }

    const history = patients.map(p => ({
      pid: p.pid, date: today(-1), author:'doctor',
      note: `${p.name} presented with mild fever. Paracetamol advised.`
    }));

    await d.transaction('rw',
      d.patients, d.appointments, d.slots, d.patientHistory, d.labInvoices,
      async () => {
        await d.patients.bulkAdd(patients);
        await d.appointments.bulkAdd(appts);
        await d.slots.bulkAdd(slots);
        await d.patientHistory.bulkAdd(history);
        await d.labInvoices.add({
          date: today(), patientId: patients[0].pid, patientName: patients[0].name, amount: 850
        });
      });

    // Return counts for UI
    return {
      patients: await d.patients.count(),
      appts: await d.appointments.count(),
      slots: await d.slots.count(),
      hist: await d.patientHistory.count(),
      labInv: await d.labInvoices.count()
    };
  }

  // ---- Seed pharmacy ----
  async function seedPharmacy() {
    const d = await ensureDB();

    const items = [
      { sku:'SEED-PARA-250', name:'Paracetamol 250mg', mrp:20,  stock:120 },
      { sku:'SEED-IBU-200',  name:'Ibuprofen 200mg',    mrp:35,  stock:90  },
      { sku:'SEED-ORS',      name:'ORS Sachet',         mrp:18,  stock:200 },
      { sku:'SEED-ZINC',     name:'Zinc 20mg',          mrp:28,  stock:150 },
    ];

    await d.transaction('rw', d.pharmacyItems, d.labTests, d.invoices, d.invoiceItems, d.vouchers, async () => {
      await d.pharmacyItems.bulkAdd(items);
      await d.labTests.bulkAdd([
        { code:'CBC', name:'Complete Blood Count', price:400 },
        { code:'CRP', name:'C-Reactive Protein',   price:350 }
      ]);

      // One demo sale today
      const invId = await d.invoices.add({ date: today(), type:'sale', total: 20*2 + 35, party:'P001' });
      await d.invoiceItems.bulkAdd([
        { invoiceId:invId, sku:'SEED-PARA-250', name:'Paracetamol 250mg', qty:2, price:20, party:'P001' },
        { invoiceId:invId, sku:'SEED-IBU-200',  name:'Ibuprofen 200mg',  qty:1, price:35, party:'P001' },
      ]);
      // Decrease stock
      await d.pharmacyItems.where('sku').equals('SEED-PARA-250').modify(x => x.stock = (x.stock||0) - 2);
      await d.pharmacyItems.where('sku').equals('SEED-IBU-200').modify(x => x.stock = (x.stock||0) - 1);

      // Receipt voucher
      await d.vouchers.add({ date: today(), type:'receipt', amount: 75, party:'P001', note:'Seed demo sale' });
    });

    return {
      items: await d.pharmacyItems.count(),
      invoices: await d.invoices.count(),
      voucher: await d.vouchers.count()
    };
  }

  // ===== Wire buttons =====
  seedBtn?.addEventListener('click', async () => {
    try {
      const stats = await seedClinicData();
      alert(`Seeded clinic:\nPatients=${stats.patients}\nAppointments=${stats.appts}\nSlots=${stats.slots}\nHistory=${stats.hist}\nLab Invoices=${stats.labInv}`);
    } catch (e) {
      alert('Seed error: ' + e.message);
    }
  });
  clearBtn?.addEventListener('click', async () => {
    if (!confirm('Clear ALL test data?')) return;
    await clearClinicData();
    alert('Clinic data cleared');
  });

  seedPharmBtn?.addEventListener('click', async () => {
    try {
      const stats = await seedPharmacy();
      alert(`Seeded pharmacy:\nItems=${stats.items}\nInvoices=${stats.invoices}\nVouchers=${stats.voucher}`);
    } catch (e) {
      alert('Pharmacy seed error: ' + e.message);
    }
  });
  clearPharmBtn?.addEventListener('click', async () => {
    if (!confirm('Clear Pharmacy data?')) return;
    await clearPharmacyData();
    alert('Pharmacy data cleared');
  });
})();
