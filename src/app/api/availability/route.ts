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

  // 2. GET AVAILABILITY SLOTS FOR THIS SPECIFIC DATE
  // This function will return either overrides (if any exist for this date) or defaults (recurring weekly)
  const { data: availabilitySlots, error: availError } = await supabase
    .rpc('get_availability_for_date', {
      p_organizer_id: organizerId,
      p_target_date: dateParam
    });

  if (availError) {
    return NextResponse.json({ error: availError.message }, { status: 500 });
  }

  // If no availability slots, return empty
  if (!availabilitySlots || availabilitySlots.length === 0) {
    return NextResponse.json({ slots: [], settings: { duration: settings.meeting_duration, buffer: settings.buffer_minutes } });
  }

  // 3. PROCESS EACH AVAILABILITY SLOT
  const organizerTz = settings.timezone;
  const dayStartZoned = fromZonedTime(`${dateParam} 00:00:00`, organizerTz);
  const allSlots: string[] = [];

  // Loop through each availability window for this date
  for (const availWindow of availabilitySlots) {
    const workStartUtc = addMinutes(dayStartZoned, availWindow.start_minutes);
    const workEndUtc = addMinutes(dayStartZoned, availWindow.end_minutes);

    // 4. FETCH DATA (Bookings) for this specific window
    const { data: bookings } = await supabase
      .from('bookings')
      .select('buffered_start_time, buffered_end_time')
      .eq('organizer_id', organizerId)
      .eq('status', 'confirmed')
      .lt('buffered_start_time', workEndUtc.toISOString())
      .gt('buffered_end_time', workStartUtc.toISOString());

    // 5. GENERATE SLOTS for this window
    let currentSlot = workStartUtc;
    const now = new Date();

    while (isBefore(addMinutes(currentSlot, settings.meeting_duration), workEndUtc)) {
      const slotEnd = addMinutes(currentSlot, settings.meeting_duration);
      
      // VALIDATION 1: Minimum Notice
      if (isBefore(currentSlot, addMinutes(now, settings.min_notice_minutes))) {
        currentSlot = addMinutes(currentSlot, settings.meeting_duration);
        continue;
      }

      // VALIDATION 2: Buffer Calculation
      const bufferStart = addMinutes(currentSlot, -settings.buffer_minutes);
      const bufferEnd = addMinutes(slotEnd, settings.buffer_minutes);

      const isBooked = bookings?.some((b) => {
        const bStart = parseISO(b.buffered_start_time);
        const bEnd = parseISO(b.buffered_end_time);
        return isBefore(bufferStart, bEnd) && isBefore(bStart, bufferEnd);
      });

      if (!isBooked) {
        allSlots.push(currentSlot.toISOString());
      }

      // Step forward
      currentSlot = addMinutes(currentSlot, settings.meeting_duration);
    }
  }

  // Return slots AND the rules
  return NextResponse.json({
    slots: allSlots,
    settings: {
      duration: settings.meeting_duration,
      buffer: settings.buffer_minutes
    }
  });
}