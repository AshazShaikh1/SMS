# 🏛️ Multi-Tenant School Ecosystem: End-to-End Lifecycle & Security Manifest

This document serves as the master blueprint for the application's global flow, security boundaries, multi-tenant isolation, and automated edge-case handling across a 1-year operational cycle.

---

## 🔒 1. Zero-Trust Security & Authentication Hierarchy

### 🚪 The Universal Login Gate
- **Strict Middleware Enforcement:** Every single route outside of `/login` and the initial `/register` onboarding wizard is completely locked behind Next.js edge middleware. If no valid authenticated session JWT exists, the app instantly drops the client back to `/login`.
- **Email-Less Structured Sign-In:** Users input a unique text string ID: `[schoolslug]-[role]-[identifier]` (e.g., `lords-stu-76`). Behind the scenes, the authentication module silently appends an internal hidden suffix (`@internal-sms.local`) before passing the credentials to `supabase.auth.signInWithPassword()`.

### 🔑 Role Escalation Prohibitions & The Developer Backdoor
- **The Developer Profile:** The `developer` role is a hardcoded bypass level inside our application code. Only the two specific account UUIDs manually whitelisted in your environment variables can hold this role. It allows absolute, unrestricted cross-school dashboard read/write access.
- **Admin Access Authorization:** To prevent malicious role escalation, the registration wizard is the ONLY user-facing module capable of writing a profile with `role: 'admin'`, and it can only do so *once* per uniquely generated `school_id` transaction block.

---

## 🧭 2. The Complete 1-Year Operational Flow & Edge-Case Architecture

### 🏁 Step 1: Day 0 — Zero-Data Onboarding & Defensive Parsing
1. **Tenant Initiation:** A new administrator clicks **Register** on the login screen, launching the 4-step wizard.
2. **Dynamic Grade-Pack Fee Pricing (Step 1):** Captures distinct baseline tuition packages per grade level (e.g., Grade 10 = ₹50,000, Grade 6 = ₹30,000).
   - *Edge-Case Guard (110% Discount Prevention):* Numeric constraints prevent formatting errors. If an operator types an impossible configuration (e.g., a 110% discount or a negative extra charge), the UI validation instantly blocks the submission, highlights the cell in error red (`#EF4444`), and reverts the state to safe bounds.
3. **Mass Section Generation (Step 2):** A checkbox grid tracks grades vertically and sections ('A', 'B', 'C', 'D', 'E') horizontally. Tapping "Generate School Structure" loops and instantiates all 40 structural classroom records bound to the `school_id` in milliseconds.
4. **The Robust Data Terminal (Step 3 & 4):** The admin pastes raw spreadsheet blocks directly into a large text area container.
   - *Edge-Case Guard (Data Mismatch & Incomplete Rows):* If lines lack emails or roll numbers, the defensive parser automatically repairs the data: synthesizes placeholder emails (`student.name.[hash]@school.com`), auto-increments missing roll numbers alphabetically, and marks empty phone slots as `whatsapp_disabled: true` to prevent future webhook script crashes.
5. **The Gateway Handshake:** The wizard creates **only** the primary administrator profile account, saves the bulk roster arrays into a staging metadata cache table (`onboarding_staging`), displays their custom admin login credentials, and routes them to the login screen.

### 🚀 Step 2: Day 1 — Post-Login Materialization & Ledger Export
1. **The First Activation:** The new admin logs into the workspace. The system detects the un-materialized staging record, locks the display with a premium loading screen, and spins up a secondary `tempAuthClient` with session persistence disabled.
2. **Phone-First Sibling De-duplication:** The loop checks parent phone numbers first. If a number exists, it skips creating a duplicate profile and links the multiple sibling rows directly to that single, unique `parent_id`. If names are completely miles apart on matching numbers, it flags it as an administrative typo and flags it for review.
3. **The Master Ledger Export:** Once completed, the staging row is deleted, and a soft emerald banner appears. The admin downloads a clean, comprehensive CSV file mapping out every generated account's Name, Role, Class, Username, and Default PIN password for immediate physical distribution.

### 📅 Step 3: Months 1 to 11 — High-Speed Daily Run
- **Teachers Workflow:** Staff navigate grids using rapid keyboard inputs. Marks entries remain trapped behind an invisible wall (`status: 'draft'`) so families see nothing until the teacher clicks **`[Publish Results & Alert]`**. This triggers the background webhook, unlocking the results drawer on the student's device and firing a text alert to parents via WhatsApp.
- **Parents Navigation:** Parents use a horizontal scrolling selector rail at the top of their screen to dynamically toggle between their children in under a second. The whole dashboard updates its data queries without reloading the page.

### 🎓 Step 4: Month 12 — The Academic Year Transition Roll-Over
- **The Yearly Promotion Routine:** At the close of the academic cycle, the admin triggers the roll-over engine. The script processes students row-by-row, auto-promotes their grade level by 1, automatically references the Grade Pricing Matrix from Step 1 to reset their new base tuition balances, clear previous attendance metrics, and archives past historical marks into a deep analytical ledger.

---
