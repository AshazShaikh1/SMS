# UX Flow & Feature Documentation: School Management System (SMS)

This document outlines the detailed user experience, role-based workflows, step-by-step click sequences, and technical mechanics built for the School Management System (SMS).

---

## 1. UX Strategy & The 3-Click Mandate

Every interaction in this SMS is designed to reduce cognitive administrative load. 
*   **The 3-Click Mandate**: No daily task (taking attendance, uploading batch CSVs, creating tests, entering scores, adjusting fee modifiers, or printing scorecards) requires more than three distinct click actions from the user's primary dashboard entry point.
*   **Luxury-Minimalist Theming**: Interfaces use deep emerald accents (`emerald-950`/`emerald-800` text and background borders) set against clean whites and light zinc backdrops (`zinc-50`). No cluttered menus or clashing colors.
*   **Mobile-First Containment**: All user role interfaces (Administrator, Teacher, Student, and Parent) employ sticky bottom navigation bars on mobile viewports to ensure high-speed, thumb-friendly access, combined with custom body containers preventing horizontal layout breaks.

---

## 2. Role-Based Feature Breakdowns & Click Counts

Here is a detail of each persona, their available features, how they operate, and exact click sequences.

### A. The Administrator Workspace (`/admin`)
Designed for high-volume data manipulations, bulk registrations, and ledger overrides.

#### 1. Dashboard Overview (`/admin`)
*   **Function**: Summarizes school metrics: total enrolled student counts and accumulated outstanding dues balance (summed live across all records). Lists the student roster directory in a clean table with quick links to customize fee packages.
*   **Click Count**: **0 Clicks** (Immediate at-a-glance load).

#### 2. Add Students Panel (`/admin/intake`)
*   **Function**: Dual-mode intake selector:
    - **Type Student Details**: A clean visual form for typing a single student profile (First/Last name, Roll, Grade, Section) and adding them to the validation list.
    - **Upload Spreadsheet (CSV)**: Standard file uploader and text area copy-paste tool.
    In both cases, parses rows, displays a verification grid, and executes writes using Firestore transaction batches.
*   **Click Sequence (from Admin Dashboard - Single Entry Form)**:
    1.  Click **"Add Students"** in the sidebar. (*1st Click*)
    2.  Fill out the visual text form and click **"Add Student to Preview List"**. (*2nd Click*)
    3.  Click **"Save All Students to School Database"**. (*3rd Click*)
*   **Total Clicks**: **3 Clicks** (Strictly Compliant).

#### 3. Fees & Scholarships Adjustments (`/admin/finance`)
*   **Function**: Customize tuition variables for individual accounts. Simple forms to add scholarships (discounts) or extra charges (fees) by flat amount or percentage. Calculates unpaid dues and previews final balances in real-time.
*   **Click Sequence (from Admin Dashboard)**:
    1.  Click **"Adjust Ledger"** next to a student in the dashboard table. (*1st Click*)
    2.  Fill in the fee/scholarship form (Name, Category, Amount) and click **"+"** to add. (*2nd Click*)
    3.  Click **"Save Financial Changes"** to commit. (*3rd Click*)
*   **Total Clicks**: **3 Clicks** (Strictly Compliant).

---

### B. The Teacher Workspace (`/teacher`)
Designed to minimize operational drag between classes.

#### 1. Overview Dashboard (`/teacher`)
*   **Function**: Shows courses taught (Mathematics `MATH_101`) and assigned sections (Grade 10-A, 10-B) with student counts. Highlights shortcuts to take attendance or grade sheets.
*   **Click Count**: **0 Clicks**.

#### 2. 3-Tap Roll Call (`/teacher/attendance`)
*   **Function**: Mobile-first attendance sheet. Loads section rosters and defaults all students to `present` (green theme). Tapping a student's card cycles their roll status: `Present` → `Absent` (red) → `Late` (amber) → `Present`.
*   **Click Sequence (from Teacher Dashboard)**:
    1.  Click **"3-Tap Roll Call"** on the assigned class section card. (*1st Click*)
    2.  Tap cards for absent/late students. (*1-3 Taps*)
    3.  Click **"Save Attendance List"** to commit the database log. (*2nd Click of workflow*)
