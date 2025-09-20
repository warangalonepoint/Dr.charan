// scripts/notifications.js
// Dr. Charan Child Clinic PWA — Notifications helper

// Request permission & save state
export async function initNotifications() {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported in this browser");
    return false;
  }
  const perm = Notification.permission;
  if (perm === "granted") return true;
  if (perm !== "denied") {
    const ask = await Notification.requestPermission();
    return ask === "granted";
  }
  return false;
}

// Fire a notification locally (doctor only)
export async function notifyDoctor({ title, body, tag }) {
  try {
    const ok = await initNotifications();
    if (!ok) return;

    // If SW is registered, delegate to SW so it shows even when app is in background
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: "./public/assets/icon-192.png",
          badge: "./public/assets/icon-192.png",
          tag: tag || "clinic-alert",
          vibrate: [100, 50, 100],
          data: { url: "./dashboard.html" }
        });
      });
    } else {
      // Fallback: page-level notification
      new Notification(title, {
        body,
        icon: "./public/assets/icon-192.png",
        tag: tag || "clinic-alert"
      });
    }
  } catch (e) {
    console.error("notifyDoctor failed", e);
  }
}

// Bind test buttons (optional)
export function wireNotificationTests() {
  const btn = document.getElementById("testNotifBtn");
  if (btn) {
    btn.onclick = () => {
      notifyDoctor({
        title: "Test Notification",
        body: "This is a local test message.",
        tag: "test"
      });
    };
  }
}

// Example triggers (to be called in pages like bookings.html or lab-orders.html)
// notifyDoctor({ title: "New booking", body: "P001 • 10:30 AM • Token #5", tag: "booking" });
// notifyDoctor({ title: "New lab order", body: "P003 • ₹450", tag: "lab" });
// notifyDoctor({ title: "Low stock", body: "Paracetamol (qty < 10)", tag: "stock" });