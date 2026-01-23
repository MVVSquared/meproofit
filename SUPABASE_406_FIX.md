# Supabase 406 Error Fix

## Problem
Supabase REST API was returning `406 (Not Acceptable)` errors when querying for records that don't exist.

## Root Cause
The `.single()` method in Supabase expects **exactly one row** to be returned. When zero rows are returned, Supabase throws a 406 error with the message "JSON object requested, multiple (or no) rows returned".

## Solution
Replaced `.single()` with `.maybeSingle()` for queries where zero or one row might be returned.

### What Changed

**Before ❌:**
```typescript
const { data, error } = await supabase
  .from('daily_sentences')
  .select('*')
  .eq('id', `${date}-${grade}`)
  .single(); // Throws 406 if no rows found
```

**After ✅:**
```typescript
const { data, error } = await supabase
  .from('daily_sentences')
  .select('*')
  .eq('id', `${date}-${grade}`)
  .maybeSingle(); // Returns null if no rows found, no error
```

## Methods Fixed

1. ✅ `getDailySentence()` - Now uses `.maybeSingle()` instead of `.single()`
2. ✅ `getUserProfile()` - Now uses `.maybeSingle()` instead of `.single()`
3. ✅ `updateUserStats()` - Now uses `.maybeSingle()` instead of `.single()`
4. ✅ `updateSentenceUsage()` - Now uses `.maybeSingle()` instead of `.single()`
5. ✅ `getUserStats()` - Now uses `.maybeSingle()` instead of `.single()`

## Behavior Difference

### `.single()`
- Expects exactly **one** row
- Throws 406 error if **zero** rows found
- Throws error if **multiple** rows found
- Use when you're certain a row exists

### `.maybeSingle()`
- Returns `null` if **zero** rows found (no error)
- Returns data if **one** row found
- Throws error if **multiple** rows found
- Use when a row might not exist

## Impact

- ✅ No more 406 errors when querying non-existent records
- ✅ Cleaner error handling
- ✅ Better user experience (no console errors for normal operations)
- ✅ Reduced API log pollution

## Testing

After deploying this fix:
1. Query for a daily sentence that doesn't exist → Should return `null` (no 406 error)
2. Query for a user profile that doesn't exist → Should return `null` (no 406 error)
3. Query for existing records → Should work as before

---

**Status**: ✅ Fixed  
**Files Changed**: `src/services/databaseService.ts`  
**Priority**: 🟡 Medium (Fixes user experience issue)
