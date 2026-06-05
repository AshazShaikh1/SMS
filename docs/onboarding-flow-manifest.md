# 🏛️ Multi-Tenant Zero-Data Onboarding & Credential Generation Flow

This document defines the definitive end-to-end operational lifecycle for registering, configuring, and provisioning a new school tenant on the platform. It is designed for maximum efficiency, high-density real-world data processing, and zero-friction logistical distribution.

---

## 🏗️ 1. Architectural Philosophy & Constraints

1. **Multi-Tenant Isolation:** The application operates on a single database instance using Supabase (PostgreSQL). Every school gets a unique `school_id` which stamps every single record. Cross-tenant security is strictly enforced at the database level via Row-Level Security (RLS) policies.
2. **Email-Less Authentication System:** To accommodate varying levels of household tech literacy, the system completely abandons mandatory email authentication for students, parents, and teachers.
   - Authentication relies entirely on an auto-generated, structured format string: `[schoolslug]-[role]-[identifier]` (e.g., `lords-stu-76`).
   - *Under the Hood:* To leverage native Supabase Auth functions without breaking its email requirement, the codebase silently appends an internal hidden domain suffix (e.g., `lords-stu-76@internal-sms.local`) before executing `signUp()` and `signInWithPassword()`.
3. **Deferred Processing Strategy:** To prevent browser timeouts and massive server spikes during the onboarding wizard, the processing of heavy roster arrays is strictly deferred. The onboarding wizard operates as a "Lightweight Schema Stager" that finishes by creating **ONLY the master Administrator account**. The actual materialization of thousands of student/teacher database rows occurs *after* the admin logs in for the first time.

---

## 📅 2. Step-by-Step System Flow Blueprint

### 🏁 Phase 1: The Initial Onboarding Wizard (Lightweight Setup)

When a new school initializes, the administrator hits `/admin/setup` and steps through a highly optimized, defensive 4-step wizard interface:
### Important - Here I just defined the setup wizard if there are any diffrences between this and the code written just tell me (add in the risk.md in /docs) the difference don't change anything

* **Step 1: School Profile & Grade-Pack Pricing Matrix**
  - Captures `school_name` and the current `academic_year`.
  - Displays a vertical grid listing Grade 1 through Grade 10. The admin inputs a distinct, custom base annual fee next to each grade (e.g., Grade 10 = 50,000, Grade 6 = 30,000).
  - *Data Guard:* Strictly enforces numerical cell validation.

* **Step 2: Mass Section Generation Matrix**
  - Displays a multi-select checkbox grid. Grades map vertically down the left column; section option chips (`A`, `B`, `C`, `D`, `E`) map horizontally across the top.
  - The admin can use a "Select All" toggle to bulk-check choices.
  - Clicking "Generate School Structure" runs an automated background loop that staging-prepares all checked combinations (e.g., 10 grades × 4 sections = 40 classrooms) to be committed under their `school_id`.

* **Step 3: Global Faculty Spreadsheet Ingestion Grid**
  - Renders an interactive spreadsheet-style inline matrix allowing the admin to quickly type or copy-paste columns for Teacher Name and Teacher Email.
  - The third column is a clean multi-select tag dropdown populated live by the classes generated in Step 2. This allows assigning a single teacher (e.g., Mr. Kumar) to multiple class sections (e.g., 10-A, 10-B, 10-C) in seconds.

* **Step 4: Robust Student Data Pasting Terminal & Initial Account Generation**
  - Displays a file drop zone alongside a large open text-area grid box so an admin can press `Ctrl+V` to paste messy, incomplete roster rows directly out of Excel or Google Sheets.
  - *The Complete Launch Trigger:* Clicking the final action button creates **ONLY the Master Administrator profile** (e.g., Username: `lords-admin-1`, Password: `[GeneratedSecurePIN]`).
  - *Performance Optimization:* Instead of building thousands of profiles right now, the wizard takes the raw parsed student arrays, teacher assignment sets, and fee parameters, and compresses them into a single temporary staging row inside a configuration metadata holding container bound to the new `school_id`.
  - *The Gateway Success Screen:* The wizard ends by clearing the screen and rendering a premium success card showing **exclusively the Admin's login credentials** along with a "Go to Login Portal" link.

---

### 🚀 Phase 2: Post-Login Activation & Master Ledger Export

1. **The First Sign-In:** The administrator opens the login portal, types their custom username string (`lords-admin-1`), inputs their secure PIN, and clicks login. The client-side handler appends the hidden tracking wrapper (`lords-admin-1@internal-sms.local`) behind the scenes and securely passes it to Supabase.
2. **The Generation Engine Trigger:** The moment the admin lands on the Main Admin Dashboard view (`/admin/page.tsx`), the page context detects that the school's roster data sits un-materialized in the staging container. It locks down a soft loading mask and fires the master processing loop:
   - Synthesizes custom structured usernames for every student, parent, and teacher row.
   - Executes defensive data-repair constraints: auto-calculates sequential roll numbers alphabetically if missing, maps the grade level base fees defined in Step 1, and flags accounts as `whatsapp_disabled: true` if mobile contact cells are blank.
   - Commits the finished, production-ready rows into the live Supabase `profiles` and `students` tables under the active `school_id`.
3. **The Master Ledger Handshake Banner:** Once the ingestion loops conclude, a premium alert card styled in our soft emerald brand wash (#ecfdf5) springs up at the top of the admin's workspace:
   > *"Onboarding Complete. Download your Credentials Ledger to distribute accounts to your Students, Parents, and Teachers."*
4. **Logistical Distribution:** Clicking **`[Download Accounts Roster (.CSV)]`** compiles and extracts an Excel-ready spreadsheet displaying columns for *Full Name, Account Role, Assigned Class/Section, Generated Username ID, and Default Password*. The school prints out these credentials or sends them as text slips to families during the new academic year's admission cycles.

### Note - If you notice any loophole or unoptimized or bugs in this plan just tell me don't do any changes by your self just create a file called risks.md (in /docs) and list donw all the things you find if there are any
