import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const organizerId = 'speedrun-user';

  // Fetch upcoming confirmed bookings
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('organizer_id', organizerId)
    .eq('status', 'confirmed')
    .gte('end_time', new Date().toISOString()) // Only future meetings
    .order('start_time', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(bookings);
}