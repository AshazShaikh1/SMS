# Technical Architecture & Stack Specification

## 1. Technology Core Selection

| Core Layer | Technology Selection | Architectural Strategy |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js (Latest App Router) | Enables React Server Components for ultra-fast, server-side data resolution combined with client-side interactivity for live calculations. |
| **Style Layer** | Tailwind CSS | Luxury-minimalist approach. Restricted color scales (Emerald/Zinc) optimized for mobile utility and readability. |
| **Database & Auth** | Firebase Suite (Firestore, Auth, Storage) | Low-latency document store ideal for quick client-side syncs, offline-first structural capabilities, and simple user role partitioning. |
| **Deployment & Hosting** | Vercel Platform | Edge-network asset optimization with instantaneous CI/CD integrations directly aligned with Next.js capabilities. |

---

## 2. Data Modeling & Document Blueprint Schema

### Collection: `students`
```json
{
  "_id": "STU_948201",
  "personal_details": {
    "first_name": "Rahul",
    "last_name": "Sharma",
    "roll_number": 76,
    "parent_id": "PAR_582910"
  },
  "academic_mapping": {
    "current_grade": "10",
    "section": "A",
    "assigned_subjects": ["MATH_101", "SCI_202", "ENG_303"]
  },
  "financial_ledger": {
    "base_fee_package_id": "PKG_GRADE_10",
    "custom_modifiers": [
      {
        "id": "MOD_01",
        "label": "Academic Merit Scholarship",
        "type": "percentage",
        "value": 25,
        "application": "discount"
      },
      {
        "id": "MOD_02",
        "label": "Advanced Lab Facilities Access Charge",
        "type": "fixed_amount",
        "value": 3500,
        "application": "charge"
      }
    ],
    "current_outstanding_balance": 48500
  }
}
tpz6tmfOAcZtNT9i
