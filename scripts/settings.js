// /scripts/settings.js
// Plain script. No modules. Safe if db.js is module or non-module.
// Wires: Theme, Clear Cache, Logout, Notifications, SW register, optional seeding buttons.

(function () {
  // ---- Helpers ----
  const $ = (id) => document.getElementById(id);
  const html = document.documentElement;

  function setThemeFromStorage() {
    const t = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', t);
  }
  function toggleTheme() {
    const n = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', n);
    localStorage.setItem('theme', n);
    try { window.dispatchEvent(new CustomEvent('theme:changed', { detail: n })); } catch {}
  }

  async function clearCachesAndDB() {
    if (!confirm('Clear caches + IndexedDB?')) return;
    try {
      // Clear caches
      if ('caches' in window) {
        const names = await caches.keys();
        for (const n of names) await caches.delete(n);
      }
      // Clear Dexie DB if available
      if (window.db && typeof window.db.delete === 'function') {
        await window.db.delete();
      }
      // Preserve theme
      const keep = localStorage.getItem('theme');
      localStorage.clear();
      if (keep) localStorage.setItem('theme', keep);
      alert('Cleared caches & DB. Reloading…');
      location.reload();
    } catch (e) {
      console.error(e);
      alert('Failed to clear: ' + (e?.message || e));
    }
  }

  async function registerSW() {
    if (!('serviceWorker' in navigator)) {
      alert('Service Worker not supported in this browser.');
      return;
    }
    try {
      // Scope './' so the SW covers the whole app (keeps file names/paths unchanged)
      const reg = await navigator.serviceWorker.register('./public/service-worker.js', { scope: './' });
      alert('Service worker registered: ' + reg.scope);
    } catch (e) {
      console.error(e);
      alert('SW register failed: ' + (e?.message || e));
    }
  }

  async function initNotificationsToggle() {
    const chk = $('notifyChk');
    if (!chk) return;
    if (!('Notification' in window)) {
      chk.disabled = true;
      return;
    }
    chk.checked = Notification.permission === 'granted';
    chk.onchange = async () => {
      if (chk.checked) {
        try {
          const p = await Notification.requestPermission();
          chk.checked = (p === 'granted');
        } catch (e) {
          console.error(e);
          chk.checked = false;
        }
      }
    };
  }

  function wireSeedButtonsIfPresent() {
    // Core test data buttons (appear only if test-seed.js is present)
    const seedBtn = $('seedBtn');
    const clearBtn = $('clearBtn');
    if (seedBtn && typeof window.seedTestData === 'function') {
      seedBtn.onclick = async () => {
        seedBtn.disabled = true; seedBtn.textContent = 'Seeding…';
        try { await window.seedTestData(); alert('Seeded demo data.'); }
        catch (e) { console.error(e); alert('Seeding failed: ' + (e?.message || e)); }
        finally { seedBtn.disabled = false; seedBtn.textContent = 'Seed Test Data'; }
      };
    }
    if (clearBtn && typeof window.clearTestData === 'function') {
      clearBtn.onclick = async () => {
        clearBtn.disabled = true; clearBtn.textContent = 'Clearing…';
        try { await window.clearTestData(); alert('Cleared demo data.'); }
        catch (e) { console.error(e); alert('Clear failed: ' + (e?.message || e)); }
        finally { clearBtn.disabled = false; clearBtn.textContent = 'Clear Test Data'; }
      };
    }

    // Pharmacy-only seed buttons (appear only if pharmacy-seed.js is present)
    const seedPharmBtn = $('seedPharmBtn');
    const clearPharmBtn = $('clearPharmBtn');
    if (seedPharmBtn && typeof window.seedPharmacyData === 'function') {
      seedPharmBtn.onclick = async () => {
        seedPharmBtn.disabled = true; seedPharmBtn.textContent = 'Seeding…';
        try { await window.seedPharmacyData(); alert('Pharmacy data seeded.'); }
        catch (e) { console.error(e); alert('Pharmacy seeding failed: ' + (e?.message || e)); }
        finally { seedPharmBtn.disabled = false; seedPharmBtn.textContent = 'Seed Pharmacy Data'; }
      };
    }
    if (clearPharmBtn && typeof window.clearPharmacyData === 'function') {
      clearPharmBtn.onclick = async () => {
        clearPharmBtn.disabled = true; clearPharmBtn.textContent = 'Clearing…';
        try { await window.clearPharmacyData(); alert('Pharmacy data cleared.'); }
        catch (e) { console.error(e); alert('Pharmacy clear failed: ' + (e?.message || e)); }
        finally { clearPharmBtn.disabled = false; clearPharmBtn.textContent = 'Clear Pharmacy Data'; }
      };
    }

    // Auto-hide wrappers if functions not present (production-clean)
    const testWrap = $('testWrap');
    if (testWrap && typeof window.seedTestData !== 'function' && typeof window.clearTestData !== 'function') {
      testWrap.style.display = 'none';
    }
    const pharmWrap = $('pharmWrap');
    if (pharmWrap && typeof window.seedPharmacyData !== 'function' && typeof window.clearPharmacyData !== 'function') {
      pharmWrap.style.display = 'none';
    }
  }

  // ---- Wire Topbar buttons ----
  function wireTopbar() {
    const themeBtn = $('themeBtn');
    const clearCacheBtn = $('clearCacheBtn');
    const logoutBtn = $('logoutBtn');

    if (themeBtn) themeBtn.onclick = toggleTheme;
    if (clearCacheBtn) clearCacheBtn.onclick = clearCachesAndDB;
    if (logoutBtn) logoutBtn.onclick = () => {
      localStorage.removeItem('role');
      location.href = './login.html';
    };
  }

  // ---- Init on load ----
  window.addEventListener('DOMContentLoaded', () => {
    setThemeFromStorage();
    wireTopbar();
    initNotificationsToggle();
    $('regSwBtn') && ($('regSwBtn').onclick = registerSW);
    wireSeedButtonsIfPresent();
  });
})();
