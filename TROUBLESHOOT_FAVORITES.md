# 🔍 Favorites Not Showing - Troubleshooting Guide

## Problem
The favorites page shows "You haven't added any courses to your favorites yet" even though you may have added favorites.

## 🎯 Step-by-Step Debugging

### STEP 1: Check Browser Console (MOST IMPORTANT!)

1. **Open your browser** and go to `localhost:8080/favorites`
2. **Press F12** to open Developer Tools
3. **Click the "Console" tab**
4. **Look for messages** that start with:
   - "Fetching favorites for user: ..."
   - "Supabase response - data: ..."
   - "Supabase response - error: ..."
   - "Normalized favorites data: ..."

#### What to Look For:

**✅ Good Response:**
```javascript
Fetching favorites for user: abc-123-def-456
Supabase response - data: [{certification_id: "...", certifications: [...]}]
Supabase response - error: null
Normalized favorites data: [{...}]
Number of favorites: 1
```

**❌ Bad Response (No Data):**
```javascript
Fetching favorites for user: abc-123-def-456
Supabase response - data: []
Supabase response - error: null
Normalized favorites data: []
Number of favorites: 0
```
→ **Means:** No favorites in database for this user

**❌ Bad Response (Error):**
```javascript
Fetching favorites for user: abc-123-def-456
Supabase response - error: {message: "Could not find relationship..."}
```
→ **Means:** Database fix hasn't been applied yet

---

### STEP 2: Run Database Diagnostic

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Copy all content** from `DIAGNOSE_FAVORITES.sql`
3. **Paste and Run**

This will tell you:
- ✅ If favorites table exists
- ✅ How many favorites are in the database
- ✅ If foreign keys are set up
- ✅ If there are any data issues

---

### STEP 3: Based on Console Output

#### Case A: Error says "Could not find a relationship"

**Problem:** Database fix not applied yet

**Solution:**
1. Run `COMPLETE_DATABASE_FIX.sql` in Supabase SQL Editor
2. Run `VERIFY_DATABASE_RELATIONSHIPS.sql` to confirm
3. Wait 2 minutes for cache refresh
4. Reload your app

---

#### Case B: Data is empty array `[]`

**Problem:** No favorites in database

**Possible Reasons:**
1. **You haven't added any favorites yet**
   - Go to Certifications page
   - Click the heart icon on a certification
   - Check console for "Adding favorite" messages

2. **Favorites were deleted when tables were recreated**
   - The fix script drops and recreates tables
   - Old data was lost
   - You need to add favorites again

3. **Error when adding favorites**
   - Try adding a favorite
   - Check browser console for errors
   - Check Supabase logs

**Solution:**
Go to `/certifications` page and try adding a favorite:
1. Click heart icon on any certification
2. Watch browser console
3. Should see success message
4. Refresh `/favorites` page

---

#### Case C: Data exists but shows wrong user

**Problem:** User ID mismatch

**Check:**
```javascript
// In browser console
console.log("Current user:", user);
```

**Solution:**
- Make sure you're logged in as the correct user
- Try logging out and back in

---

#### Case D: RLS Policy Error

**Error:** "permission denied" or "new row violates row-level security policy"

**Solution:**
```sql
-- Run in Supabase SQL Editor
-- Check RLS policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'user_favorites';

-- If empty, run COMPLETE_DATABASE_FIX.sql again
```

---

### STEP 4: Test Adding a Favorite

1. **Go to Certifications page** (`/certifications`)
2. **Open browser console** (F12)
3. **Click the heart icon** on any certification
4. **Watch for console messages:**

**Expected:**
```javascript
Adding favorite...
Successfully added favorite
```

**If Error:**
```javascript
Error adding favorite: [error message]
```

Copy the error message and:
- Check if it's a foreign key violation
- Check if it's an RLS policy issue
- Check if certification ID is valid

---

### STEP 5: Manual Database Check

If UI still doesn't work, check database directly:

