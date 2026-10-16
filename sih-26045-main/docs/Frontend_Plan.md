# IP-SAKTI Sahayak — Frontend Implementation Plan

This document outlines the scope, tech stack, and screen-by-screen breakdown for the Frontend team working on the **IP-SAKTI Sahayak** project. It is extracted directly from the finalized product specification to ensure alignment with the backend (FastAPI) and AI teams.

---

## 1. Tech Stack Recommendation

Since the backend is being built with **FastAPI**, the best choice for the frontend is **Next.js (React)** or **React + Vite**, paired with **Tailwind CSS**. 

**Recommended Stack for a 7-Day Hackathon:**
* **Framework:** **Next.js (App Router)** or **React + Vite**. Next.js is great for built-in routing and fast setup.
* **Styling:** **Tailwind CSS** for rapid styling without writing custom CSS files.
* **Component Library:** **shadcn/ui** or **Material UI (MUI)**. You will need complex components like Steppers (for explainability), Data Tables (for cases), and Forms. Using a pre-built component library will save days of work.
* **API Fetching:** **Axios** or **React Query (TanStack Query)** to smoothly connect with the FastAPI endpoints.

*Why this stack?* FastAPI serves clean REST APIs, which React consumes perfectly. Since you have dedicated frontend developers, you can build a highly interactive, responsive, and impressive UI that Streamlit (the alternative) would struggle to match.

---

## 2. Core Responsibilities & Scope

The frontend team (2 members) is responsible for the presentation and user interaction layers. 
* **Your Job:** Build the 6 core screens, wire them up to the backend APIs, and ensure the UI effectively communicates the AI's reasoning (Explainability) to the judges.
* **Not Your Job:** You will *not* be writing the legal rules, the AI extraction logic, or database schemas. If a legal conflict arises, the frontend just displays the conflict surfaced by the backend.

---

## 3. Screen-by-Screen Breakdown

The frontend consists of exactly **6 main screens**.

### Screen 1: Dashboard / Case List
* **Purpose:** Overview of all previous and ongoing cases.
* **Key Components:** A data table showing Case Title, Status, Confidence Score, and Date. Buttons to "Open Case" or "Create New Case".
* **API Call:** `GET /cases`

### Screen 2: Create Case
* **Purpose:** Start a new analysis.
* **Key Components:**
  * Free-text description field (where the user describes the formulation).
  * **As-of-date picker:** Crucial for testing temporal reasoning (e.g., testing laws before/after 2023).
  * **Jurisdiction toggle:** India vs. International.
  * Submit button.
* **API Call:** `POST /cases`

### Screen 3: Fact Verification
* **Purpose:** The cheapest hallucination guard. Allows the user to confirm or fix what the AI extracted *before* the rule engine runs.
* **Key Components:**
  * A list of extracted facts (e.g., ingredients, dosage, commercial intent).
  * Display the confidence score and the "source span" (the snippet of user text it was extracted from).
  * Inline editing capabilities to correct wrong facts or add missing ones.
* **API Call:** `POST /cases/{id}/facts`

### Screen 4: Analysis Result (Primary Demo Screen)
* **Purpose:** The main dashboard showing the legal conclusion.
* **Key Components:**
  * **Classification Result:** (e.g., `classical`, `proprietary`, `phytopharmaceutical`).
  * **Confidence Summary:** Displayed in bands (HIGH, MEDIUM, LOW, INSUFFICIENT) with distinct colors.
  * Fired rules, matched evidence, IP implications, and next recommended action.
  * **TKDL/ABS Flag:** A clearly labeled panel indicating TKDL relevance (must state "Public TKDL information" or "Restricted access — not available in this prototype").
  * **Escalation Badge:** A visual badge if human escalation is required.
  * Buttons to "Re-analyze" (if facts are updated) or "Escalate".
* **API Call:** `POST /cases/{id}/analyze`

### Screen 5: Explainability / "Why?"
* **Purpose:** The most important screen for the judges to prove the AI didn't just hallucinate the answer.
* **Key Components:**
  * A **Vertical Stepper** or **Accordion** component showing the exact trace:
    1. User input
    2. Extracted facts (with user corrections highlighted as a diff)
    3. Rules triggered
    4. Exact statutory provision / citation
    5. Supporting evidence chunk (with source and date)
    6. Citation validation result (Pass/Fail)
    7. Confidence breakdown
    8. Plain-language reasoning
* **API Call:** `GET /cases/{id}/explain` (Read-only screen)

### Screen 6: Case Report
* **Purpose:** Exportable artifact for the user.
* **Key Components:** Summary + full trace of the case. A "Download JSON/PDF" button. Escalation status badge.
* **API Call:** `GET /cases/{id}/report`

---

## 4. Special UI Behaviors to Keep in Mind

1. **Case Versioning (Re-analysis):** Cases are never overwritten, they are appended. The UI needs a **Case History** view that shows previous versions of an analysis side-by-side or in a list, highlighting what changed when a user updated a fact.
2. **Graceful Failures:** If the AI API fails, the backend will return a specific error. The UI must not crash; it should elegantly display the fallback message or escalation route.
3. **Band-Colored Confidence:** The 5-dimension confidence score must be color-coded. (e.g., HIGH ≥ 0.80 is Green, INSUFFICIENT < 0.25 is Red/Blocked).

---

## 5. Frontend 7-Day Implementation Schedule

* **Day 1–2:** Initialize repository (Next.js/React). Setup Tailwind and component libraries (shadcn/ui). Build static, mocked-up versions of the **Dashboard** and **Create Case** screens.
* **Day 3:** Build the **Fact Verification** screen with inline editing. Use hardcoded mock JSON data to simulate the backend.
* **Day 4:** Build the **Analysis Result** screen and the complex **Explainability Stepper**.
* **Day 5:** Refine the UI. Add color-coding for confidence bands, TKDL warning labels, and Case History versioning.
* **Day 6 (Integration Milestone):** Swap out all mock JSON data with real API calls using Axios/Fetch to connect to the FastAPI backend. Ensure the jurisdiction and date toggles genuinely filter data.
* **Day 7:** Bug fixing, UI polish, and demo rehearsal. No new features.
