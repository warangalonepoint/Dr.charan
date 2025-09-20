<!-- scripts/cloud.js -->
<script>
/**
 * Cloud adapter for Supabase (UMD, no modules).
 * Exposes: window.sb (client) and window.cloud (helpers).
 * Reads keys from window.__SUPA = { url, key }.
 */
(function () {
  // --- Guard: require supabase UMD ---
  if (!window.supabase) {
    console.error('[cloud] supabase-js UMD not loaded. Include it before cloud.js');
    return;
  }

  // --- Read config (allow env injection on Vercel) ---
  var SUPA_URL = (window.__SUPA && window.__SUPA.https://mngkgitmcudogekzmimv.supabase.co) || '';
  var SUPA_KEY = (window.__SUPA && window.__SUPA.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZ2tnaXRtY3Vkb2dla3ptaW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNjc2NzcsImV4cCI6MjA3Mzk0MzY3N30.f0CAvjUyMM1qhuYTZwVw_9khQFIhglCmuE7GcYfuv1I) || '';
  if (!SUPA_URL || !SUPA_KEY) {
    console.warn('[cloud] Missing window.__SUPA {url,key}. Using empty client -> calls will fail.');
  }

  // --- Create client (no session persistence for now) ---
  var sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 5 } }
  });
  window.sb = sb;

  // --- Small helpers ---
  function _errCtx(op, table, extra) {
    return '[cloud] ' + op + ' on ' + table + (extra ? (' :: ' + extra) : '');
  }

  // Insert a single row, return { data, error }
  async function insert(table, row) {
    try {
      var { data, error } = await sb.from(table).insert(row).select().single();
      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.error(_errCtx('insert', table), e);
      return { data: null, error: e };
    }
  }

  // Upsert one or many rows; conflictCols like 'id' or 'date,token'
  async function upsert(table, rowOrRows, conflictCols) {
    try {
      var payload = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
      var opts = conflictCols ? { onConflict: conflictCols } : undefined;
      var { data, error } = await sb.from(table).upsert(payload, opts).select();
      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.error(_errCtx('upsert', table, conflictCols || ''), e);
      return { data: null, error: e };
    }
  }

  // Update rows by exact match object; returns { data, error, count }
  async function update(table, matchObj, patchObj) {
    try {
      var q = sb.from(table).update(patchObj);
      Object.entries(matchObj || {}).forEach(([k, v]) => { q = q.eq(k, v); });
      var { data, error, count } = await q.select();
      if (error) throw error;
      return { data, error: null, count };
    } catch (e) {
      console.error(_errCtx('update', table, JSON.stringify(matchObj)), e);
      return { data: null, error: e, count: 0 };
    }
  }

  // Delete rows by exact match object
  async function del(table, matchObj) {
    try {
      var q = sb.from(table).delete();
      Object.entries(matchObj || {}).forEach(([k, v]) => { q = q.eq(k, v); });
      var { data, error, count } = await q.select();
      if (error) throw error;
      return { data, error: null, count };
    } catch (e) {
      console.error(_errCtx('delete', table, JSON.stringify(matchObj)), e);
      return { data: null, error: e, count: 0 };
    }
  }

  // Select with equality filters; returns { data, error }
  async function selectWhere(table, filtersObj, columns) {
    try {
      var q = sb.from(table).select(columns || '*');
      Object.entries(filtersObj || {}).forEach(([k, v]) => { q = q.eq(k, v); });
      var { data, error } = await q;
      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.error(_errCtx('selectWhere', table, JSON.stringify(filtersObj)), e);
      return { data: null, error: e };
    }
  }

  // Select within inclusive range (>= from AND <= to) for a date/text/number column
  async function selectBetween(table, col, from, to, columns) {
    try {
      var { data, error } = await sb.from(table)
        .select(columns || '*')
        .gte(col, from)
        .lte(col, to);
      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.error(_errCtx('selectBetween', table, col + ' ' + from + '..' + to), e);
      return { data: null, error: e };
    }
  }

  // Call a stored function (RPC)
  async function rpc(fnName, params) {
    try {
      var { data, error } = await sb.rpc(fnName, params || {});
      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.error('[cloud] rpc ' + fnName, e);
      return { data: null, error: e };
    }
  }

  // Realtime listener for a table; returns channel
  function listen(table, handler) {
    try {
      var ch = sb.channel('rt:' + table)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, function (payload) {
          try { handler && handler(payload); } catch (e) { console.error('[cloud] listen handler', e); }
        })
        .subscribe();
      return ch;
    } catch (e) {
      console.error('[cloud] listen ' + table, e);
      return null;
    }
  }

  // Simple connectivity check
  async function health() {
    try {
      // cheap query against a guaranteed-light endpoint
      const t0 = performance.now();
      const { error } = await sb.from('appointments').select('date').limit(1);
      const ms = Math.round(performance.now() - t0);
      return { ok: !error, ms, error: error || null };
    } catch (e) {
      return { ok: false, ms: null, error: e };
    }
  }

  // Expose API
  window.cloud = {
    insert, upsert, update, del,
    selectWhere, selectBetween, rpc,
    listen, health
  };
})();
</script>