```sql
-- In Supabase SQL Editor

-- 1. Check if you're logged in and get your user ID
SELECT auth.uid() AS my_user_id;

-- 2. Check if you have favorites (replace YOUR_USER_ID)
SELECT * FROM user_favorites 
WHERE user_id = 'YOUR_USER_ID';

-- 3. If empty, manually add a test favorite
INSERT INTO user_favorites (user_id, certification_id)
VALUES (
    auth.uid(),
    (SELECT id FROM certifications LIMIT 1)
);

-- 4. Verify it was added
SELECT 
    uf.*,
    c.title
FROM user_favorites uf
JOIN certifications c ON c.id = uf.certification_id
WHERE uf.user_id = auth.uid();
```

After manual insert, refresh `/favorites` page. If it shows up, the database is fine and the issue is in the add favorite function.

---

## 🔧 Common Fixes

### Fix 1: Database Not Fixed Yet
```bash
# Run these in Supabase SQL Editor in order:
1. COMPLETE_DATABASE_FIX.sql
2. VERIFY_DATABASE_RELATIONSHIPS.sql
3. Wait 2 minutes
4. Reload app
```

### Fix 2: Old Favorites Lost
```bash
# Unfortunately, if you ran COMPLETE_DATABASE_FIX.sql,
# old favorites were deleted (tables were dropped)
# Solution: Add favorites again from UI
```

### Fix 3: Foreign Key Still Not Working
```sql
-- Check if foreign key exists
SELECT constraint_name 
FROM information_schema.table_constraints
WHERE table_name = 'user_favorites'
    AND constraint_type = 'FOREIGN KEY';

-- Should show:
-- fk_user_favorites_user
-- fk_user_favorites_certification

-- If missing, run COMPLETE_DATABASE_FIX.sql again
```

### Fix 4: RLS Blocking Access
```sql
-- Temporarily disable RLS for testing
ALTER TABLE user_favorites DISABLE ROW LEVEL SECURITY;

-- Try accessing favorites in UI
-- If it works, RLS policies are wrong

-- Re-enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Run COMPLETE_DATABASE_FIX.sql to recreate policies
```

---

## 🧪 Quick Test

Try this in browser console on `/certifications` page:

```javascript
// Test adding favorite directly
const testAddFavorite = async () => {
    const user = // get user from your auth hook
    const { data, error } = await supabase
        .from('user_favorites')
        .insert({
            user_id: user.id,
            certification_id: 'test-cert-id' // replace with real cert ID
        });
    
    console.log('Test result:', { data, error });
};

testAddFavorite();
```

---

## 📋 Checklist

Before asking for help, verify:

- [ ] Ran `COMPLETE_DATABASE_FIX.sql`
- [ ] Ran `VERIFY_DATABASE_RELATIONSHIPS.sql` (showed "ALL CHECKS PASSED")
- [ ] Waited 2+ minutes after running SQL
- [ ] Cleared browser cache (Ctrl+Shift+Delete)
- [ ] Restarted dev server
- [ ] Checked browser console (F12) for errors
- [ ] Ran `DIAGNOSE_FAVORITES.sql` to check database
- [ ] Tried adding a favorite from UI
- [ ] Checked Supabase logs for errors

---

## 🎓 Understanding the Flow

```
User clicks heart → 
    addFavorite() called → 
        INSERT into user_favorites → 
            RLS checks user_id = auth.uid() → 
                Foreign key checks certification exists → 
                    Row inserted → 
                        Success!

On /favorites page → 
    fetchFavorites() called → 
        SELECT from user_favorites → 
            JOIN with certifications (via FK) → 
                RLS filters by user_id → 
                    Data returned → 
                        Displayed!
```

Any break in this chain = favorites don't show

---

## 🆘 Still Not Working?

### Collect This Info:

1. **Browser console output** (copy all messages)
2. **DIAGNOSE_FAVORITES.sql results** (copy all)
3. **VERIFY_DATABASE_RELATIONSHIPS.sql results**
4. **Screenshot of favorites page**
5. **Any error messages from Supabase logs**

### Then:

1. Check if COMPLETE_DATABASE_FIX.sql was actually run
2. Check if you're testing with the right user account
3. Try in incognito window (fresh session)
4. Check Supabase logs for detailed errors

---

**Created:** October 15, 2025  
**For:** Favorites Not Showing Issue  
**Next:** Run DIAGNOSE_FAVORITES.sql and check browser console
