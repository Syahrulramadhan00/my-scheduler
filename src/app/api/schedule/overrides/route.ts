import { supabase, supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Fetch schedule overrides (optionally filtered by date)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date'); // Optional: specific date filter

  let query = supabase
    .from('schedule_overrides')
    .select('*')
    .eq('organizer_id', 'speedrun-user')
    .order('specific_date', { ascending: true })
    .order('start_minutes', { ascending: true });

  if (date) {
    query = query.eq('specific_date', date);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST: Create or update a schedule override
export async function POST(req: Request) {
  const body = await req.json();
  
  const { id, specific_date, start_minutes, end_minutes } = body;

  if (!specific_date || start_minutes === undefined || end_minutes === undefined) {
    return NextResponse.json({ 
      error: 'specific_date, start_minutes, and end_minutes are required' 
    }, { status: 400 });
  }

  try {
    const payload = {
      organizer_id: 'speedrun-user',
      specific_date,
      start_minutes,
      end_minutes
    };

    if (id) {
      // Update existing override
      const { data, error } = await supabaseAdmin
        .from('schedule_overrides')
        .update(payload)
        .eq('id', id)
        .eq('organizer_id', 'speedrun-user')
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Insert new override
      const { data, error } = await supabaseAdmin
        .from('schedule_overrides')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Delete a specific override by ID
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('schedule_overrides')
    .delete()
    .eq('id', id)
    .eq('organizer_id', 'speedrun-user');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
