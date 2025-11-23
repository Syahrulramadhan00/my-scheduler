# 📅 Online Meeting Scheduler

> *Because double-booking meetings is so 2020.*

A **blazingly fast** meeting scheduler that actually understands timezones and won't let two people book the same slot—**ever**. Built with Next.js 14 and Supabase, this project tackles the hardest problems in scheduling: **race conditions** and **timezone chaos**.

Unlike most schedulers that pray their `if` statements work, we enforce booking integrity at the **database level** using PostgreSQL's exclusion constraints. No locks. No mutex. Just pure database magic. ✨

---

## 🎯 Why This Exists

Ever tried booking a meeting at the same time as someone else? Most apps:
1. Check if a slot is available ✅
2. Wait 200ms for user to type their email... ⏳
3. **Someone else books the same slot** 💥
4. Your booking succeeds anyway 🤦
5. Calendar disaster ensues 🔥

**This scheduler?** The database says "NO" before the chaos even starts.

---

## ✨ Features

- 🌍 **Timezone-Native** — Works in Jakarta, London, or Mars Standard Time
- ⚡ **Race-Condition Proof** — PostgreSQL exclusion constraints = zero double-bookings
- 🎨 **Beautiful UI** — Shadcn/UI components that actually look good
- 🔄 **Reschedule Support** — Change your mind without breaking the space-time continuum
- ⚙️ **Configurable Rules** — Buffers, working hours, minimum notice—all customizable
- � **Responsive** — Looks great on phones, tablets, and those weird foldable things

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (Because we're not living in the past)
- **Supabase Project** (Free tier works perfectly)

### Installation

**1. Clone & Install**
```bash
git clone <your-repo-url>
cd my-scheduler
npm install
```

**2. Configure Environment**

Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**3. Database Setup**

Open your Supabase SQL Editor and run:
- ✅ Enable `btree_gist` extension
- 📊 Create tables: `organizer_settings`, `bookings`, `blackouts`
- 🔐 Add RLS policies (MVP mode = public access)

*(Scripts available in the `sql/` folder)*

**4. Launch** 🚀
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start scheduling like a boss.

---

## 🏗️ Architecture

### The Stack

| Layer | Technology | Why? |
|-------|-----------|------|
| **Frontend** | Next.js 14 (App Router) | Modern React, zero config routing |
| **Styling** | Tailwind CSS + Shadcn UI | Beautiful components, no design debt |
| **Backend** | Next.js API Routes | Serverless, auto-scaling, same codebase |
| **Database** | PostgreSQL (Supabase) | Real database, not a toy |
| **State** | React Hooks + `fetch` | Simple, effective, no over-engineering |

### Key Components

```
┌─────────────────────────────────────┐
│  📋 BookingWizard                   │
│  Calendar + Slot Picker + Submission│
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  📅 ScheduleList                    │
│  Your upcoming meetings dashboard   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  ⚙️ SettingsForm                     │
│  Timezone, buffers, working hours   │
└─────────────────────────────────────┘
```

---

## 💾 The Secret Sauce: Concurrency Control

### 🚨 The Problem Everyone Ignores

**Scenario:** Two people try to book 2:00 PM at *exactly* the same time.

**Bad Implementation (99% of schedulers):**
```javascript
// ❌ DANGEROUS CODE
const slots = await db.query("SELECT * FROM bookings WHERE...");
if (slots.length === 0) {
  // 💥 RACE CONDITION WINDOW
  await db.insert({ time: "2:00 PM" });
}
```

In the 50ms between checking and inserting, another request can sneak in. **Result:** Two bookings, one slot. Calendar chaos.

### ✅ Our Solution: PostgreSQL Exclusion Constraints

We don't *check* for conflicts. We make them **impossible**.

```sql
create table bookings (
  id uuid primary key default gen_random_uuid(),
  organizer_id text,
  start_time timestamptz,
  end_time timestamptz,
  
  -- 🕐 Buffered time = meeting + buffer gaps
  buffered_start_time timestamptz, 
  buffered_end_time timestamptz,

  -- 🛑 THE MAGIC CONSTRAINT
  -- "NO two bookings for the same organizer can overlap"
  exclude using gist (
    organizer_id with =,
    tstzrange(buffered_start_time, buffered_end_time) with &&
  )
);
```

**What happens now?**
1. Request A tries to book 2:00 PM → ✅ Success
2. Request B tries to book 2:00 PM (0.0001s later) → ❌ Database says "NOPE"
3. No double-booking. Ever. Even under 10,000 concurrent requests.

This is how banks handle money. Now it's how we handle meetings. 💪

---

## 🧪 Testing the Scheduler

### 1. 📝 Basic Booking Flow

```
1. Open http://localhost:3000
2. Click "New Booking" (the big blue button)
3. Pick a date → See available slots
4. Select a time → Enter your details
5. Click "Confirm" → 🎉 Meeting scheduled!
```

### 2. 💥 **Concurrency Stress Test** (The Fun Part)

Want to see the exclusion constraint in action? Try to break it:

**Steps:**
1. Open the app in **two browser windows** (side by side is best)
2. In both windows, pick the **exact same date and time slot**
3. Fill in the email field in both
4. Click "Confirm" in Window A → ✅ **Success!**
5. *Immediately* click "Confirm" in Window B → ❌ **REJECTED**

**Expected Result:**
```
Window B: ⚠️ "Slot taken. Please pick another."
```

**Why it matters:** Even if both requests hit the server at the *exact same millisecond*, the database prevents the double-booking. This is the power of database-level constraints.

### 3. ⚙️ Timezone & Settings

```
1. Click the ⚙️ Settings icon
2. Change "Meeting Duration" to 60 minutes
3. Change "Buffer" to 30 minutes  
4. Change "Timezone" to something exotic (Asia/Singapore? UTC?)
5. Save & return to home
6. Check the calendar → Slots regenerated with new rules! 🎯
```

---

## 🤖 Built With AI Assistance

**AI Tool:** Gemini 3.0

### What AI Helped With:
- 🗃️ **SQL Generation** — Complex `tstzrange` exclusion constraint syntax (PostgreSQL is weird)
- 🎨 **UI Scaffolding** — Rapid prototyping of Shadcn components (saved hours of boilerplate)
- 🧪 **Edge Case Discovery** — Suggested timezone edge cases I hadn't considered

### What I Verified Manually:
- ✅ SQL constraints *actually* block overlapping bookings (tested in Supabase dashboard)
- ✅ Timezone calculations don't drift across DST boundaries
- ✅ UI handles loading/error states gracefully

**Philosophy:** AI accelerates, humans verify. Trust, but validate. 🧐

---

## ⚠️ Known Limitations & Roadmap

### Current Limitations

| Issue | Status | Impact |
|-------|--------|--------|
| 🔐 Authentication | Hardcoded `organizer_id` | Not multi-tenant ready |
| 📧 Email Notifications | Emails collected but not sent | No confirmation emails |
| 🔄 Recurring Meetings | Only single-instance bookings | Can't do "every Tuesday" |
| 🌙 Dark Mode | Not implemented | Sad night owls |

### 🚀 Next Steps

- [ ] **Auth Integration** — Supabase Auth + multi-tenant support
- [ ] **Email System** — Resend/Nodemailer for booking confirmations
- [ ] **Recurring Events** — RRule library for complex patterns
- [ ] **Calendar Export** — `.ics` file generation for syncing
- [ ] **Team Scheduling** — Multiple organizers, round-robin logic
- [ ] **Analytics Dashboard** — Track booking rates, busiest times
- [ ] **Payment Integration** — Stripe for paid consultations

---

## 🙌 Contributing

Found a bug? Have an idea? PRs welcome!

```bash
# Fork, clone, branch
git checkout -b feature/amazing-feature

# Make your changes, commit
git commit -m "Add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

---

## 📜 License

MIT — Go wild, build cool things.

---

## 🎉 Credits

Built with ☕ and mild frustration with existing schedulers.

**Stack:**
- [Next.js](https://nextjs.org/) — The React framework
- [Supabase](https://supabase.com/) — Postgres that doesn't hate you
- [Shadcn/UI](https://ui.shadcn.com/) — Components that ship with your code
- [Tailwind CSS](https://tailwindcss.com/) — Utility classes FTW

---

<div align="center">

**⭐ Star this repo if it saved you from calendar chaos! ⭐**

*Made with 💙 by developers who've been double-booked one too many times.*

</div>