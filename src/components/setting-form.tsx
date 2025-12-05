'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Calendar } from '@/components/ui/calendar';
import { Trash2, Plus } from 'lucide-react';

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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type DefaultSchedule = {
  id?: string;
  day_of_week: number;
  start_minutes: number;
  end_minutes: number;
};

type OverrideSchedule = {
  id?: string;
  specific_date: string;
  start_minutes: number;
  end_minutes: number;
};

export function SettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State - Basic Settings
  const [timezone, setTimezone] = useState('UTC');
  const [duration, setDuration] = useState(30);
  const [buffer, setBuffer] = useState(10);
  const [notice, setNotice] = useState(60);
  
  // Default Schedules (Recurring Weekly)
  const [defaultSchedules, setDefaultSchedules] = useState<DefaultSchedule[]>([]);
  
  // Override Schedules (Specific Dates)
  const [overrides, setOverrides] = useState<OverrideSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [overrideStart, setOverrideStart] = useState('09:00');
  const [overrideEnd, setOverrideEnd] = useState('17:00');

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/schedule/defaults').then(res => res.json()),
      fetch('/api/schedule/overrides').then(res => res.json())
    ])
      .then(([settings, defaults, overridesData]) => {
        if (settings && !settings.error) {
          setTimezone(settings.timezone);
          setDuration(settings.meeting_duration);
          setBuffer(settings.buffer_minutes);
          setNotice(settings.min_notice_minutes);
        }
        if (defaults && !defaults.error) {
          setDefaultSchedules(defaults);
        }
        if (overridesData && !overridesData.error) {
          setOverrides(overridesData);
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveBasicSettings = async () => {
    setSaving(true);
    const payload = {
      timezone,
      meeting_duration: Number(duration),
      buffer_minutes: Number(buffer),
      min_notice_minutes: Number(notice)
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        console.error('Save failed:', result);
        throw new Error(result.error || 'Failed to save');
      }
      
      toast.success("Basic settings saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      console.error('Error saving settings:', error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaultSchedules = async () => {
    setSaving(true);
    
    // Validate: Check for overlapping slots on the same day
    const overlaps = defaultSchedules.some((s1, i) => 
      defaultSchedules.some((s2, j) => 
        i !== j && 
        s1.day_of_week === s2.day_of_week &&
        s1.start_minutes < s2.end_minutes &&
        s2.start_minutes < s1.end_minutes
      )
    );

    if (overlaps) {
      toast.error("Cannot save: You have overlapping time slots on the same day");
      setSaving(false);
      return;
    }

    // Validate: Check that start < end for all slots
    const invalidTimes = defaultSchedules.some(s => s.start_minutes >= s.end_minutes);
    if (invalidTimes) {
      toast.error("Cannot save: Start time must be before end time");
      setSaving(false);
      return;
    }

    try {
      console.log('Saving schedules:', defaultSchedules);
      
      const res = await fetch('/api/schedule/defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ schedules: defaultSchedules })
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        console.error('Save failed:', result);
        throw new Error(result.error || 'Failed to save');
      }
      
      console.log('Save successful:', result);
      toast.success("Default schedules saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save schedules';
      console.error('Error saving schedules:', error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const addDefaultSchedule = (dayOfWeek: number) => {
    setDefaultSchedules([
      ...defaultSchedules,
      { day_of_week: dayOfWeek, start_minutes: 540, end_minutes: 1020 }
    ]);
  };

  const updateDefaultSchedule = (index: number, field: 'start_minutes' | 'end_minutes', value: number) => {
    const updated = [...defaultSchedules];
    updated[index][field] = value;
    setDefaultSchedules(updated);
  };

  const removeDefaultSchedule = (index: number) => {
    setDefaultSchedules(defaultSchedules.filter((_, i) => i !== index));
  };

  const handleAddOverride = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    const dateStr = selectedDate.toISOString().split('T')[0];
    const startMin = stringToMin(overrideStart);
    const endMin = stringToMin(overrideEnd);

    if (startMin >= endMin) {
      toast.error("Start time must be before end time");
      return;
    }

    const payload = {
      specific_date: dateStr,
      start_minutes: startMin,
      end_minutes: endMin
    };

    try {
      const res = await fetch('/api/schedule/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        console.error('Add override failed:', result);
        throw new Error(result.error || 'Failed to add override');
      }
      
      setOverrides([...overrides, result]);
      toast.success("Override added");
      setSelectedDate(undefined);
      setOverrideStart('09:00');
      setOverrideEnd('17:00');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add override';
      console.error('Error adding override:', error);
      toast.error(message);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      const res = await fetch(`/api/schedule/overrides?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      setOverrides(overrides.filter(o => o.id !== id));
      toast.success("Override deleted");
    } catch {
      toast.error("Failed to delete override");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner className="size-8" /></div>;

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
          <CardDescription>Configure general meeting preferences.</CardDescription>
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

          <div className="flex justify-end">
            <Button onClick={handleSaveBasicSettings} disabled={saving}>
              {saving && <Spinner className="mr-2 text-white" />}
              Save Basic Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Default Weekly Schedule</CardTitle>
          <CardDescription>Set your regular working hours for each day of the week.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((dayName, dayIndex) => {
            const daySchedules = defaultSchedules.filter(s => s.day_of_week === dayIndex);
            return (
              <div key={dayIndex} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">{dayName}</Label>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => addDefaultSchedule(dayIndex)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Time Slot
                  </Button>
                </div>
                {daySchedules.length === 0 && (
                  <p className="text-sm text-slate-500">No availability set for this day</p>
                )}
                {daySchedules.map((schedule, idx) => {
                  const globalIndex = defaultSchedules.findIndex(
                    s => s.day_of_week === dayIndex && 
                    s.start_minutes === schedule.start_minutes && 
                    s.end_minutes === schedule.end_minutes
                  );
                  return (
                    <div key={idx} className="flex items-center gap-2 mt-2">
                      <Input 
                        type="time" 
                        value={minToString(schedule.start_minutes)}
                        onChange={e => updateDefaultSchedule(globalIndex, 'start_minutes', stringToMin(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-slate-500">to</span>
                      <Input 
                        type="time" 
                        value={minToString(schedule.end_minutes)}
                        onChange={e => updateDefaultSchedule(globalIndex, 'end_minutes', stringToMin(e.target.value))}
                        className="flex-1"
                      />
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => removeDefaultSchedule(globalIndex)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveDefaultSchedules} disabled={saving}>
              {saving && <Spinner className="mr-2 text-white" />}
              Save Default Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Specific Date Overrides */}
      <Card>
        <CardHeader>
          <CardTitle>Specific Date Overrides</CardTitle>
          <CardDescription>
            Override your default schedule for specific dates (holidays, special events, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4 bg-slate-50">
            <Label className="mb-2 block">Add New Override</Label>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="space-y-2 flex-1">
                <Label className="text-sm">Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label className="text-sm">Time Range</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm w-16">From:</Label>
                    <Input 
                      type="time" 
                      value={overrideStart}
                      onChange={e => setOverrideStart(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm w-16">To:</Label>
                    <Input 
                      type="time" 
                      value={overrideEnd}
                      onChange={e => setOverrideEnd(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleAddOverride} 
                    disabled={!selectedDate}
                    className="w-full mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Override
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Existing Overrides</Label>
            {overrides.length === 0 && (
              <p className="text-sm text-slate-500">No overrides set</p>
            )}
            {overrides.map(override => (
              <div key={override.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-semibold">{override.specific_date}</p>
                  <p className="text-sm text-slate-600">
                    {minToString(override.start_minutes)} - {minToString(override.end_minutes)}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => override.id && handleDeleteOverride(override.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}