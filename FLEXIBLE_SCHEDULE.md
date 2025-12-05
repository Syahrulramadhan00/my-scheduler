# Flexible Schedule Feature

## Overview
The organizer can now set flexible working hours with:
1. **Default Weekly Schedule** - Regular working hours for each day of the week
2. **Specific Date Overrides** - Special hours for specific dates that override the defaults

## How It Works

### Database Schema
The system uses three main tables:
- `organizer_settings` - Basic settings (timezone, duration, buffer, min notice)
- `schedule_defaults` - Recurring weekly schedule (e.g., "Mondays 9am-5pm")
- `schedule_overrides` - Specific date exceptions (e.g., "Dec 25, 2025: 1pm-5pm")

The `get_availability_for_date()` PostgreSQL function automatically decides:
- If overrides exist for a date → Use ONLY the overrides
- If no overrides → Use the default schedule for that day of week

### API Endpoints

#### Basic Settings
- `GET /api/settings` - Fetch basic settings
- `POST /api/settings` - Update basic settings

#### Default Schedules
- `GET /api/schedule/defaults` - Get all default schedules
- `POST /api/schedule/defaults` - Update default schedules (bulk replace)
- `DELETE /api/schedule/defaults?id=<uuid>` - Delete a specific default

#### Schedule Overrides
- `GET /api/schedule/overrides` - Get all overrides (optional ?date=YYYY-MM-DD filter)
- `POST /api/schedule/overrides` - Create or update an override
- `DELETE /api/schedule/overrides?id=<uuid>` - Delete an override

### UI Features

The Settings page (`/settings`) now has three sections:

1. **Basic Settings**
   - Timezone
   - Meeting duration
   - Buffer time
   - Minimum notice

2. **Default Weekly Schedule**
   - Set multiple time slots for each day
   - Can have multiple slots per day (e.g., 9am-12pm and 2pm-5pm)
   - Days without slots = no availability

3. **Specific Date Overrides**
   - Select a date from calendar
   - Set custom hours for that date
   - View and delete existing overrides

## Usage Example

### Setting Up Default Hours
1. Go to Settings
2. In "Default Weekly Schedule" section
3. Click "Add Time Slot" for each day you work
4. Set start and end times
5. Click "Save Default Schedule"

### Adding Special Hours for a Specific Date
1. In "Specific Date Overrides" section
2. Select a date from the calendar
3. Set the special hours (e.g., half day, extended hours)
4. Click "Add Override"

### How Availability Works
- Guest selects a date to book
- System checks if override exists for that date
  - **Yes** → Shows slots based on override hours
  - **No** → Shows slots based on default weekly schedule
- Existing bookings are always respected and excluded

## Migration Notes

The old system used:
- `work_day_start` and `work_day_end` columns in `organizer_settings`

The new system uses:
- `schedule_defaults` table (recurring weekly)
- `schedule_overrides` table (specific dates)

To migrate:
1. Remove the old columns from `organizer_settings` if desired
2. Create default schedules for your typical working days
3. Bookings and availability will now work with the new system

## Example Data

```sql
-- Monday-Friday 9am-5pm
INSERT INTO schedule_defaults (organizer_id, day_of_week, start_minutes, end_minutes) VALUES
('speedrun-user', 1, 540, 1020),  -- Monday
('speedrun-user', 2, 540, 1020),  -- Tuesday
('speedrun-user', 3, 540, 1020),  -- Wednesday
('speedrun-user', 4, 540, 1020),  -- Thursday
('speedrun-user', 5, 540, 1020);  -- Friday

-- Christmas: Half day (1pm-5pm)
INSERT INTO schedule_overrides (organizer_id, specific_date, start_minutes, end_minutes)
VALUES ('speedrun-user', '2025-12-25', 780, 1020);
```

## Benefits

✅ **Flexible** - Different hours for different days
✅ **Override-able** - Handle special cases easily
✅ **Multiple slots** - Can have breaks (morning/afternoon sessions)
✅ **Future-proof** - Easy to add holidays, vacations, special events
