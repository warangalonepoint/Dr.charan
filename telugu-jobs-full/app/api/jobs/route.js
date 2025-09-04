import { supabaseServer } from '@/lib/supabase';

export async function POST(req) {
  try {
    const form = await req.formData();
    const payload = {
      title: String(form.get('title')||''),
      company: String(form.get('company')||''),
      location: String(form.get('location')||''),
      district: String(form.get('district')||''),
      state: String(form.get('state')||'Telangana'),
      category: String(form.get('category')||''),
      job_type: String(form.get('job_type')||'Full-Time'),
      description: String(form.get('description')||''),
      external_url: String(form.get('external_url')||''),
      source: 'Manual',
      is_active: true
    };

    const supabase = supabaseServer();
    const { error } = await supabase.from('jobs').insert(payload);
    if (error) return Response.json({ ok:false, error: error.message }, { status: 400 });
    return Response.json({ ok:true });
  } catch (e) {
    return Response.json({ ok:false, error: e.message }, { status: 500 });
  }
}
