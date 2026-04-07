---
name: CV original download menu
overview: Keep dashboard PDF export as today. Add a separate CV card menu item to download the stored original file when the CV was imported from an upload.
todos:
  - id: menu-item
    content: Add "Download original file" (or similar) to CVQuickActions; visible only when isUploadedCV(cv); call cvApi.downloadCV
  - id: handlers
    content: Keep onDownload wired to exportCVAsPDF; add optional onDownloadOriginal(cv) or handle inside CVQuickActions with cvApi directly
  - id: labels
    content: Keep "Export PDF" for LaTeX export; ensure new item label is distinct
  - id: table-parity
    content: Optional — add original download to CVsTable row actions if product wants list parity
---

# CV card: add "download original" alongside export PDF

## Change from prior plan

- **Do not** switch the primary download path to `/cvs/{id}/download`.
- The existing chip / quick action that triggers **LaTeX PDF export** (`exportCVAsPDF` → `GET /cvs/{id}/export/pdf`) **stays unchanged**.

## New behavior

- Add a **second** option to the CV card **overflow menu** ([`CVQuickActions.tsx`](frontend/src/components/cv/CVQuickActions.tsx)): e.g. **"Download original file"**.
- **Visibility**: only when [`isUploadedCV(cv)`](frontend/src/utils/dashboardUtils.tsx) is true (has stored `file_path` / `file_size > 0`). Hide for blank, from-text, and duplicates without a file.
- **Action**: call existing [`cvApi.downloadCV(cvId, cv.original_filename)`](frontend/src/services/api.ts) → `GET /cvs/{id}/download` ([`crud.py`](backend/src/api/cvs/crud.py)).
- **Errors**: surface backend 400/404 (no file, missing on disk) with the same notification pattern as export failures.

## Wiring options (pick one when implementing)

- **A (minimal)**: New menu item calls `cvApi.downloadCV` inside `CVQuickActions` only; no new props on `Dashboard` if the component imports `cvApi`.
- **B (consistent)**: Add `onDownloadOriginal?: (cv: CV) => void` from [`Dashboard.tsx`](frontend/src/pages/Dashboard.tsx) through `CVCard` / `CVsCard`, mirroring `onDownload`, so all API calls stay in the page layer.

Prefer **B** if other actions follow the same pattern.

## Files to touch

- [`frontend/src/components/cv/CVQuickActions.tsx`](frontend/src/components/cv/CVQuickActions.tsx) — new menu entry, disabled when `parse_error` if appropriate (original may still exist; only disable if no file).
- [`frontend/src/components/dashboard/CVCard.tsx`](frontend/src/components/dashboard/CVCard.tsx) — pass new callback if using props pattern.
- [`frontend/src/pages/Dashboard.tsx`](frontend/src/pages/Dashboard.tsx) — `handleDownloadOriginal` using `cvApi.downloadCV`.
- [`frontend/src/components/dashboard/useDashboardActions.ts`](frontend/src/components/dashboard/useDashboardActions.ts) — only if that hook is used for the same card actions and needs the new handler.

## Out of scope / optional

- **CV editor header** ([`CVEditorContent.tsx`](frontend/src/components/cv-editor/CVEditorContent.tsx)): still export-only unless requested.
- **CVsTable** ([`CVsTable.tsx`](frontend/src/components/dashboard/CVsTable.tsx)): currently a single download icon calling `onDownload` (export). Optional parity: second icon or a small menu; not required if the product scope is "CV card menu" only.

## Backend

- No API changes; `GET /cvs/{id}/download` already exists.
