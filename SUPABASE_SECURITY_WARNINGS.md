# Supabase Security Warnings – How to Fix

This doc covers the two security warnings you received and how to resolve them.

---

## 1. Leaked Password Protection Disabled

**What it is:** Supabase Auth can check new passwords against [HaveIBeenPwned.org](https://haveibeenpwned.com/Passwords) and reject known leaked passwords.

**How to enable:**

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** → **Providers** (or open: `https://supabase.com/dashboard/project/_/auth/providers` and pick your project).
3. Select the **Email** provider.
4. In the password section, turn on **“Prevent the use of leaked passwords”** (or equivalent wording for leaked-password checks).
5. Optionally tighten **minimum length** (e.g. 8+) and **required character types** (digits, upper/lowercase, symbols).
6. Save.

**Note:** Leaked password protection is available on the **Pro Plan and above**. If you don’t see the option, check your plan and upgrade if needed.

**Docs:** [Password security – Leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

---

## 2. Postgres Version Has Security Patches Available

**What it is:** Your Postgres image (`supabase-postgres-17.4.1.064`) has newer versions with security fixes. You should upgrade when you can.

**How to upgrade (in-place, recommended):**

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Project Settings** → **Infrastructure**:  
   `https://supabase.com/dashboard/project/_/settings/infrastructure`
3. Find the **“Upgrade project”** (or similar) button and start the upgrade.
4. Plan for a short downtime window. Rough guide: pg_upgrade runs at ~100 MB/s, so downtime depends on your DB size.
5. If the upgrade fails, Supabase will bring the original database back online.

**Before upgrading:**

- Pick a low-traffic time.
- If you use **logical replication**, note that replication slots are not preserved; you’ll need to recreate them after the upgrade.
- If you have **custom Postgres roles**, their passwords may need to be migrated to `scram-sha-256` after upgrade (see [Upgrading](https://supabase.com/docs/guides/platform/upgrading) for details).

**Docs:** [Upgrading – In-place upgrades](https://supabase.com/docs/guides/platform/upgrading#in-place-upgrades)

---

## Summary

| Warning                         | Where to fix                         | Action                                      |
|---------------------------------|--------------------------------------|---------------------------------------------|
| Leaked password protection      | Auth → Providers → Email             | Enable leaked-password check (Pro+ only)   |
| Postgres security patches       | Settings → Infrastructure            | Run “Upgrade project” and allow downtime   |

After enabling leaked-password protection and upgrading Postgres, these two security warnings should clear in the Supabase dashboard.
