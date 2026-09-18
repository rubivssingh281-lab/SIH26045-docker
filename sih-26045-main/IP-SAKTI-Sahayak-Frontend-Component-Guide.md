# IP-SAKTI Sahayak — Frontend Component & Architecture Guide

## 1. Overview

**IP-SAKTI Sahayak** is a responsive Next.js web application for evidence-grounded research around:

- Ayurvedic intellectual property
- Traditional knowledge
- Formulation classification
- ABS / biodiversity compliance
- TKDL / prior-art research
- Regulatory pathways
- Evidence, citations and confidence
- Case history, reporting and human escalation

The frontend is responsible for **presentation, interaction, routing, client state and API consumption**. It does **not** independently perform legal reasoning, patentability decisions, citation validation, classification, ABS applicability or confidence calculations.

The backend remains the source of truth for those decisions.

---

## 2. Technology Stack

The frontend uses:

| Technology | Purpose |
|---|---|
| Next.js App Router | Application framework and routing |
| TypeScript | Static typing |
| Tailwind CSS | Styling and responsive layout |
| Radix UI Slot | Accessible component composition |
| shadcn/ui-style primitives | Reusable UI components |
| TanStack React Query | Server-state management and caching |
| Axios | Central HTTP client |
| Lucide React | Icons |
| Recharts | Dashboard analytics |
| react-dropzone | Document drag-and-drop upload |
| Sonner | Toast notifications |

Important packages are declared in `package.json`.

---

## 3. Project Structure

```text
IP-SAKTI-Sahayak/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── verify/
│   │   │       └── page.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   │
│   │   ├── cases/
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── loading.tsx
│   │   │       ├── verify/
│   │   │       │   └── page.tsx
│   │   │       ├── explain/
│   │   │       │   └── page.tsx
│   │   │       ├── report/
│   │   │       │   └── page.tsx
│   │   │       └── history/
│   │   │           └── page.tsx
│   │   │
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   └── domain/
│   │
│   ├── hooks/
│   │   └── queries/
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   ├── utils.ts
│   │   └── mocks/
│   │
│   ├── types/
│   │   ├── index.ts
│   │   └── auth.ts
│   │
│   └── middleware.ts
│
├── .env.example
├── package.json
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── README.md
```

---

# 4. Application Routing

## Public authentication routes

### `/auth/login`

Login screen with two authentication modes:

- Password login
- OTP login

Password flow:

```text
Email + Password
        ↓
POST /auth/token
        ↓
JWT/session
        ↓
Dashboard
```

OTP flow:

```text
Email
 ↓
POST /auth/request-otp
 ↓
6-digit OTP
 ↓
POST /auth/verify-otp
 ↓
JWT/session
 ↓
Dashboard
```

Features:

- Email validation
- Password visibility toggle
- OTP countdown
- OTP resend
- Masked email
- Loading states
- Error/info feedback
- Redirect to requested `next` path

The authentication page is deliberately rendered **outside the dashboard shell**.

---

## `/auth/register`

Registration page.

Current form fields:

- First name
- Last name
- Email
- Password
- Confirm password

The page follows the standalone authentication visual design and does not render the application sidebar.

---

## `/auth/verify`

OTP verification page.

Purpose:

- Verify email/OTP after registration or authentication
- Keep OTP verification visually separate from the application shell

---

## `/dashboard`

Main case-management and analytics screen.

Contains:

1. Page header
2. Statistics cards
3. Classification pie chart
4. Research shortcuts
5. Grounding/source categories
6. Case list
7. Search/filter behavior
8. Research-hygiene guidance
9. Backend/source-of-truth notice

---

## `/cases/new`

Creates a new research case.

Inputs:

- Title
- Description
- As-of date
- Jurisdiction
- PDF/document upload

Jurisdiction:

```text
INDIA
INTERNATIONAL
```

Document workflow:

```text
Upload PDF
   ↓
POST /cases/upload
   ↓
Backend extracts text
   ↓
Extracted text returned
   ↓
Description populated
   ↓
User reviews/edits
   ↓
POST /cases
```

The user must review the extracted content before case creation.

---

## `/cases/[id]/verify`

Fact verification screen.

Purpose:

- Review backend-extracted facts
- Review normalized terminology
- Edit facts
- See extraction confidence
- See source spans
- Confirm facts

The UI explicitly distinguishes:

```text
EXTRACTED
NORMALIZED
USER_CORRECTED
CONFIRMED
```

