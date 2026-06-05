# Multi-Tenant Zero-Data Onboarding Architecture Plan

This document outlines the step-by-step administrative onboarding flow for initializing a completely empty school tenant (`is_active: true`, with zero baseline relations) into our production Supabase instance.

---

## 🗺️ The 4-Step Defensive Ingestion Flow

### 📦 Step 1: School Profile & Grade-Pack Pricing Matrix
* **Objective:** Define identity anchors and dynamic fee baselines per grade level.
* **UI Layout:** * Inputs for `school_name` and standard `academic_year`.
    * A vertical grid tracking standard grade levels (e.g., Grade 1 through Grade 10). Next to each row is an explicit numerical cost cell input box.
* **Defensive Guardrails:** * Numeric constraints enforce `base_fee_amount >= 0`. Letter inputs are blocked completely.
* **Database Mapping:** Pushes an array of configurations to your application system configurations context, serving as a global lookup table when student files are ingested in Step 4.

### 🎛️ Step 2: Mass Section Generation Matrix
* **Objective:** Eliminate manual creation for high-density academic rooms (e.g., 10 grades × 4 sections = 40 classrooms).
* **UI Layout:** * A grid display mapping active grade strings vertically down the left column.
    * A horizontal line of select-all section checkbox chips (`A`, `B`, `C`, `D`, `E`) across the top.
    * A primary command button: `[Generate School Structure]`.
* **Automated Execution Logic:** Clicking the button loops through the checked elements, executing a bulk transaction block that inserts all 40 structural classroom containers into the `classes` table with our unified `school_id` in under half a second.

### 📝 Step 3: Global Faculty Spreadsheet Ingestion Grid
* **Objective:** Bulk-add teachers and map them across multiple classrooms simultaneously.
* **UI Layout:** * An editable, responsive inline row matrix. Columns track: `Staff Name`, `Staff Email`, and `Assigned Classrooms`.
    * The `Assigned Classrooms` input column is an automated multi-select tag chip dropdown populated live from the `classes` table rows generated in Step 2.
* **Database Mapping:** Creates records within the `profiles` custom table (`role: 'teacher'`) and binds their unique `profile_id` to the matching `instructor_id` columns inside the `classes` metadata records.

### 📥 Step 4: Robust Student Processing Terminal
* **Objective:** Parse messy Excel/CSV data with incomplete records without application crashes.
* **UI Layout:** * A dual-input system: A drag-and-drop file ingest zone alongside an open `Ctrl+V` Paste Roster Textarea container.
* **Defensive Parsing Logic (Auto-Repair Script):**
    * *Missing Roll Numbers:* The script queries the target class ID container row capacity and auto-increments values sequentially from `1` down based on an alphabetical sort of the student's name.
    * *Missing Parent/Student Emails:* The parser automatically synthesizes an isolated operational system placeholder sequence string (`student.name.[hash]@school.com`).
    * *Missing Mobile Contacts:* Logs the student profile data normally, sets a system marker flag `whatsapp_disabled: true`, and replaces the row with a fallback log string so backend webhook execution routines safely ignore the row without throwing system crashes.
    * *Fee Synthesis:* Reads the student's target grade level string, looks up the custom baseline price compiled in Step 1, and initializes their custom entry row inside the `students` table along with an attached baseline outstanding balance.