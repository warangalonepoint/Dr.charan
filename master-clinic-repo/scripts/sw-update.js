// SW update pinger — optional if you register from settings.html.
// This will check for updates on load and prompt UI-less.

(async function swUpdatePing() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.update) {
      await reg.update();
    }
  } catch (e) {
    // silent
  }
})();