No final analysis should be presented before this verification step.

---

## `/cases/[id]`

Primary analysis result screen.

Displays backend-provided:

- Classification
- Assessment confidence
- Triggered rule
- Citation
- Evidence
- Jurisdiction
- As-of date
- ABS indication
- TKDL indication
- Prior-art candidates
- Next action
- Limitations
- Escalation action
- Report download

The frontend only renders the backend response.

---

## `/cases/[id]/explain`

Explainability screen.

Displays the backend reasoning trace as a visual workflow:

```text
User Input
   ↓
Extracted Facts
   ↓
User Corrections
   ↓
Rules Triggered
   ↓
Statutory Provision
   ↓
Supporting Evidence
   ↓
Citation Validation
   ↓
Confidence Breakdown
   ↓
Explanation
   ↓
Next Action
```

---

## `/cases/[id]/report`

Case report page.

Actions include:

- Share
- Print
- Download PDF
- Navigate back to analysis/history

The PDF is retrieved from the backend as binary data.

---

## `/cases/[id]/history`

Audit/history screen.

Shows a vertical timeline containing events such as:

- Case created
- Facts modified
- Facts confirmed
- Case analyzed
- Report generated
- Escalation
- Notes

Each event can contain:

- Event type
- Title
- Description
- Actor
- Timestamp
- Analysis/version number

---

## `/profile`

User profile and workspace preference page.

Displays:

- User email
- Role
- Name where available
- Default jurisdiction

Allows the default jurisdiction preference to be updated.

---

# 5. Global Application Shell

## `AppShell`

File:

```text
src/components/domain/app-shell.tsx
```

Responsible for the authenticated application's shared layout.

Includes:

- Desktop sidebar
- Mobile navigation drawer
- Top header
- Search control
- Jurisdiction selector
- Sidebar collapse behavior
- Workspace preferences
- Navigation links
- Floating AI chat

The shell is **not rendered for authentication routes**.

---

# 6. Authentication Visual Component

## `AuthVisual`

File:

```text
src/components/domain/auth-visual.tsx
```

Purpose:

- Shared visual panel for login/register screens
- IP-SAKTI branding
- Evidence-grounded research label
- Ayurvedic/IP messaging
- Feature highlights
- Decorative shapes

Both login and registration use this component so the authentication design remains consistent.

---

# 7. Reusable UI Components

All generic components live under:

```text
src/components/ui/
```

## `Button`

File:

```text
src/components/ui/button.tsx
```

Reusable button with variants:

- primary
- secondary
- ghost
- gold

Also supports sizes such as:

- small
- medium
- large

Uses Radix Slot for composition.

---

## `Card`

File:

```text
src/components/ui/card.tsx
```

Reusable container for:

- dashboards
- forms
- evidence
- analytics
- timelines
- notices

Also exposes:

- `CardHeader`
- `CardContent`

---

## `Badge`

File:

```text
src/components/ui/badge.tsx
```

Used for status and classification indicators.

Supported visual tones include:

- default
- success
- gold
- danger
- navy

---

## `Input`

File:

```text
src/components/ui/input.tsx
```

Reusable styled input element with:

- border/focus behavior
- placeholder styling
- responsive sizing

---

## `Textarea`

File:

```text
src/components/ui/textarea.tsx
```

Reusable text area used primarily for research descriptions.

---

## `Skeleton`

File:

```text
src/components/ui/skeleton.tsx
```

Loading placeholder used during API requests.

---

# 8. Domain Components

All IP-SAKTI-specific components live under:

```text
src/components/domain/
```

---

## `CaseStatisticsCards`

File:

```text
src/components/domain/case-statistics.tsx
```

Displays four dashboard metrics:

- Cases analyzed
- Pending
- Complete
- Escalated

Statistics come from `useCaseStatistics()`.

---

## `ClassificationPieChart`

File:

```text
src/components/domain/case-statistics.tsx
```

Uses Recharts.

Displays case classification distribution, for example:

```text
Classical
Proprietary
Other
```

The chart uses the existing project colors rather than introducing a separate theme.

---

## `ConfidenceCard`

File:

```text
src/components/domain/confidence-card.tsx
```

Displays the backend confidence breakdown:

```text
Fact confidence
Rule-fit confidence
Evidence confidence
Citation confidence
Overall assessment
```

The terminology intentionally uses:

> Assessment confidence

