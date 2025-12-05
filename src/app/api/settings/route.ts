import { supabase, supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Fetch Settings
export async function GET() {
  const { data, error } = await supabase
    .from('organizer_settings')
    .select('*')
    .eq('organizer_id', 'speedrun-user')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: Update Settings
export async function POST(req: Request) {
  const body = await req.json();
  
  // Basic validation could go here
  
  const { data, error } = await supabaseAdmin
    .from('organizer_settings')
    .upsert({
      organizer_id: 'speedrun-user',
      ...body,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}