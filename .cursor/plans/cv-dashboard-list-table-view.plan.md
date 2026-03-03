# CV Dashboard List/Table View (with sortable columns)

## Summary

Add list/table view to the CV dashboard (card remains default). View preference and table sort preference are persisted. List view uses a table with sortable columns and a final "Add CV" row.

## Decisions (from user)

- **Persist view mode:** Yes (e.g. uiStore or localStorage).
- **Add CV in list view:** Last table row as "Add CV" / drop zone (click = file picker, drop = accept file).
- **Columns:** Title, Status, File type, Created, Modified (optional), Sections, Actions — as proposed.
- **Sortable columns:** Yes — make columns sortable.

---

## Sortable columns (addition)

- **Which columns are sortable:** Title, Status, File type, Created, Modified, Sections. Actions column is not sortable.
- **UI:** Use MUI `TableSortLabel` on sortable header cells. Click sets the column as sort key; click again toggles asc/desc. Show direction indicator on the active column.
- **State:** `sortBy: keyof CV | ''` (column id) and `sortDirection: 'asc' | 'desc'`. Default: e.g. `sortBy: 'created_at'`, `sortDirection: 'desc'` (newest first).
- **Persistence:** Persist sort preference (e.g. in same place as view mode — uiStore or a dedicated localStorage key like `cv_dashboard_table_sort`) so it’s restored on next visit when in list view.
- **Logic:** Client-side only. Sort the `cvs` array before rendering:
  - **Title:** `original_filename` string comparison (localeCompare).
  - **Status:** map to comparable value (e.g. parsed=2, parsing=1, error=0) then compare.
  - **File type:** string comparison (e.g. `file_type` or normalized type).
  - **Created / Modified:** date comparison (`created_at`, `updated_at`).
  - **Sections:** numeric comparison using `getSectionCount(cv)`.
- **Implementation:** In `CVsTable`, hold sort state (or receive from parent if persisted in Dashboard/uiStore). Use a `useMemo` to derive sorted list from `cvs` + sortBy + sortDirection. Render table with `TableSortLabel` in `TableCell` for each sortable column.

---

## Implementation outline (unchanged + sort)

1. **Dashboard:** Add `cvViewMode` state (default `'card'`), persisted. Add (or read from store) table sort state `sortBy`, `sortDirection` and persistence. Pass to CVsCard.
2. **CVsCard:** View toggle in header; when list view, render CVsTable + Add CV row; pass `cvs`, handlers, and sort state + onSortChange to CVsTable.
3. **CVsTable:** Table with columns Title, Status, File type, Created, Modified, Sections, Actions. Sortable headers via TableSortLabel; body from sorted `cvs`. Same action handlers as CVCard. Last row: "Add CV" / drop zone.
4. **Persistence:** View mode and table sort (sortBy, sortDirection) saved on change; restored on load (e.g. uiStore with persist or localStorage).
