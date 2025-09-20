// scripts/data-wire.js
// Lightweight cross-tab/app event bus with optional Supabase Realtime fan-out.
// Used by pages via:  import { emitClinicChange, onClinicChange, isCloud, setCloudMode } from './scripts/data-wire.js';

const BUS_NAME = 'clinic-bus';
const STORAGE_KEY = '__clinic_bus_ping__';

// --- Cloud mode flag ---------------------------------------------------------
/**
 * Cloud mode turns on optional Supabase realtime broadcasting.
 * - If you load scripts/cloud.js (which sets window.supabase), we'll use it.
 * - Toggle persistently via localStorage so all tabs follow the same mode.
 */
const CLOUD_FLAG_KEY = '__clinic_cloud_enabled__';
const initialCloud =
  typeof window !== 'undefined' &&
  (window.CLOUD_ENABLED === true ||
   localStorage.getItem(CLOUD_FLAG_KEY) === '1');

let CLOUD_ENABLED = !!initialCloud;

export function isCloud() { return CLOUD_ENABLED; }
export function setCloudMode(on) {
  CLOUD_ENABLED = !!on;
  try {
    localStorage.setItem(CLOUD_FLAG_KEY, CLOUD_ENABLED ? '1' : '0');
  } catch {}
  // Notify listeners that the mode flipped
  emitClinicChange('cloud:mode', { enabled: CLOUD_ENABLED });
}

// --- Local tab-to-tab transport ---------------------------------------------
let bc = null;
try { bc = new BroadcastChannel(BUS_NAME); } catch {}

const listeners = new Set();
function deliver(msg) {
  if (!msg || typeof msg !== 'object') return;
  for (const fn of listeners) {
    try { fn(msg); } catch (e) { /* no-op */ }
  }
}

// BroadcastChannel
if (bc) {
  bc.onmessage = (e) => deliver(e.data);
}

// storage-event fallback (works across tabs even without BroadcastChannel)
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY || !e.newValue) return;
  try { deliver(JSON.parse(e.newValue)); } catch {}
});

// --- Optional Supabase realtime transport -----------------------------------
/**
 * If cloud mode is on AND window.supabase exists, we also mirror events
 * through a realtime broadcast channel so other devices get the pulse.
 */
let supaChannel = null;
async function ensureSupaChannel() {
  if (!CLOUD_ENABLED) return null;
  if (!window.supabase) return null;
  if (supaChannel) return supaChannel;

  // Create a typed broadcast channel
  supaChannel = window.supabase.channel(BUS_NAME, {
    config: { broadcast: { ack: true } }
  });

  supaChannel.on('broadcast', { event: 'pulse' }, (payload) => {
    // Payload should already be our bus message
    deliver(payload?.payload || payload);
  });

  await supaChannel.subscribe().catch(() => {});
  return supaChannel;
}

// --- Public API --------------------------------------------------------------
/**
 * Send a message to all listeners in this tab, other tabs, and (optionally) other devices.
 * @param {string|object} evt - event name OR a full {evt, payload} object
 * @param {any} [payload]
 */
export async function emitClinicChange(evt, payload) {
  const msg = (typeof evt === 'object' && evt?.evt)
    ? evt
    : { evt, payload };
  msg.ts = Date.now();

  // 1) local listeners in this tab
  deliver(msg);

  // 2) other tabs via BroadcastChannel
  try { bc?.postMessage(msg); } catch {}

  // 3) other tabs via storage-event fallback
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msg)); } catch {}

  // 4) optional Supabase broadcast (other devices)
  try {
    const ch = await ensureSupaChannel();
    if (ch) await ch.send({ type: 'broadcast', event: 'pulse', payload: msg });
  } catch {}
}

/**
 * Listen for messages. Returns an unsubscribe function.
 * @param {(msg:{evt:string,payload:any,ts:number})=>void} handler
 */
export function onClinicChange(handler) {
  if (typeof handler !== 'function') return () => {};
  listeners.add(handler);
  return () => listeners.delete(handler);
}

// Expose a simple debug helper in dev tools if needed.
if (typeof window !== 'undefined') {
  window.__clinicBus__ = { emitClinicChange, onClinicChange, isCloud, setCloudMode };
}

// Fire an initial mode pulse so dashboards can reflect cloud/local instantly.
emitClinicChange('cloud:mode', { enabled: CLOUD_ENABLED });