instead of claiming a percentage of legal correctness.

---

## `ExplainabilityStepper`

File:

```text
src/components/domain/explainability-stepper.tsx
```

Renders a vertical explanation trace.

Consumes:

```ts
ExplainabilityTrace
```

and does not invent missing steps.

---

## `CaseHistoryTimeline`

File:

```text
src/components/domain/case-history-timeline.tsx
```

Displays the audit history vertically.

Uses different icons for different event types and displays the actor/timestamp for each event.

---

## `FileUploadDropzone`

File:

```text
src/components/domain/file-upload-dropzone.tsx
```

Built with `react-dropzone`.

Responsibilities:

- Drag-and-drop PDF upload
- File picker
- PDF type validation
- Size validation
- Upload state
- Uploaded-file presentation
- Clear/remove action
- Upload error display

The component itself does not perform document extraction. It calls a supplied upload callback.

---

## `JurisdictionToggle`

File:

```text
src/components/domain/jurisdiction-toggle.tsx
```

Real jurisdiction selector:

```text
India
International
```

The selected jurisdiction is sent to backend operations.

It is not merely a visual toggle.

---

## `StatusBadge`

File:

```text
src/components/domain/status-badge.tsx
```

Converts backend case statuses into readable labels.

Supported statuses include:

```text
DRAFT
VERIFYING
ANALYZING
COMPLETE
ABSTAINED
ESCALATED
```

---

## `Disclaimer`

File:

```text
src/components/domain/disclaimer.tsx
```

Displays the mandatory notice:

> This is an AI-assisted research assessment and does not constitute legal advice.

Used on relevant research pages.

---

## `PageHeader`

File:

```text
src/components/domain/page-header.tsx
```

Provides:

- Eyebrow
- Page title
- Description
- Optional action area

---

## `Breadcrumb`

File:

```text
src/components/domain/page-header.tsx
```

Provides contextual navigation such as:

```text
Dashboard
  >
Case
  >
Analysis
```

---

## `ShareCaseButton`

File:

```text
src/components/domain/share-case-button.tsx
```

Provides case sharing.

Current fallback behavior:

```text
navigator.clipboard
      ↓
current case URL copied
```

The component is designed so a future backend tokenized/public-sharing endpoint can replace the fallback without redesigning the report page.

---

## `FloatingAIChat`

File:

```text
src/components/domain/floating-ai-chat.tsx
```

Fixed bottom-right AI research assistant.

Location:

```text
fixed bottom-4 right-4
```

Purpose:

General project-specific Q&A across:

- Ayurvedic IP
- Traditional knowledge
- Patents
- ABS
- TKDL/prior art
- Regulatory pathways

Features:

- Slide-out chat panel
- Conversation messages
- Loading indicator
- Send button
- Enter-to-send
- Mobile-responsive behavior
- Error feedback
- Research disclaimer

It calls the centralized assistant API rather than calling Axios directly.

---

# 9. Providers and Global State

## `Providers`

File:

```text
src/components/providers.tsx
```

Provides:

### TanStack Query

Creates a shared `QueryClient` for server state.

### Authentication context

Provides:

```ts
useAuth()
```

with session/user information and methods for:

- set session
- clear session
- read authenticated user

### Sonner

Mounts the global toast system.

Typical messages include:

```text
Case Created Successfully
Facts Updated
Document text extracted
Report ready
API error
```

---

# 10. React Query Hooks

All query hooks live under:

```text
src/hooks/queries/
```

## `useCases()`

Fetches:

```http
GET /cases
```

Used by the dashboard.

---

## `useCase(id)`

Fetches:

```http
GET /cases/{id}
```

Provides the current case.

---

## `useFacts(id)`

Retrieves backend-extracted facts.

The current API layer uses:

```http
POST /cases/{id}/facts
```

for fact retrieval/processing according to the existing frontend contract.

---

## `useConfirmFacts(id)`

Submits the user's reviewed facts.

```http
POST /cases/{id}/facts
```

Invalidates/refetches case/fact state after success.

---

## `useCreateCase()`

Creates the case:

```http
POST /cases
```

Payload:

```ts
{
  title: string;
  description: string;
  as_of_date: string;
  jurisdiction: "INDIA" | "INTERNATIONAL";
}
```

---

## `useAnalyzeCase(id)`

Runs backend analysis:

```http
POST /cases/{id}/analyze
```

Payload includes:

