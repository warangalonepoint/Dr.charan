'use client';
import Link from 'next/link';

export default function JobCard({ job }) {
  return (
    <Link href={`/jobs/${job.id}`} className="card">
      <h2>{job.title}</h2>
      <small>{job.company} • {(job.location || job.district) ?? ''}{job.state ? `, ${job.state}` : ''}</small>
      <div style={{marginTop:8, color:'var(--muted)'}}>
        {job.category} {job.job_type ? `• ${job.job_type}` : ''}
      </div>
    </Link>
  );
}
