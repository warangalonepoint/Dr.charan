// Helpers for public booking board KPIs.

export function nowServingFromList(list, statusKey = 'status') {
  // highest approved token not yet done
  const approved = list.filter(x => (x[statusKey] || 'pending') === 'approved')
                       .sort((a,b) => (Number(b.token||0) - Number(a.token||0)));
  const doneTokens = new Set(list.filter(x => (x[statusKey] || '') === 'done').map(x => String(x.token||'')));
  const cur = approved.find(x => !doneTokens.has(String(x.token||'')));
  return cur ? `#${cur.token||''} • ${cur.time||''}` : '—';
}

export function splitQueues(list, statusKey = 'status') {
  const pending = list.filter(a => (a[statusKey] || 'pending') === 'pending');
  const approved = list.filter(a => (a[statusKey] || '') === 'approved');
  const done = list.filter(a => (a[statusKey] || '') === 'done');
  return { pending, approved, done };
}