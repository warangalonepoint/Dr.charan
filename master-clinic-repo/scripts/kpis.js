// Small aggregators for dashboard tile badges, etc.

import db from './db.js';

export async function kpiToday() {
  const d = new Date().toISOString().slice(0,10);
  const appts = await db.appointments.where('date').equals(d).toArray();
  const pending = appts.filter(a => (a.status || 'pending') === 'pending').length;
  const approved = appts.filter(a => a.status === 'approved').length;
  const done = appts.filter(a => a.status === 'done').length;

  const inv = await db.invoices.where('date').equals(d).toArray();
  const bills = inv.length;
  const revenue = inv.filter(i => i.type === 'sale').reduce((s,i)=> s + Number(i.total||0), 0);

  const labOrders = await db.labInvoices.where('date').equals(d).count();

  return { pending, approved, done, bills, revenue, labOrders, totalBookings: appts.length };
}