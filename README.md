Online Meeting Scheduler

A high-performance meeting scheduler built with Next.js 14 and Supabase. This project focuses on solving the core challenges of timezone management and booking concurrency using database-level constraints rather than fragile application logic.

🚀 Setup & Run

Prerequisites

Node.js 18+

A Supabase project (Free tier works)

Installation

Clone the repository and install dependencies:

npm install


Create a .env.local file in the root:

NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key


Database Setup: Run the SQL scripts provided in the sql/ folder (or copy from below) in your Supabase SQL Editor to set up the tables and concurrency constraints.

Enable btree_gist extension.

Create tables: organizer_settings, bookings, blackouts.

Add RLS policies for public access (MVP mode).

Running Locally

npm run dev


Open http://localhost:3000.

🏗 Architecture

Frontend: Next.js 14 (App Router), Tailwind CSS, Shadcn UI (Radix Primitives).

Backend: Next.js API Routes (Serverless functions).

Database: PostgreSQL (via Supabase).

State Management: React Hooks + Server State (via fetch in Client Components).

Key Components:

BookingWizard: Handles the calendar interaction, time slot calculation, and booking submission.

ScheduleList: Real-time dashboard of upcoming confirmed meetings.

SettingsForm: Configure availability (Timezone, Buffers, Working Hours).

💾 Data Model & Concurrency

The Concurrency Problem

Preventing double-booking (Race Conditions) is the critical requirement. Checking for availability in code (SELECT * FROM bookings...) before inserting is unsafe under high load.

The Solution: Postgres Exclusion Constraints

Instead of application locks, we use PostgreSQL's native GiST index to strictly enforce non-overlapping time ranges at the database level.

Table Schema (bookings):

create table bookings (
  id uuid primary key default gen_random_uuid(),
  organizer_id text,
  start_time timestamptz,
  end_time timestamptz,
  
  -- The "Buffered" time is the actual block occupied in the calendar
  buffered_start_time timestamptz, 
  buffered_end_time timestamptz,

  -- 🛑 THE GUARDRAIL
  -- Rejects any insert where organizer_id matches AND time ranges overlap
  exclude using gist (
    organizer_id with =,
    tstzrange(buffered_start_time, buffered_end_time) with &&
  )
);


This ensures 100% data integrity. If two requests try to book the same slot simultaneously, the slower transaction fails immediately at the DB layer.

🧪 How to Test

1. Booking Flow

Go to the home page (/).

Click "New Booking" (Drawer opens).

Select a date. The API calculates slots based on "Jakarta" working hours (configurable in Settings).

Pick a slot, enter email, and Confirm.

The meeting appears in the list.

2. Testing Concurrency

Open the app in two different browser windows/tabs.

Navigate to the same date and select the exact same time slot in both windows.

Click "Confirm" in Window A. (Success)

Immediately click "Confirm" in Window B.

Result: Window B receives a toast error: "Slot taken. Please pick another."

3. Settings & Timezones

Go to Settings (Gear Icon).

Change "Meeting Duration" to 60 mins or "Buffer" to 30 mins.

Go back to booking; slots will regenerate reflecting these new rules.

🤖 AI Usage Notes

Tools Used: Gemini 3.0
Usage:

SQL Generation: Used to generate the complex syntax for tstzrange exclusion constraints in PostgreSQL, ensuring the syntax for the GiST index was correct.

UI Scaffolding: Accelerated the creation of Shadcn UI components (Forms, Cards, Drawers) to focus time on the backend logic.

Verification: Manually verified all SQL logic by attempting overlapping inserts in the Supabase dashboard to confirm constraints triggered correctly.

⚠️ Limitations & Next Steps

Authentication: Currently uses a hardcoded organizer_id. Next step: Integration Supabase Auth for multi-tenant support.

Email Notifications: Emails are collected but no actual email is sent. Next step: Integrate Resend or Nodemailer on the API route.

Recurring Meetings: The current schema supports single instances. Next step: Add rrule support for recurring patterns.