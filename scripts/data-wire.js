<!-- /scripts/data-wire.js -->
<script type="module">
/**
 * Local-only data wire:
 * - No Supabase here.
 * - Cross-tab event bus (BroadcastChannel + storage fallback).
 * - Small helpers to wait for Dexie to be ready.
 */

const BC_NAME = 'clinic-bus-v1';

// ---------- Event bus (cross-tab) ----------
let bc = null;
try { bc = new BroadcastChannel(BC_NAME); } catch { bc = null; }

const listeners = new Set();

export function emitClinicChange(evt, payload = {}) {
  const msg = { evt, payload, ts: Date.now() };
  // notify this tab
  for (const fn of [...listeners]) {
    try { fn(msg); } catch {}
  }
  // broadcast to other tabs
  if (bc) {
    try { bc.postMessage(msg); } catch {}
  } else {
    // storage-event fallback
    try { localStorage.setItem('__clinic_bus__', JSON.stringify(msg)); } catch {}
    // clean quickly
    try { localStorage.removeItem('__clinic_bus__'); } catch {}
  }
}

export function onClinicChange(fn) {
  if (typeof fn === 'function') listeners.add(fn);
  return () => listeners.delete(fn); // unsubscribe
}

// BroadcastChannel listener
if (bc) {
  bc.onmessage = (e) => {
    const msg = e?.data;
    for (const fn of [...listeners]) {
      try { fn(msg); } catch {}
    }
  };
}

// storage event fallback
window.addEventListener('storage', (e) => {
  if (e.key !== '__clinic_bus__' || !e.newValue) return;
  let msg = null;
  try { msg = JSON.parse(e.newValue); } catch {}
  if (!msg) return;
  for (const fn of [...listeners]) {
    try { fn(msg); } catch {}
  }
});

// ---------- Dexie readiness ----------
/**
 * waitForDBReady()
 * Resolves when window.db exists and Dexie has opened.
 * Pages can `await waitForDBReady()` before running queries.
 */
export async function waitForDBReady(timeoutMs = 10000) {
  const start = Date.now();
  while (true) {
    if (window.db && typeof window.db.open === 'function') {
      try {
        // If already open this is cheap; if not, it opens.
        await window.db.open();
        return true;
      } catch (e) {
        // keep trying until timeout
      }
    }
    if (Date.now() - start > timeoutMs) return false;
    await new Promise(r => setTimeout(r, 120));
  }
}

// Convenience: small date helper used by some pages
export const todayISO = () => new Date().toISOString().slice(0, 10);

export default { emitClinicChange, onClinicChange, waitForDBReady, todayISO };
</script>
