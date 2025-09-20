// Misc helpers: money, dates, CSV export, print window.

export const money = (n) => '₹' + Number(n || 0).toFixed(2);

export function todayISO() {
  return new Date().toISOString().slice(0,10);
}

export function dateRange(daysBack = 14) {
  const arr = [];
  const t = new Date();
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

export function exportCSV(filename, headers, rows) {
  let csv = headers.join(',') + '\n';
  for (const r of rows) {
    const line = headers.map(h => {
      const v = r[h] == null ? '' : String(r[h]);
      // escape CSV
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }).join(',');
    csv += line + '\n';
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function printSimple(html) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
    <html><head><title>Print</title>
      <style>
        body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:20px;color:#111}
        table{width:100%;border-collapse:collapse}
        th,td{padding:6px;border-bottom:1px solid #ddd;text-align:left}
        h1,h2,h3{margin:0 0 8px}
      </style>
    </head><body>${html}</body></html>
  `);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}