# ⚠️ Technical Risks & Design Analysis: Zero-Data Onboarding

This document details the architectural conflicts, security risks, and configuration parameters discovered during the implementation design of the multi-tenant onboarding flow.

---

## 🔍 1. Database Schema Constraints (Staging Cache)

### 🔴 The Loophole
The database schema defined in `docs/DB-architecture-plan.md` lacks a place to persist the raw student rosters, teacher classes, and fee parameters under the new `school_id`.

-- ----------------------------------------------------------------------------
-- 🛠️ 6. Setup Wizard Differences & Discrepancies
-- ----------------------------------------------------------------------------

### 📝 Step 2: Mass Section Generation Matrix
- **Manifest Specification:** Horizontal section options are `A`, `B`, `C`, `D`, `E`.
- **Current Codebase:** Dynamic sections list (defaults to `A`, `B`, `C`, `D` with add/remove buttons to generate `E`, `F`, etc. on demand).
- **Resolution:** Keep the dynamic section column addition/deletion as it provides superior customization, but default the initial list to `A`, `B`, `C`, `D`, `E` to match the manifest.

### 📝 Step 3: Global Faculty Ingestion Grid
- **Manifest Specification:** Collects both `Teacher Name` and `Teacher Email`.
- **Current Codebase:** Collects `Teacher Name` and features an "Assign to Class" dropdown. Teacher emails are completely omitted from the user interface and auto-generated in the background.
- **Resolution:** To support the manifest's copy-paste teacher roster capability, we can restore the `Teacher Email` input field or keep the email-less UI and auto-generate the emails during Phase 2. We recommend keeping the email-less UI to avoid asking the admin to gather and enter teacher email addresses, matching the student credential system.

### 🟢 Proposed Solution
Create a new table `public.onboarding_staging` in the Supabase database.
```sql
CREATE TABLE public.onboarding_staging (
    school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
    staged_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.onboarding_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_staging_policy ON public.onboarding_staging
    FOR ALL USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
```
This keeps the database normalized and aligns with RLS boundaries.

---

## 🔒 2. Supabase Auth Session Hijacking

### 🔴 The Loophole
In Supabase-js, calling the standard `supabase.auth.signUp()` from the client automatically updates local storage, replaces the active browser session, and signs in the newly registered user.
When the Admin Dashboard attempts to bulk-create dozens of student, parent, and teacher Auth accounts in Phase 2, the administrator will be immediately logged out upon the first student's signup.

### 🟢 Proposed Solution
Instantiate a secondary, non-persisting Supabase client wrapper specifically for background provisioning:
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
```
Using `tempAuthClient.auth.signUp(...)` registers the user in Supabase Auth *without* corrupting the administrator's active session.

---

## 📨 3. Email Provider Confirmation Restriction

### 🔴 The Loophole
Supabase Auth GoTrue service enforces email confirmation by default. If we sign up users with the virtual internal suffix (`lords-stu-76@internal-sms.local`), they will receive no emails, remain in a "pending confirmation" state, and will be unable to sign in.

### 🟢 Action Required
The administrator or developer must disable **"Confirm Email"** inside the Supabase Project Dashboard under:
`Auth Settings -> Email Provider -> Confirm email (Toggle OFF)`

---

## 👥 4. Parent De-duplication

### 🔴 The Loophole
Multiple students in the pasted roster might share the same parent name/contact details. If we create a separate parent Auth account and profile for every single student row, we will generate redundant parent accounts and duplicate profile rows.

### 🟢 Proposed Solution
De-duplicate parents during Phase 2 row generation based on name/phone, mapping multiple students to the same `parent_id`.

---

## 🆔 5. Teacher Username Collision

### 🔴 The Loophole
If two teachers share the same last name/identifier (e.g., Mrs. Susan Kumar and Mr. Ramesh Kumar), generating `lords-teach-kumar` will trigger a database constraint violation on the unique username field.

### 🟢 Proposed Solution
Append an incremental index or a short unique slug (e.g., `lords-teach-rkumar` or `lords-teach-kumar-1`) if username checks identify a collision.
