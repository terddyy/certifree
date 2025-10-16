# Fixing "Certifications Completed" Stats Display Issue

## Problem

The "Certifications Completed" counter on the home page hero section is not working correctly. It always shows `0+` even when users have marked certifications as completed.

## Root Cause

The issue is with **Row Level Security (RLS)** policies on the `user_progress` table.

### Current Policy (Restrictive)
```sql
CREATE POLICY "Users can view their own progress" 
    ON public.user_progress FOR SELECT 
    USING (auth.uid() = user_id);
```

This policy only allows authenticated users to see **their own** progress records. However, the global stats query needs to **count all completed certifications across all users**, including when the page is viewed by:
- Anonymous/unauthenticated visitors
- Logged-in users viewing the public home page

### The Query That Fails
```typescript
const { count: totalCertificationsCompleted } = await supabase
  .from('user_progress')
  .select('id', { count: 'exact' })
  .eq('status', 'completed');
```

This query tries to count **all** rows where `status = 'completed'`, but the RLS policy blocks access to other users' records.

---

## Solution

We need to modify the RLS policy to allow **public read access for counting statistics** while still protecting individual user data privacy.

### Option 1: Allow Public SELECT (Recommended)

This is the simplest solution that makes the statistics work:

```sql
-- Fix: Allow anyone to SELECT for statistics
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;

CREATE POLICY "Public can view progress for statistics" 
    ON public.user_progress FOR SELECT 
    USING (true);
```

**Pros:**
✅ Simple and straightforward
✅ Statistics work immediately
✅ Aggregation queries (COUNT, SUM) work for everyone
✅ Individual records can still be fetched for personal dashboards

**Cons:**
⚠️ Anyone can technically query individual progress records
⚠️ Relies on application layer to filter appropriately

**Privacy Note:** The `user_progress` table contains:
- `user_id` (UUID - not personally identifiable)
- `certification_id` (public information)
- `status`, `progress_percentage`, `started_at`, `completed_at`

This data is not highly sensitive and only shows which certifications users are working on/completed.

### Option 2: Create a Database View (More Secure)

Create a public view that only exposes aggregated statistics:

```sql
-- Create a view for public statistics
CREATE OR REPLACE VIEW public.certification_completion_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
    COUNT(DISTINCT user_id) as total_active_users,
    COUNT(*) as total_progress_records
FROM public.user_progress;

-- Grant SELECT to anonymous users
GRANT SELECT ON public.certification_completion_stats TO anon;
GRANT SELECT ON public.certification_completion_stats TO authenticated;

-- Update the hook to use the view
const { data, error } = await supabase
  .from('certification_completion_stats')
  .select('total_completed')
  .single();
```

**Pros:**
✅ More secure - only exposes aggregated data
✅ No individual records accessible
✅ Can include other useful stats

**Cons:**
⚠️ Requires code changes in `useGlobalStats` hook
⚠️ More complex setup

### Option 3: Use a PostgreSQL Function (Most Secure)

Create a database function that returns only the count:

```sql
-- Create function to get completion count
CREATE OR REPLACE FUNCTION public.get_completion_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)
    FROM public.user_progress
    WHERE status = 'completed';
$$;

-- Grant execute to everyone
GRANT EXECUTE ON FUNCTION public.get_completion_count() TO anon;
GRANT EXECUTE ON FUNCTION public.get_completion_count() TO authenticated;

-- Update the hook to use the function
const { data, error } = await supabase.rpc('get_completion_count');
```

**Pros:**
✅ Most secure - only returns count
✅ No access to individual records
✅ Can add more complex logic if needed

**Cons:**
⚠️ Requires code changes
⚠️ Need to create function for each stat

---

## Recommended Implementation

**Use Option 1** (Allow Public SELECT) for now because:

1. **Quick Fix**: No code changes needed, just run the SQL
2. **Low Risk**: The data in `user_progress` is not highly sensitive
3. **Future-Proof**: Can always add Option 2 or 3 later if needed
4. **Consistent**: Users already see certifications list, so seeing progress isn't more sensitive

---

## How to Fix

### Step 1: Run the SQL Fix

Execute `FIX_USER_PROGRESS_RLS_FOR_STATS.sql` in your Supabase SQL editor:

