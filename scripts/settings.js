// scripts/settings.js
// Settings page controller (notifications, service worker, seed/clear)

// ---------- Theme + housekeeping ----------
const html = document.documentElement;
const saved = localStorage.getItem("theme") || "dark";
html.setAttribute("data-theme", saved);

document.getElementById("themeBtn")?.addEventListener("click", () => {
  const n = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", n);
  localStorage.setItem("theme", n);
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("role");
  location.href = "./login.html";
});

document.getElementById("clearCacheBtn")?.addEventListener("click", async () => {
  if (!confirm("Clear caches + DB?")) return;
  if ("caches" in window) {
    const ns = await caches.keys();
    for (const n of ns) await caches.delete(n);
  }
  if (window.db) {
    await db.delete();
  }
  const keep = localStorage.getItem("theme");
  localStorage.clear();
  if (keep) localStorage.setItem("theme", keep);
  location.reload();
});

// ---------- Notifications toggle ----------
const notifyChk = document.getElementById("notifyChk");
if (notifyChk) {
  notifyChk.checked = Notification.permission === "granted";
  notifyChk.addEventListener("change", async () => {
    if (notifyChk.checked) {
      let perm = await Notification.requestPermission();
      if (perm !== "granted") {
        alert("Notifications not allowed in browser.");
        notifyChk.checked = false;
      }
    }
  });
}

// ---------- Register Service Worker ----------
document.getElementById("regSwBtn")?.addEventListener("click", async () => {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
      alert("Service worker registered.");
    } catch (e) {
      console.error("SW register error", e);
      alert("SW registration failed");
    }
  } else {
    alert("No service worker support in this browser.");
  }
});

// ---------- Demo Test Seed ----------
document.getElementById("seedBtn")?.addEventListener("click", async () => {
  if (typeof window.seedTestData !== "function") {
    alert("seedTestData not available");
    return;
  }
  await window.seedTestData();
  alert("Demo test data seeded.");
});

document.getElementById("clearBtn")?.addEventListener("click", async () => {
  if (!confirm("Clear ALL test data?")) return;
  if (typeof window.clearTestData === "function") {
    await window.clearTestData();
    alert("Test data cleared.");
  } else {
    alert("clearTestData not available");
  }
});

// ---------- Pharmacy Seed ----------
document.getElementById("seedPharmBtn")?.addEventListener("click", async () => {
  if (typeof window.seedPharmacyData !== "function") {
    alert("Pharmacy seeder missing");
    return;
  }
  await window.seedPharmacyData();
  alert("Pharmacy data seeded.");
});

document.getElementById("clearPharmBtn")?.addEventListener("click", async () => {
  if (typeof window.clearPharmacyData !== "function") {
    alert("Pharmacy clear missing");
    return;
  }
  await window.clearPharmacyData();
  alert("Pharmacy data cleared.");
});