```ts
{
  jurisdiction;
  as_of_date;
}
```

---

## `useExplanation(id)`

Fetches explainability:

```http
GET /cases/{id}/explain
```

---

## `useCaseStatistics()`

File:

```text
src/hooks/queries/use-statistics.ts
```

Derives dashboard statistics from the existing case collection.

Outputs:

```ts
totalCases
totalCasesAnalyzed
pending
complete
escalated
classification[]
```

The aggregation is frontend presentation logic only; it does not determine legal classifications.

---

## `useEscalate(id)`

Sends a human-review request:

```http
POST /cases/{id}/escalate
```

---

# 11. API Layer

## `src/lib/api.ts`

The API layer is the central HTTP communication point.

It creates an Axios instance with:

- configurable base URL
- timeout
- common headers
- authentication interceptor
- readable error mapping

Configuration comes from:

```env
NEXT_PUBLIC_API_BASE_URL
```

The frontend does not hardcode the backend host inside components.

---

# 12. Authentication API

`authApi` includes operations such as:

```text
register()
login()
requestOtp()
verifyOtp()
me()
updateProfile()
```

Current expected backend endpoints include:

```http
POST /auth/register
POST /auth/token
POST /auth/request-otp
POST /auth/verify-otp
GET  /auth/me
PATCH /auth/me
```

---

# 13. Case API

`caseApi` includes:

```text
list()
get()
create()
facts()
confirmFacts()
analyze()
explain()
history()
report()
uploadDocument()
escalate()
```

Expected routes include:

```http
GET    /cases
POST   /cases
GET    /cases/{id}
POST   /cases/{id}/facts
POST   /cases/{id}/analyze
GET    /cases/{id}/explain
GET    /cases/{id}/report
POST   /cases/{id}/escalate
POST   /cases/upload
```

---

# 14. PDF Reporting

The report endpoint is consumed as binary data:

```http
GET /cases/{id}/report
```

Axios uses:

```ts
responseType: "arraybuffer"
```

The frontend treats the response as:

```text
application/pdf
```

and downloads:

```text
<case-id>-case-report.pdf
```

The frontend does not attempt to create a fake legal report from JSON.

---

# 15. Document Upload

The document upload API uses:

```text
FormData
```

with the selected file.

Expected frontend flow:

```text
File
 ↓
FormData
 ↓
POST /cases/upload
 ↓
{
  extracted_text,
  filename
}
 ↓
Description textarea
```

The returned text remains editable by the user.

---

# 16. AI Chat API

The assistant uses:

```env
NEXT_PUBLIC_ASSISTANT_CHAT_PATH=/assistant/chat
```

and sends:

```http
POST /assistant/chat
```

The API layer returns:

```ts
{
  answer: string;
}
```

This makes it possible to change the backend route without modifying the visual chat component.

---

# 17. Mock API Layer

Mock data is kept under:

```text
src/lib/mocks/
```

The mock layer exists only to allow UI development before the FastAPI backend is available.

The mocks should use the same TypeScript contracts as the real API.

Important examples:

```text
Case
Fact
Analysis
ConfidenceScore
ExplainabilityTrace
CaseHistoryEvent
```

Mock evidence must remain clearly marked as illustrative and must never be presented as verified legal authority.

---

# 18. Types

## `src/types/index.ts`

Contains major shared domain contracts.

### `Case`

Represents a research case.

### `Fact`

Represents an extracted/normalized/confirmed fact.

### `ConfidenceScore`

Contains:

```text
fact_conf
rule_fit_conf
evidence_conf
citation_conf
overall_conf
band
```

### `Analysis`

Represents the backend analysis response.

### `Rule`

Represents a backend-provided rule.

### `Evidence`

Represents backend evidence/citation data.

### `PriorArtCandidate`

Represents a backend prior-art candidate.

### `ExplainabilityTrace`

Contains:

```ts
steps: ExplainabilityStep[]
```

### `CaseHistoryEvent`

Contains:

```text
id
type
title
description
actor
occurred_at
version
```

---

## `src/types/auth.ts`

Contains authentication contracts:

### `AuthUser`

Includes:

```text
id
email
role
first_name
last_name
default_jurisdiction
```

### `AuthResponse`

Includes:

```text
access_token
token_type
user
requires_otp
message
```

---

# 19. Middleware / Route Protection

File:

```text
src/middleware.ts
```

Authentication routes are public:

```text
/auth/login
/auth/register
/auth/verify
```