```bash
# Or run from command line if you have psql access
psql -h your-db-host -U postgres -d your-database -f FIX_USER_PROGRESS_RLS_FOR_STATS.sql
```

### Step 2: Verify the Fix

Check the browser console when visiting the home page:
```
[useGlobalStats] Fetching stats...
[useGlobalStats] Total users: 5
[useGlobalStats] Total certifications: 50
[useGlobalStats] Completed certifications count: 12  ← Should show actual count
[useGlobalStats] Stats set: { totalUsers: 5, totalCertifications: 50, totalCertificationsCompleted: 12 }
```

### Step 3: Test the Display

1. Visit home page: `http://localhost:8080/`
2. Look at the stats section below the hero
3. "Certifications Completed" should show the correct number

---

## Testing Checklist

- [ ] Run `FIX_USER_PROGRESS_RLS_FOR_STATS.sql`
- [ ] Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'user_progress';`
- [ ] Clear browser cache / hard refresh
- [ ] Check browser console for logs
- [ ] Verify stats display correctly on home page
- [ ] Test while logged out (anonymous user)
- [ ] Test while logged in
- [ ] Mark a certification as completed
- [ ] Refresh home page - count should increment

---

## Alternative Workarounds (If you don't want to change RLS)

### Workaround 1: Use Service Role Key

Update `useGlobalStats` to use service role key for statistics queries only:

```typescript
// Create a separate Supabase client with service role
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Server-side only!
  { auth: { persistSession: false } }
);

// Use for stats
const { count } = await supabaseAdmin
  .from('user_progress')
  .select('id', { count: 'exact' })
  .eq('status', 'completed');
```

**⚠️ Warning**: Service role key should **NEVER** be exposed to the client. This must run on the server/backend only!

### Workaround 2: Add a Counter Table

Create a separate table that stores aggregated counts:

```sql
CREATE TABLE public.platform_stats (
    id integer PRIMARY KEY DEFAULT 1,
    total_users integer DEFAULT 0,
    total_certifications integer DEFAULT 0,
    total_completed integer DEFAULT 0,
    last_updated timestamp with time zone DEFAULT now(),
    CHECK (id = 1) -- Only allow one row
);

-- Enable RLS and allow public read
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stats are viewable by everyone" 
    ON public.platform_stats FOR SELECT 
    USING (true);

-- Update via trigger or cron job
CREATE OR REPLACE FUNCTION update_platform_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO public.platform_stats (id, total_users, total_certifications, total_completed, last_updated)
    VALUES (
        1,
        (SELECT COUNT(*) FROM public.profiles),
        (SELECT COUNT(*) FROM public.certifications),
        (SELECT COUNT(*) FROM public.user_progress WHERE status = 'completed'),
        now()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        total_users = EXCLUDED.total_users,
        total_certifications = EXCLUDED.total_certifications,
        total_completed = EXCLUDED.total_completed,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;
```

**Pros:**
✅ Very fast queries (no counting on the fly)
✅ Can cache stats
✅ No RLS issues

**Cons:**
⚠️ Stats slightly delayed
⚠️ Need cron job or triggers to update
⚠️ More complex setup

---

## Security Considerations

### What Data is Exposed?

With public SELECT on `user_progress`:
- ✅ User UUIDs (not personally identifiable)
- ✅ Certification IDs (already public)
- ✅ Status (in_progress, completed, etc.)
- ✅ Timestamps

### What is NOT Exposed?
- ❌ User emails
- ❌ User names
- ❌ User profiles
- ❌ Payment information
- ❌ Any PII (Personally Identifiable Information)

### Best Practice
The application should still filter data appropriately:
- User dashboard: Show only `WHERE user_id = auth.uid()`
- Public stats: Use COUNT/SUM aggregations
- Leaderboards: Join with profiles to show names (opt-in)

---

## Summary

**Problem**: RLS policy too restrictive for statistics queries  
**Solution**: Allow public SELECT on `user_progress` table  
**File**: `FIX_USER_PROGRESS_RLS_FOR_STATS.sql`  
**Impact**: Low risk, statistics will work immediately  
**Action**: Run the SQL file in Supabase SQL editor

Once fixed, the home page hero will correctly show the number of completed certifications! 🎉
