'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'next/navigation';

// Helper to convert minutes (540) to string ("09:00")
const minToString = (min: number) => {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

// Helper to convert string ("09:00") to minutes (540)
const stringToMin = (str: string) => {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
};

export function SettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [timezone, setTimezone] = useState('UTC');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [duration, setDuration] = useState(30);
  const [buffer, setBuffer] = useState(10);
  const [notice, setNotice] = useState(60);
  const navigate = useRouter();

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        if (data) {
          setTimezone(data.timezone);
          setStartTime(minToString(data.work_day_start));
          setEndTime(minToString(data.work_day_end));
          setDuration(data.meeting_duration);
          setBuffer(data.buffer_minutes);
          setNotice(data.min_notice_minutes);
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      timezone,
      work_day_start: stringToMin(startTime),
      work_day_end: stringToMin(endTime),
      meeting_duration: Number(duration),
      buffer_minutes: Number(buffer),
      min_notice_minutes: Number(notice)
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success("Settings saved successfully");
      navigate.push('/');
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner className="size-8" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Availability Rules</CardTitle>
          <CardDescription>Configure when you can be booked.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (Universal)</SelectItem>
                  <SelectItem value="Asia/Jakarta">Jakarta (WIB)</SelectItem>
                  <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                  <SelectItem value="America/New_York">New York (EST)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meeting Duration (Minutes)</Label>
              <Input 
                type="number" 
                min={0}
                value={duration} 
                onChange={e => setDuration(Math.max(0, Number(e.target.value)))} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Work Day Start</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Work Day End</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>Buffer (Minutes)</Label>
              <Input 
                type="number" 
                min={0}
                value={buffer} 
                onChange={e => setBuffer(Math.max(0, Number(e.target.value)))} 
              />
              <p className="text-[0.8rem] text-slate-500">Rest time between meetings.</p>
            </div>
            <div className="space-y-2">
              <Label>Minimum Notice (Minutes)</Label>
              <Input 
                type="number" 
                min={0}
                value={notice} 
                onChange={e => setNotice(Math.max(0, Number(e.target.value)))} 
              />
              <p className="text-[0.8rem] text-slate-500">Prevent last-minute bookings.</p>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving && <Spinner className="mr-2 text-white" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}