Protected routes include:

```text
/dashboard/*
/cases/*
/profile/*
```

When no session cookie exists, protected requests are redirected to:

```text
/auth/login
```

with the intended destination preserved in:

```text
?next=/requested/path
```

Authenticated users visiting login can be redirected back to the dashboard.

---

# 20. Design System

The project preserves the existing IP-SAKTI color palette.

```text
Forest   #123C32
Emerald  #176B5B
Canvas   #F7F4EC
Navy     #172A46
Gold     #C58B2A
```

The design system is intended to visually connect:

- authentication
- dashboard
- case research
- evidence
- reports
- collaboration

without introducing unrelated color themes.

---

# 21. Typography

The interface uses:

### Serif headings

```text
DM Serif Display
```

Used for:

- page titles
- major classification labels
- section headings
- auth hero text

### Sans-serif interface text

```text
Manrope
```

Used for:

- labels
- forms
- buttons
- metadata
- navigation
- evidence details

---

# 22. Responsive Design

The application is designed as a website rather than a mobile app.

Target widths:

```text
1440px
1280px
1024px
768px
480px
390px
```

### Desktop

- persistent sidebar
- multi-column layouts
- analytics cards
- charts
- evidence panels

### Tablet

- reduced columns
- condensed navigation
- stacked content where required

### Mobile

- sidebar becomes drawer
- cards stack
- evidence sections stack
- touch-friendly controls
- no intentional horizontal scrolling

Authentication pages use a separate full-screen responsive layout.

---

# 23. Loading States

API-dependent pages expose loading states through:

- Skeleton components
- Button loading labels
- Spinners
- In-panel loading messages

Examples:

```text
Signing in…
Sending OTP…
Verifying…
Creating case…
Running analysis…
```

---

# 24. Error Handling

API errors are normalized through:

```ts
getApiErrorMessage()
```

The UI avoids exposing raw Axios errors.

Examples of user-facing messages:

```text
We couldn't sign you in.
We couldn't send the verification code right now.
The research service could not be reached.
The requested case could not be found.
```

Core user actions use Sonner toasts where appropriate.

---

# 25. Empty and Abstention States

The UI distinguishes:

### Empty state

Example:

```text
No matching cases
Try a formulation name, status, jurisdiction or classification.
```

### Abstention

Used when:

```text
band === "INSUFFICIENT"
```

The interface shows:

```text
Insufficient Grounded Evidence
```

instead of styling it as a successful classification.

---

# 26. Case Versioning

The case model can represent multiple analysis versions.

The UI can show:

```text
Version 1
Version 2
Version 3
```

and, when supplied by the backend:

- changed facts
- changed rules
- confidence delta
- current version

The frontend does not silently overwrite prior analysis history.

---

# 27. Collaboration & Audit

The collaboration layer consists of:

```text
ShareCaseButton
CaseHistoryTimeline
Report page
History page
```

Sharing currently copies the case/report URL using the browser clipboard API.

A future backend tokenized sharing URL can be inserted into the same component without changing the surrounding UI architecture.

---

# 28. Accessibility

The frontend uses:

- semantic buttons
- labels associated with inputs
- keyboard-friendly controls
- focus states
- accessible navigation controls
- ARIA labels for icon-only buttons
- semantic form elements
- responsive touch targets

Icons come consistently from Lucide React.

---

# 29. Security Responsibilities

The frontend must never expose:

- LLM API keys
- Bhashini credentials
- private backend secrets
- database credentials

Only browser-safe environment variables should use:

```text
NEXT_PUBLIC_...
```

The server should remain responsible for sensitive credentials.

For production JWT handling, a secure HttpOnly cookie is preferred over exposing long-lived credentials to client-side JavaScript.

---

# 30. Frontend / Backend Responsibility Boundary

## Frontend

Owns:

```text
UI
Routing
Forms
Interaction
Presentation
Client state
Loading states
Error states
Responsive layout
API consumption
```

## Backend

Owns:

```text
Case persistence
Fact extraction
Normalization
Rule engine
Evidence retrieval
Citation validation
Confidence calculation
Analysis versioning
Escalation logic
Report generation
```

The frontend must not cross this boundary by implementing legal reasoning.

---

# 31. Typical End-to-End User Journey

## Authentication

```text
Open website
   ↓
/auth/login
   ↓
Password or OTP
   ↓
JWT/session
   ↓
/dashboard
```

