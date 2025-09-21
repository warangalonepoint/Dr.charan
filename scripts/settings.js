// settings.js
import db from './db.js';

// Theme toggle
const html = document.documentElement;
html.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');
document.getElementById('themeBtn').onclick = () => {
  const n = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', n);
  localStorage.setItem('theme', n);
};

// Logout
document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem('role');
  location.href = './login.html';
};

// Clear cache + db
document.getElementById('clearCacheBtn').onclick = async () => {
  if (!confirm('Clear caches + DB?')) return;
  if ('caches' in window) {
    const names = await caches.keys();
    for (const n of names) await caches.delete(n);
  }
  await db.delete();
  const keep = localStorage.getItem('theme');
  localStorage.clear();
  if (keep) localStorage.setItem('theme', keep);
  location.reload();
};

// Register service worker
document.getElementById('regSwBtn').onclick = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./service-worker.js');
      alert('Service Worker registered.');
    } catch (err) {
      console.error('SW register failed', err);
    }
  } else {
    alert('Service Workers not supported.');
  }
};

// --- Seeder buttons ---
window.addEventListener('DOMContentLoaded', () => {
  const seedBtn = document.getElementById('seedBtn');
  const clearBtn = document.getElementById('clearBtn');
  const seedPharmBtn = document.getElementById('seedPharmBtn');
  const clearPharmBtn = document.getElementById('clearPharmBtn');

  if (typeof window.seedTestData === 'function') {
    seedBtn.onclick = async () => {
      console.log('[Seed] Starting test data seed...');
      await window.seedTestData();
      alert('Test data seeded!');
    };
    clearBtn.onclick = async () => {
      console.log('[Seed] Clearing test data...');
      await window.clearTestData();
      alert('Test data cleared!');
    };
  } else {
    document.getElementById('testWrap').style.display = 'none';
  }

  if (typeof window.seedPharmacyData === 'function') {
    seedPharmBtn.onclick = async () => {
      console.log('[Seed] Starting pharmacy data seed...');
      await window.seedPharmacyData();
      alert('Pharmacy data seeded!');
    };
    clearPharmBtn.onclick = async () => {
      console.log('[Seed] Clearing pharmacy data...');
      await window.clearPharmacyData();
      alert('Pharmacy data cleared!');
    };
  } else {
    document.getElementById('pharmWrap').style.display = 'none';
  }
});
