import { supabase, supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Fetch all default schedules for the organizer
export async function GET() {
  const { data, error } = await supabase
    .from('schedule_defaults')
    .select('*')
    .eq('organizer_id', 'speedrun-user')
    .order('day_of_week', { ascending: true })
    .order('start_minutes', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST: Create or update default schedules
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received POST request body:', body);
    
    // Expecting { schedules: [ { day_of_week, start_minutes, end_minutes }, ... ] }
    const { schedules } = body;

    if (!Array.isArray(schedules)) {
      console.error('schedules is not an array:', schedules);
      return NextResponse.json({ error: 'schedules must be an array' }, { status: 400 });
    }

    console.log('Processing schedules:', schedules);

    // Test Supabase connection first
    const { data: testData, error: testError } = await supabase
      .from('organizer_settings')
      .select('organizer_id')
      .eq('organizer_id', 'speedrun-user')
      .single();

    if (testError) {
      console.error('Supabase connection test failed:', testError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: testError.message 
      }, { status: 500 });
    }

    console.log('Supabase connection OK, organizer exists:', testData);

    // Delete all existing defaults for this organizer (using admin client to bypass RLS)
    const { error: deleteError } = await supabaseAdmin
      .from('schedule_defaults')
      .delete()
      .eq('organizer_id', 'speedrun-user');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ 
        error: `Delete failed: ${deleteError.message}`,
        details: deleteError 
      }, { status: 500 });
    }

    // Insert new schedules (using admin client to bypass RLS)
    if (schedules.length > 0) {
      const toInsert = schedules.map(s => ({
        organizer_id: 'speedrun-user',
        day_of_week: s.day_of_week,
        start_minutes: s.start_minutes,
        end_minutes: s.end_minutes
      }));

      console.log('Inserting schedules:', toInsert);

      const { data, error: insertError } = await supabaseAdmin
        .from('schedule_defaults')
        .insert(toInsert)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        return NextResponse.json({ 
          error: `Insert failed: ${insertError.message}`,
          details: insertError,
          code: insertError.code,
          hint: insertError.hint
        }, { status: 500 });
      }
      
      console.log('Successfully inserted:', data);
      return NextResponse.json(data);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error('POST /api/schedule/defaults error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const details = error instanceof Error ? error.stack : String(error);
    return NextResponse.json({ 
      error: message,
      details: details 
    }, { status: 500 });
  }
}

// DELETE: Delete a specific default schedule by ID
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('schedule_defaults')
    .delete()
    .eq('id', id)
    .eq('organizer_id', 'speedrun-user');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
