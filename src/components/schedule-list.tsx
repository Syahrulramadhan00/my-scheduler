'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';
import { CalendarDays, Clock, User, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Booking = {
  id: string;
  guest_name: string;
  guest_email: string;
  start_time: string;
  end_time: string;
};

interface ScheduleListProps {
  refreshTrigger: number;
  onReschedule: (booking: Booking) => void;
}

export function ScheduleList({ refreshTrigger, onReschedule }: ScheduleListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to track which booking is being cancelled
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setLoading(true);
    const res = await fetch('/api/schedule');
    const data = await res.json();
    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedule();
  }, [refreshTrigger]); 

  // The actual cancellation logic
  const executeCancel = async () => {
    if (!bookingToCancel) return;
    
    // Close dialog immediately
    const id = bookingToCancel;
    setBookingToCancel(null);

    const toastId = toast.loading("Cancelling meeting...");
    
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        body: JSON.stringify({ bookingId: id })
      });
      if (!res.ok) throw new Error('Failed');
      
      toast.success("Meeting cancelled successfully", { id: toastId });
      fetchSchedule(); 
    } catch {
      toast.error("Failed to cancel meeting", { id: toastId });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner className="size-8 text-blue-600" /></div>;

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
        <CalendarDays className="h-10 w-10 mx-auto text-slate-300 mb-3" />
        <h3 className="text-lg font-medium text-slate-900">No Upcoming Meetings</h3>
        <p className="text-slate-500">You are completely free.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 animate-in fade-in-50">
        {bookings.map((booking) => (
          <Card key={booking.id} className="overflow-hidden hover:shadow-md transition-shadow group">
            <CardContent className="p-0 flex flex-col md:flex-row">
              <div className=" text-slate-900 p-4 flex flex-col items-center justify-center min-w-[100px]">
                <span className="text-3xl font-bold">{format(parseISO(booking.start_time), 'd')}</span>
                <span className="text-sm uppercase tracking-wider">{format(parseISO(booking.start_time), 'MMM')}</span>
              </div>
              
              <div className="p-4 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-lg">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {format(parseISO(booking.start_time), 'HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-4 h-4 text-slate-400" />
                    {booking.guest_name || 'Guest'} <span className="text-slate-400 text-sm">({booking.guest_email})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" onClick={() => onReschedule(booking)}>
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Reschedule
                  </Button>
                  {/* Triggers the Alert Dialog */}
                  <Button variant="destructive" size="sm" onClick={() => setBookingToCancel(booking.id)}>
                    <X className="w-3 h-3 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ALERT DIALOG COMPONENT */}
      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the booking from your schedule and free up the slot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Meeting</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeCancel}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Yes, Cancel Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}