## Research case

```text
Dashboard
   ↓
Start new research
   ↓
/cases/new
   ↓
Enter formulation information
   OR
Upload PDF
   ↓
Extracted text appears
   ↓
Review information
   ↓
Create case
   ↓
/cases/{id}/verify
   ↓
Review facts
   ↓
Confirm facts
   ↓
/cases/{id}
   ↓
Run analysis
   ↓
Classification + evidence + confidence
   ↓
Explainability / Report / History
```

---

# 32. Adding a New Domain Component

Recommended process:

1. Create the component under:

```text
src/components/domain/
```

2. Define a typed props interface.
3. Keep API calls outside the visual component.
4. Reuse generic components from:

```text
src/components/ui/
```

5. Add the component to an appropriate route.
6. Provide loading/error/empty states where API data is involved.
7. Verify desktop and mobile behavior.

---

# 33. Adding a New API Operation

Recommended process:

```text
API method
   ↓
src/lib/api.ts
   ↓
React Query hook
   ↓
Route/page
   ↓
Domain component
```

Do not put raw Axios calls inside presentational components.

---

# 34. Environment Configuration

Example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_ASSISTANT_CHAT_PATH=/assistant/chat
```

For frontend-only development:

```env
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_USE_MOCK_API=true
```

---

# 35. Development Commands

Install:

```bash
npm install
```

Development server:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Production server:

```bash
npm start
```

---

# 36. Important Development Rules

When extending the frontend:

- Preserve the current IP-SAKTI color system.
- Keep authentication pages outside the dashboard shell.
- Keep the frontend legal-logic-free.
- Keep API communication centralized.
- Prefer React Query for server state.
- Use typed interfaces rather than `any`.
- Do not fabricate statutes, citations, evidence, TKDL results or classifications.
- Keep mock records clearly marked as mock data.
- Add loading, error and empty states.
- Maintain responsive behavior.
- Use Lucide icons consistently.
- Reuse domain components instead of duplicating UI.

---

# 37. Quick Component Reference

| Component | File | Purpose |
|---|---|---|
| AppShell | `components/domain/app-shell.tsx` | Authenticated application shell |
| AuthVisual | `components/domain/auth-visual.tsx` | Auth visual/branding panel |
| PageHeader | `components/domain/page-header.tsx` | Page title/header |
| Breadcrumb | `components/domain/page-header.tsx` | Breadcrumb navigation |
| CaseStatisticsCards | `components/domain/case-statistics.tsx` | Analytics metrics |
| ClassificationPieChart | `components/domain/case-statistics.tsx` | Classification chart |
| ConfidenceCard | `components/domain/confidence-card.tsx` | Confidence breakdown |
| ExplainabilityStepper | `components/domain/explainability-stepper.tsx` | Analysis trace |
| CaseHistoryTimeline | `components/domain/case-history-timeline.tsx` | Audit timeline |
| FileUploadDropzone | `components/domain/file-upload-dropzone.tsx` | PDF upload |
| FloatingAIChat | `components/domain/floating-ai-chat.tsx` | AI Q&A panel |
| JurisdictionToggle | `components/domain/jurisdiction-toggle.tsx` | India/International |
| StatusBadge | `components/domain/status-badge.tsx` | Case status display |
| ShareCaseButton | `components/domain/share-case-button.tsx` | Copy/share case link |
| Disclaimer | `components/domain/disclaimer.tsx` | Legal-information notice |
| Button | `components/ui/button.tsx` | Generic button |
| Card | `components/ui/card.tsx` | Generic card |
| Badge | `components/ui/badge.tsx` | Generic badge |
| Input | `components/ui/input.tsx` | Generic input |
| Textarea | `components/ui/textarea.tsx` | Generic textarea |
| Skeleton | `components/ui/skeleton.tsx` | Loading placeholder |

---

# 38. Summary

The frontend is organized around a clear product pipeline:

```text
Authentication
      ↓
Dashboard
      ↓
Create Case
      ↓
Document / Formulation Input
      ↓
Fact Verification
      ↓
Backend Analysis
      ↓
Evidence + Confidence
      ↓
Explainability
      ↓
Report
      ↓
History / Collaboration
```

The architecture is intentionally modular so the current mock API can be replaced by the FastAPI backend without rewriting the visual components.

The most important architectural principle is:

```text
Frontend = presentation + interaction
Backend  = evidence + legal reasoning + source of truth
```
