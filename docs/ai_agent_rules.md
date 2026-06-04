# Codebase Construction Rules & Paradigms (For AI Agents & Systems)

You are an expert AI software architect specializing in building robust, performant, mobile-first web applications. When writing code, generating components, or establishing database strategies for this School Management System, you must rigidly adhere to the guidelines set below.

---

## 1. Technical Paradigm & Coding Standards

### Next.js 14/15 App Router Layout
*   Utilize Server Components (`RSC`) by default for all data fetching and layout assemblies to optimize initial page loading and security profiles.
*   Isolate client-side state hooks, user interactivity animations, and real-time state manipulation to dedicated components marked explicitly with `"use client"`.
*   Maintain clean semantic structural HTML layout layers. Never drop standard headings (`h1`, `h2`, `h3`), lists, or table semantic elements for unstyled `div` configurations.

### Tailwind CSS Styling & Strict Theming
*   **Design System Aesthetic:** Embody a clean, **luxury-minimalist design aesthetic**. Utilize a highly intentional, restricted color palette.
*   **Primary Accents:** Deep emerald tones (`text-emerald-900`, `bg-emerald-800`, borders in `emerald-200/50`) paired against premium clean backdrops (`bg-zinc-50`, text layers in `zinc-800`).
*   **Layout Safety:** Always enforce standard box containment boundaries. Include `box-sizing: border-box` equivalents across structural elements. Ensure elements gracefully adapt to screen changes without horizontal layout breaks.

### The Immutable UX Constraints
*   **The 3-Click Mandate:** No essential daily operational action (e.g., creating a mock test, inputting a score, updating a roll call, finding an outstanding payment invoice) should take more than three distinct click actions from the primary entry point.
*   **Keyboard Efficiency:** Any data grid built for batch grade inputs or administrative adjustments **must** handle default keyboard events natively. Tapping `Enter` or `Tab` within an entry field must save changes inline and shift focusing instantly to the following record row.

---

## 2. Database & Engineering Guardrails

### Flexible Fee Multipliers
*   Database schemas tracking student financials must isolate the raw `base_fee` from dynamic operational adjustments. Modifiers must be stored as an ordered array of objects reflecting the exact mutation type:
```typescript
    interface FeeModifier {
      id: string;
      label: string;
      type: 'percentage' | 'fixed_amount';
      value: number; // e.g., 20 for percentage, 5000 for currency adjustments
      application: 'charge' | 'discount';
    }
    ```
*   The application client code must execute live visual calculation previews, but final balance values stored in the data repository must be derived via secure, deterministic back-end functions to avoid manipulation threats.

### Scalable Bulk Transactions
*   Never run atomic, sequential single-item writes within user loops during bulk student imports or multi-record grade processing.
*   All high-volume transformations must run via batched write executions or transaction blocks to avoid partial data corruptions and race conditions.
