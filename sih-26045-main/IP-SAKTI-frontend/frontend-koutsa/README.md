# IP-SAKTI Sahayak — Frontend

Responsive Next.js App Router frontend for the IP-SAKTI Sahayak evidence-grounded traditional-knowledge/IP research workflow.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-style primitives, Radix Slot, TanStack React Query, Axios and Lucide React.

## Routes

- `/dashboard`
- `/cases/new`
- `/cases/[id]/verify`
- `/cases/[id]`
- `/cases/[id]/explain`
- `/cases/[id]/report`
- `/cases/[id]/history`

The report is a download action.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

The project defaults to isolated mock data so the UI is usable before FastAPI is connected.

For the real backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false
```

The frontend expects the backend contracts specified in the implementation brief and never performs legal classification itself.

## Design reference

The implementation follows the supplied Stitch visual system: ivory canvas, white bordered cards, forest/emerald primary, navy data UI, muted gold Sahayak accent, DM Serif Display headings and Manrope functional text.


## Authentication

Authentication is implemented at `/auth/login`, `/auth/register` and `/auth/verify`. The login screen supports password login through `POST /auth/token` and email OTP login through `POST /auth/request-otp` + `POST /auth/verify-otp`. Registration uses `POST /auth/register`.

The frontend attaches the stored bearer token to API requests with an Axios interceptor. The included middleware protects `/dashboard`, `/cases/*` and `/profile` and redirects unauthenticated visitors to `/auth/login`.

For the included prototype mock API, session state is stored in browser storage plus a session cookie solely so the Next.js middleware can demonstrate route protection. For production, replace this with a backend-managed HTTP-only, Secure, SameSite cookie.


## Phase 3 document/report features

- Create Case supports PDF drag-and-drop using `react-dropzone`.
- The frontend uploads the file to `POST /cases/upload` as multipart `FormData` and expects `{ extracted_text, filename }`.
- Returned extracted text is appended to the Description field so the user can review/edit it before case creation.
- Case reports are downloaded as `.pdf` from `GET /cases/{id}/report`; the production backend should return `application/pdf`.

The current mock mode returns an illustrative PDF for UI testing and an illustrative extracted-text response for uploaded files.

## Collaboration and audit trail

Case report and history routes use `GET /cases/{id}/report` and `GET /cases/{id}/history`. The prototype share action copies the current case URL unless a browser-native share sheet is available.


## UI/UX polish

- Sonner toasts replace standard API error blocks for core research actions.
- A fixed Sahayak AI button opens a project-specific Q&A drawer on authenticated application routes.
- Real-mode chat uses `POST /assistant/chat`; mock mode returns clearly illustrative research guidance.

## Tool-specific intake architecture

The shared case chassis stays common across research tools, while the intake and result surface can specialize by `?tool=`. `Ask Sahayak` now has a lightweight question-first flow with optional context, document grounding, a dedicated grounding checklist, and a conversational result with inline citation markers plus assessment confidence. The full-page Ask result and floating Sahayak chat use the same `GroundedAnswer` renderer.

The remaining research tools keep their existing specialized copy until their individual intake schemas are finalized; no unrequested legal logic is introduced in the frontend.
## ABS Compliance tool

`/cases/new?tool=abs` has a dedicated access-review intake for biological resources, origin geography, access context, community/TK involvement, and intended commercial use. The result surface is an obligations checklist with an authority pathway; international disclosure items are shown only when the case jurisdiction is `INTERNATIONAL`.

The production backend should return `Analysis.abs_assessment` with authoritative status, authority, obligation details and citations. Mock data is clearly illustrative.


## Case archive and source library

The archive is a dedicated retrieval surface at `/archive` with search, tool/status/jurisdiction/date filters, sorting, pagination, row-to-case navigation and filtered CSV export. It intentionally does not duplicate dashboard analytics.

The source library is a dedicated catalog at `/sources`. Six corpus categories link to `/sources/[slug]` and expose prototype version/access metadata. The UI makes clear that the backend corpus service remains authoritative for current versions, access permissions and citations.
