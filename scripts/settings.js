<!-- scripts/settings.js -->
<script>
(function(){
  const html=document.documentElement;
  html.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');

  const E = (id)=>document.getElementById(id);

  // Notifications opt-in
  E('notifyChk')?.addEventListener('change', async (e)=>{
    if(!('Notification' in window)) { alert('Notifications not supported'); return; }
    if(e.target.checked){
      const p = await Notification.requestPermission();
      if(p!=='granted'){ e.target.checked=false; }
    }
  });

  // Register SW
  E('regSwBtn')?.addEventListener('click', async ()=>{
    if('serviceWorker' in navigator){
      await navigator.serviceWorker.register('./service-worker.js');
      alert('Service worker registered');
    }else{
      alert('Service worker not supported');
    }
  });

  // Seed / Clear test data (cloud-first)
  E('seedBtn')?.addEventListener('click', async ()=>{
    try{
      if(typeof window.seedTestData !== 'function'){ alert('test-seed.js not loaded'); return; }
      await window.seedTestData();
      alert('Seeded demo data ✔');
    }catch(e){ console.error(e); alert('Seed failed: '+e.message); }
  });

  E('clearBtn')?.addEventListener('click', async ()=>{
    try{
      if(!confirm('Remove demo data (DEMO-* records)?')) return;
      if(typeof window.clearTestData !== 'function'){ alert('test-seed.js not loaded'); return; }
      await window.clearTestData();
      alert('Cleared demo data ✔');
    }catch(e){ console.error(e); alert('Clear failed: '+e.message); }
  });

  // Pharmacy seeds (if present)
  E('seedPharmBtn')?.addEventListener('click', async ()=>{
    if(typeof window.seedPharmacyData !== 'function'){ alert('pharmacy-seed.js not loaded'); return; }
    await window.seedPharmacyData(); alert('Pharmacy data seeded ✔');
  });
  E('clearPharmBtn')?.addEventListener('click', async ()=>{
    if(typeof window.clearPharmacyData !== 'function'){ alert('pharmacy-seed.js not loaded'); return; }
    await window.clearPharmacyData(); alert('Pharmacy data cleared ✔');
  });

})();
</script>
