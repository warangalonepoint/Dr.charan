// Cross-tab live updates: BroadcastChannel + localStorage pulse fallback.
// Usage:
//   emitClinicChange('appointments:changed', {id, date, status})
//   onClinicChange((msg) => {...})

const BUS = 'clinic_bus';
const LS_KEY = 'clinic.pulse';

let bc = null;
try {
  bc = new BroadcastChannel(BUS);
} catch (_) { /* Safari/iOS private mode */ }

export function emitClinicChange(evt, payload = {}) {
  const msg = { t: Date.now(), evt, payload };
  if (bc) {
    bc.postMessage(msg);
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(msg));
    // write twice to trigger in some iOS oddities
    localStorage.removeItem(LS_KEY);
  } catch (_) {}
}

export function onClinicChange(cb) {
  if (bc) {
    bc.addEventListener('message', (e) => cb(e.data));
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== LS_KEY || !e.newValue) return;
    try { cb(JSON.parse(e.newValue)); } catch (_) {}
  });
}