'use client';
import { useState } from 'react';

export default function PostJobPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/jobs', { method: 'POST', body: fd });
    const j = await res.json();
    setLoading(false);
    setMsg(j.ok ? 'Posted!' : ('Error: ' + j.error));
    if (j.ok) e.currentTarget.reset();
  }

  return (
    <form onSubmit={submit} className="card">
      <h1>Post a Job (test mode)</h1>
      <div className="label">Title</div>
      <input name="title" className="input" required />

      <div className="row" style={{marginTop:10}}>
        <input name="company" className="input" placeholder="Company" />
        <input name="location" className="input" placeholder="City / Town" />
      </div>

      <div className="row" style={{marginTop:10}}>
        <input name="district" className="input" placeholder="District" />
        <input name="state" className="input" defaultValue="Telangana" />
      </div>

      <div className="row" style={{marginTop:10}}>
        <input name="category" className="input" placeholder="IT / Govt / Banking" />
        <input name="job_type" className="input" defaultValue="Full-Time" />
      </div>

      <div className="label" style={{marginTop:10}}>Description</div>
      <textarea name="description" rows={6} className="input" />

      <div className="label" style={{marginTop:10}}>External Apply URL (optional)</div>
      <input name="external_url" className="input" placeholder="https://..." />

      <div style={{marginTop:12, display:'flex', gap:10}}>
        <button className="btn" disabled={loading} type="submit">{loading ? 'Posting…' : 'Post Job'}</button>
        {msg && <small>{msg}</small>}
      </div>
    </form>
  );
}
