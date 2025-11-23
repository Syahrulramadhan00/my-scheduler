import { supabase } from '@/lib/supabase';
import { addMinutes, isBefore, parseISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date'); // YYYY-MM-DD
  const organizerId = 'speedrun-user';

  if (!dateParam) return NextResponse.json({ error: 'Date required' }, { status: 400 });

  // 1. FETCH SETTINGS
  const { data: settings } = await supabase
    .from('organizer_settings')
    .select('*')
    .eq('organizer_id', organizerId)
    .single();

  if (!settings) return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });

  // 2. DEFINE RANGE (In Organizer's Timezone)
  // We construct the start/end of the working day in the Organizer's TZ, then convert to UTC
  const organizerTz = settings.timezone;
  
  // Create a date object at midnight of the requested date in the organizer's TZ
  // "2025-11-24" -> Midnight Jakarta Time
  const dayStartZoned = fromZonedTime(`${dateParam} 00:00:00`, organizerTz);
  
  // Calculate Start/End of work day based on minutes from midnight
  const workStartUtc = addMinutes(dayStartZoned, settings.work_day_start);
  const workEndUtc = addMinutes(dayStartZoned, settings.work_day_end);

  // 3. FETCH DATA (Bookings & Blackouts)
  // We fetch everything overlapping this specific day
  const { data: bookings } = await supabase
    .from('bookings')
    .select('buffered_start_time, buffered_end_time')
    .eq('organizer_id', organizerId)
    .eq('status', 'confirmed')
    .lt('buffered_start_time', workEndUtc.toISOString())
    .gt('buffered_end_time', workStartUtc.toISOString());

  const { data: blackouts } = await supabase
    .from('blackouts')
    .select('start_time, end_time')
    .eq('organizer_id', organizerId)
    .lt('start_time', workEndUtc.toISOString())
    .gt('end_time', workStartUtc.toISOString());

  // 4. GENERATE SLOTS
  const slots = [];
  let currentSlot = workStartUtc;
  const now = new Date();

  while (isBefore(addMinutes(currentSlot, settings.meeting_duration), workEndUtc)) {
    const slotEnd = addMinutes(currentSlot, settings.meeting_duration);
    
    // VALIDATION 1: Minimum Notice
    // If the slot is in the past or too soon
    if (isBefore(currentSlot, addMinutes(now, settings.min_notice_minutes))) {
      currentSlot = addMinutes(currentSlot, settings.meeting_duration);
      continue;
    }

    // VALIDATION 2: Buffer Calculation
    // We must check if the "Buffered Slot" overlaps with anything
    const bufferStart = addMinutes(currentSlot, -settings.buffer_minutes);
    const bufferEnd = addMinutes(slotEnd, settings.buffer_minutes);

    const isBooked = bookings?.some((b) => {
      const bStart = parseISO(b.buffered_start_time);
      const bEnd = parseISO(b.buffered_end_time);
      return isBefore(bufferStart, bEnd) && isBefore(bStart, bufferEnd);
    });

    const isBlackedOut = blackouts?.some((b) => {
      const bStart = parseISO(b.start_time);
      const bEnd = parseISO(b.end_time);
      return isBefore(currentSlot, bEnd) && isBefore(bStart, slotEnd);
    });

    if (!isBooked && !isBlackedOut) {
      slots.push(currentSlot.toISOString());
    }

    // Step forward
    currentSlot = addMinutes(currentSlot, settings.meeting_duration);
  }

  // Return slots AND the rules (so frontend knows duration/buffer for inserting)
  return NextResponse.json({
    slots,
    settings: {
      duration: settings.meeting_duration,
      buffer: settings.buffer_minutes
    }
  });
}