'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SearchBar() {
  const r = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [district, setDistrict] = useState(sp.get('district') || '');
  const [category, setCategory] = useState(sp.get('category') || '');

  useEffect(() => { setQ(sp.get('q') || '') }, [sp]);

  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (district) params.set('district', district);
    if (category) params.set('category', category);
    r.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="card" style={{marginBottom:12}}>
      <div className="label">Search</div>
      <input className="input" placeholder="Job title, company…" value={q} onChange={e=>setQ(e.target.value)} />
      <div className="row" style={{marginTop:10}}>
        <input className="input" placeholder="District (Warangal, Hyderabad, Vizag…)" value={district} onChange={e=>setDistrict(e.target.value)} />
        <input className="input" placeholder="Category (IT, Govt, Banking…)" value={category} onChange={e=>setCategory(e.target.value)} />
      </div>
      <div style={{marginTop:10}}>
        <button className="btn" type="submit">Search Jobs</button>
      </div>
    </form>
  );
}
