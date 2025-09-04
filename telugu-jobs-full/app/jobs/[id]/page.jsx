import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function JobPage({ params }) {
  const supabase = supabaseServer();
  const { data: job, error } = await supabase.from('public_jobs').select('*').eq('id', params.id).single();
  if (error || !job) return <div className="card">Job not found.</div>;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "hiringOrganization": { "@type": "Organization", "name": job.company || "Employer" },
    "employmentType": job.job_type || "FULL_TIME",
    "jobLocation": {
      "@type": "Place",
      "address": { "@type": "PostalAddress", "addressLocality": job.location || job.district, "addressRegion": job.state, "addressCountry": "IN" }
    },
    "datePosted": job.created_at,
    "validThrough": job.expires_at || undefined,
    "description": job.description
  };

  return (
    <div className="card">
      <h1>{job.title}</h1>
      <div><small>{job.company} • {(job.location || job.district) ?? ''}{job.state ? `, ${job.state}` : ''}</small></div>
      <div style={{marginTop:10, whiteSpace:'pre-wrap'}}>{job.description}</div>
      <div style={{marginTop:16, display:'flex', gap:10}}>
        {job.external_url && <a className="btn" href={job.external_url} target="_blank">Apply on Source</a>}
        <a className="btn ghost" href="/">← Back</a>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
