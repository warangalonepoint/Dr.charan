import { supabaseServer } from '@/lib/supabase';
import JobCard from '@/components/JobCard';
import SearchBar from '@/components/SearchBar';

export default async function Home({ searchParams }) {
  const s = searchParams || {};
  const supabase = supabaseServer();

  let query = supabase.from('public_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (s?.district) query = query.ilike('district', `%${s.district}%`);
  if (s?.category) query = query.ilike('category', `%${s.category}%`);
  if (s?.q) {
    query = query.or(`title.ilike.%${s.q}%,company.ilike.%${s.q}%,location.ilike.%${s.q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return <div className="card">Error: {error.message}</div>;
  }

  return (
    <>
      <div className="card" style={{marginBottom:12}}>
        <h1>Find Your Dream Job in AP & Telangana</h1>
        <small>Fresh listings. Local focus. Free to use.</small>
      </div>

      <SearchBar />

      <div className="grid">
        {data?.length ? data.map((j) => <JobCard key={j.id} job={j} />)
                       : <div className="card">No jobs found. Try another search.</div>}
      </div>
    </>
  );
}
