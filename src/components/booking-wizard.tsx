'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { format, addMinutes } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface BookingWizardProps {
  onSuccess?: () => void;
  rescheduleBooking?: { id: string; guest_name: string; guest_email: string } | null;
}

export function BookingWizard({ onSuccess, rescheduleBooking }: BookingWizardProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [slots, setSlots] = useState<string[]>([]);
  const [settings, setSettings] = useState<{ duration: number; buffer: number } | null>(null);
  const [loading, setLoading] = useState(false); 
  const [isBooking, setIsBooking] = useState(false); 
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  // Pre-fill if rescheduling
  const [name, setName] = useState(rescheduleBooking?.guest_name || '');
  const [email, setEmail] = useState(rescheduleBooking?.guest_email || '');

  const fetchSlots = useCallback(async (selectedDate: Date) => {
    setLoading(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/availability?date=${dateString}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSlots(data.slots || []);
      setSettings(data.settings); 
    } catch {
      toast.error("Failed to load slots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (date) fetchSlots(date);
  }, [date, fetchSlots]);

  const handleConfirm = async () => {
    if (!selectedSlot || !email || !settings) return;
    setIsBooking(true);

    const startTime = new Date(selectedSlot);
    const endTime = addMinutes(startTime, settings.duration);
    const bufferedStart = addMinutes(startTime, -settings.buffer);
    const bufferedEnd = addMinutes(endTime, settings.buffer);

    let error;

    if (rescheduleBooking) {
      // --- RESCHEDULE LOGIC (Swap) ---
      const { error: rpcError } = await supabase.rpc('reschedule_meeting', {
        p_organizer_id: 'speedrun-user',
        p_old_booking_id: rescheduleBooking.id,
        p_guest_name: name,
        p_guest_email: email,
        p_start_time: startTime.toISOString(),
        p_end_time: endTime.toISOString(),
        p_buf_start: bufferedStart.toISOString(),
        p_buf_end: bufferedEnd.toISOString()
      });
      error = rpcError;
    } else {
      // --- NEW BOOKING LOGIC ---
      const { error: insertError } = await supabase.from('bookings').insert({
        organizer_id: 'speedrun-user',
        guest_name: name,
        guest_email: email,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        buffered_start_time: bufferedStart.toISOString(),
        buffered_end_time: bufferedEnd.toISOString(),
        status: 'confirmed'
      });
      error = insertError;
    }

    setIsBooking(false);

    if (error) {
      toast.error(error.message || "Slot taken or invalid.");
      if (date) fetchSlots(date);
    } else {
      toast.success(rescheduleBooking ? "Meeting Rescheduled!" : "Meeting Confirmed!");
      if (onSuccess) onSuccess();
    }
  };

  // RENDER FORM (Only show if slot selected)
  if (selectedSlot) {
    return (
      <div className="space-y-4 animate-in slide-in-from-right">
        <div className="bg-slate-50 p-4 rounded-md mb-4 border">
          <p className="text-sm text-slate-500">{rescheduleBooking ? 'New Time' : 'Selected Time'}</p>
          <p className="font-semibold text-lg">{format(new Date(selectedSlot), 'PPP p')}</p>
          <Button variant="link" className="p-0 h-auto text-sm" onClick={() => setSelectedSlot(null)}>← Change Time</Button>
        </div>
        <div className="grid gap-2">
          <Label>Full Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
        </div>
        <div className="grid gap-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
        </div>
        <Button className="w-full mt-4" disabled={isBooking} onClick={handleConfirm}>
          {isBooking ? <><Spinner className="mr-2 text-white" /> Processing...</> : (rescheduleBooking ? "Confirm Reschedule" : "Confirm Booking")}
        </Button>
      </div>
    );
  }

  // RENDER CALENDAR
  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border shadow-sm"
          disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
        />
      </div>
      <div>
        <h4 className="font-medium mb-3 text-sm text-slate-500 uppercase tracking-wide">Available Slots</h4>
        <div className="grid grid-cols-3 gap-2 max-h-[30vh] overflow-y-auto">
          {loading ? (
             <div className="col-span-3 flex justify-center py-6"><Spinner className="size-6 text-slate-400" /></div>
          ) : slots.length > 0 ? (
            slots.map((slot) => (
              <Button key={slot} variant="outline" size="sm" onClick={() => setSelectedSlot(slot)}>
                {format(new Date(slot), 'HH:mm')}
              </Button>
            ))
          ) : (
            <p className="col-span-3 text-center text-sm text-slate-400">No slots.</p>
          )}
        </div>
      </div>
    </div>
  );
}