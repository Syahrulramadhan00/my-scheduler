'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Plus, X, Settings } from 'lucide-react';
import { BookingWizard } from '@/components/booking-wizard';
import { ScheduleList } from '@/components/schedule-list';
import Link from 'next/link';

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Track which booking we are rescheduling (null = new booking)
  const [rescheduleData, setRescheduleData] = useState<{ id: string; guest_name: string; guest_email: string } | null>(null);

  const handleOpenNew = () => {
    setRescheduleData(null); // Reset to new mode
    setOpen(true);
  };

  const handleOpenReschedule = (booking: { id: string; guest_name: string; guest_email: string }) => {
    setRescheduleData(booking); // Set to reschedule mode
    setOpen(true);
  };

  const handleSuccess = () => {
    setOpen(false);
    setRefreshKey(prev => prev + 1); // Refresh list
    setRescheduleData(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Schedule</h1>
            <p className="text-slate-500">Upcoming meetings and events</p>
          </div>
          
          <div className="flex gap-2">
            <Link href="/settings">
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>

            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>
                <Button size="lg" className="shadow-lg" onClick={handleOpenNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Booking
                </Button>
              </DrawerTrigger>
              
              <DrawerContent>
                <div className="mx-auto w-full max-w-lg">
                  <DrawerHeader>
                    <div className="flex items-center justify-between">
                      <DrawerTitle>
                        {rescheduleData ? 'Reschedule Meeting' : 'Book a Meeting'}
                      </DrawerTitle>
                      <DrawerClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <X className="h-4 w-4" />
                        </Button>
                      </DrawerClose>
                    </div>
                    <DrawerDescription>
                      {rescheduleData 
                        ? `Select a new time for your meeting with ${rescheduleData.guest_name}.` 
                        : "Select a date and time to schedule your session."}
                    </DrawerDescription>
                  </DrawerHeader>
                  
                  <div className="p-4 pb-0">
                    <BookingWizard 
                      onSuccess={handleSuccess} 
                      rescheduleBooking={rescheduleData} 
                    />
                  </div>

                  <DrawerFooter className="pt-2">
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {/* LIST VIEW with Reschedule Callback */}
        <ScheduleList 
          refreshTrigger={refreshKey} 
          onReschedule={handleOpenReschedule}
        />
        
      </div>
    </div>
  );
}