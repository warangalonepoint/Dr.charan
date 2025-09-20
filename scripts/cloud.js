<!-- scripts/cloud.js (UMD, no modules) -->
<script>
(function(){
  // 1) Read keys (dev inline or Vercel ENV via small env.js you already added)
  var URL = (window.__SUPA && window.__SUPA.url) || "https://mngkgitmcudogekzmimv.supabase.co";
  var KEY = (window.__SUPA && window.__SUPA.key) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZ2tnaXRtY3Vkb2dla3ptaW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNjc2NzcsImV4cCI6MjA3Mzk0MzY3N30.f0CAvjUyMM1qhuYTZwVw_9khQFIhglCmuE7GcYfuv1I";

  if(!window.supabase){ console.error("cloud.js: supabase-js UMD not loaded"); return; }
  var sb = window.supabase.createClient(URL, KEY, { auth: { persistSession:false }, realtime:{}});

  // Light helpers so pages read cleanly
  async function insert(table, row){ return sb.from(table).insert(row).select().single(); }
  async function upsert(table, row, conflictCols){ return sb.from(table).upsert(row, { onConflict: conflictCols }); }
  async function update(table, match, patch){ return sb.from(table).update(patch).match(match); }
  async function del(table, match){ return sb.from(table).delete().match(match); }

  async function selectWhere(table, filters, columns="*"){
    let q = sb.from(table).select(columns);
    Object.entries(filters||{}).forEach(([k,v])=>{ q = q.eq(k,v); });
    return q;
  }
  async function selectBetween(table, col, from, to, columns="*"){
    return sb.from(table).select(columns).gte(col, from).lte(col, to);
  }

  function listen(table, handler){
    return sb.channel("rt:"+table)
      .on("postgres_changes", { event:"*", schema:"public", table }, (payload)=>{ try{ handler(payload); }catch(e){console.error(e);} })
      .subscribe();
  }

  window.sb = sb;
  window.cloud = { insert, upsert, update, del, selectWhere, selectBetween, listen };
})();
</script>