*   **Total Clicks**: **2 workflow clicks** (+ card taps) (Strictly Compliant).

#### 3. Spreadsheet-Style Inline Grading Matrix (`/teacher/grading`)
*   **Function**: A numerical spreadsheet grid showing student names and score fields. Intercepts keyboard events (`Enter`, `ArrowDown`, `ArrowUp`) to navigate cells vertically. Automatically saves changes to the database on cell blur (loss of focus).
*   **Click Sequence (from Teacher Dashboard)**:
    1.  Click **"Grading Matrix"** on the assigned class card. (*1st Click*)
    2.  Focus the first input cell. (*2nd Click*)
    3.  Type scores using keyboard navigation keys to move down. Saving is fully automated on blur. (*0 Clicks*)
*   **Total Clicks**: **2 Clicks** (Strictly Compliant).

#### 4. Instant Assessment Creation Column (`/teacher/grading`)
*   **Function**: 4-field creation widget (Title, Type, Max Marks, Weight %) to instantly append a grading column.
*   **Click Sequence (from Grading Matrix Page)**:
    1.  Click **"Create Assessment Column"** at the top. (*1st Click*)
    2.  Fill form inputs and click **"Confirm Column Setup"**. (*2nd Click*)
*   **Total Clicks**: **2 Clicks** (Strictly Compliant).

---

### C. The Student Workspace (`/student`)
Optimized for mobile viewports to provide immediate transparency.

#### 1. Mobile Dashboard Overview (`/student`)
*   **Function**: Consolidates essential metrics: outstanding balance due, modifiers breakdown, Term weighted grades (MATH_101, Grade A), detailed test log history, and attendance rate (100% Present).
*   **Click Count**: **0 Clicks** (At-a-glance layout).

---

### D. The Parent Workspace (`/parent`)
Designed for multi-child progress tracking and financial clarity.

#### 1. Dashboard Overview & Child Switcher (`/parent`)
*   **Function**: Displays tuition balance registers, modifier lists, and child report card scores. Contains tabs to switch children.
*   **Click Count**: **0 Clicks** to view; **1 Click** to switch child details.

#### 2. Pixel-Perfect Scorecard Compiler (`/parent`)
*   **Function**: Unified scorecard layout formatted using CSS print-media queries. Compiles weights, term averages, and tests onto a single page, launching the browser's print dialog to export a PDF document.
*   **Click Sequence (from Parent Dashboard)**:
    1.  Click **"Compile Term 1 Report (Save PDF)"**. (*1st Click*)
    2.  Confirm print/save in browser print preview. (*2nd Click*)
*   **Total Clicks**: **2 Clicks** (Strictly Compliant).

---

## 3. Engineering Mechanics

1.  **Offline Database Simulation Fallback (`src/lib/db/mockDb.ts`)**:
    Detects if Firebase parameters are loaded. If not, it switches to local simulation mode using `localStorage` for read and write queries. This allows immediate testing with no server setup.
2.  **Keyboard Grid Navigation Hook (`src/app/teacher/grading/page.tsx`)**:
    Listens for keypress triggers inside input elements:
    *   `Enter` or `ArrowDown`: Selects and highlights the text of the cell directly below.
    *   `ArrowUp`: Navigates to the cell directly above.
3.  **Firestore Write Batching (`src/lib/db/students.ts`)**:
    Ensures bulk transactions write atomically to Firestore using `writeBatch()`, preventing partial data imports.
4.  **Autosave Grading Grid**:
    Leverages React's `onBlur` event on input elements, saving modifications in the background immediately when focus shifts to another cell.
5.  **Native Print Styling**:
    Utilizes styled JSX media overrides to hide screen navigation assets and isolate only the scorecard frame when exporting report card PDFs.
