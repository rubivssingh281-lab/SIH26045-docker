# Frontend Work Division Plan (2 Developers)

To ensure both frontend developers can work in parallel without causing constant merge conflicts, the 6 screens and core architecture have been divided based on domains.

## 🧑‍💻 Developer 1 (Core Routing, API, & Case Setup)
**Focus:** API integration, routing, and getting cases into the system.

### Responsibilities:
1. **API Layer (Days 1-2):**
   - Setup `axios` instance in `src/lib/api.ts`.
   - Setup React Query Provider in `layout.tsx`.
   - Write the React Query hooks (e.g., `useCases`, `useCreateCase`).
2. **Screen 1: Dashboard / Case List (Day 3)**
   - Build the Data Table using shadcn/ui to list all cases.
3. **Screen 2: Create Case Form (Day 4)**
   - Build the form for new cases.
   - Implement the As-of-Date picker and Jurisdiction toggle.
4. **Screen 6: Case Report (Day 5)**
   - Build the export functionality (JSON/PDF summary) for a completed case.

---

## 👩‍💻 Developer 2 (Complex UI, AI Results, & Explainability)
**Focus:** Building the complex, interactive components that display the AI's reasoning and results.

### Responsibilities:
1. **Screen 3: Fact Verification (Days 1-2)**
   - Build the Fact Verification UI where users can see extracted facts.
   - Implement inline-editing so users can correct facts before analysis.
2. **Screen 4: Analysis Result Dashboard (Days 3-4)**
   - Build the primary result dashboard.
   - Implement the **Confidence Bands** (color-coding HIGH, MEDIUM, LOW, INSUFFICIENT).
   - Implement the TKDL / Restricted Data Warning panels.
3. **Screen 5: Explainability Stepper (Day 5)**
   - Build the vertical stepper/accordion that traces the AI's logic (Facts -> Rules -> Citations -> Validation).
   - *This is the most critical UI component for the judges.*

---

## 🤝 Integration & Polish (Days 6-7 - Both Developers)
- **Day 6:** Connect Developer 2's UI components to Developer 1's API hooks. Ensure the Next.js routing seamlessly flows from Screen 1 -> Screen 5.
- **Day 7:** Bug fixing, UI polish (checking mobile responsiveness), and Demo rehearsal.
