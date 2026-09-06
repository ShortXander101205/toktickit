# Testing Contract

This is the single source for form test planning, shared CRUD/style requirements, test authoring, and durable test storage.

Use it after a frozen `<form>_form_specs.md` exists and before a form is considered complete. A form passes only when every applicable `CRUD-###` item is green and every form-specific `BR-<FORM>-###` has at least one green `TC-<FORM>-###`, except items explicitly tagged `MANUAL (developer)`.

Scope note: items tagged **[txn]** apply only to transactional header + line-item forms. Items tagged **[doc#]** apply only to forms with document numbering. Everything else applies to all CRUD forms.

## 1. Durable Test Artifacts (shared base + per-form invocation — "Option A")

Tests split by **whose behavior they encode**, so the universal checks are written **once** and reused, never copy-pasted into every form.

### `tests/shared/` — the universal base library (write once, reuse for every form)
Holds the **form-agnostic** implementations of the `CRUD-###` and `LINE-###` families plus common fixtures. The assertion logic is identical for every form; only the target parameters (route, ids, entity) change. Typical contents:
- `crud/toolbar-modes.base` (CRUD-001..009) · `permissions.base` (CRUD-010..014) · `lov.base` (CRUD-015..020) · `validation-timing.base` (CRUD-021..024) · `concurrency.base` (CRUD-025..026) · `line-reconciliation.base` (CRUD-027..031) · `server-owned-values.base` (CRUD-032..034) · `numbering.base` (CRUD-035..037) · `persistence-acid.base` (CRUD-038..039) · `support-subforms.base` + `shared-component-reuse.base` (CRUD-040..044, CRUD-059..063) · `list-view.base` (CRUD-045..048)
- `style/style-auditor.base` (CRUD-049..058)
- `line/line-item-conformance.base` (LINE-001..009)
- `fixtures/` — login, DB seed/reset, "open form in create/edit/view mode", shared toolbar/dialog selectors
- `runShared(config)` (Playwright) and a parameterized base test class (C#) that run the **applicable** families for one form from its config (see §1A)

### `tests/forms/<FormName>/` — this form's own tests
- The form's **business-rule tests only** — one or more `TC-<FORM>-###` per `BR-<FORM>-###` (its calculations, validations, variants, edge cases). Filenames name the rule family, e.g. `powo-totals-vat.spec.js`, `powo-secondqty.spec.js`, `powo-permission-separation.spec.js`. (Toolbar/CRUD/style/line checks are **not** re-written here — they live in `tests/shared/`.)
- **One universal-invocation file** that aims the shared base at this form (see §1A): `powo.universal.spec.js` (Playwright) and/or `PowoUniversalTests.cs` (C#).
- `coverage-report.md` for the form, listing `id | description | test file/name | status | spec version | notes`.
- Every test cites the `BR-...` / `CRUD-###` / `LINE-###` id it proves.

### Discovery & regression
Folders are organizational only. `dotnet test` discovers C# tests by the **test project + attributes**; `npx playwright test` by its **config glob**. Full regression runs the whole tree (shared + every form). To validate one form in isolation, run **its** folder — its business tests plus its universal invocation cover both halves.

## 1A. Shared-base invocation (Option A) + first-form bootstrap

### How a form runs the universal checks
Each form supplies its parameters and declares which families apply; the shared base does the rest. Playwright example — `tests/forms/powo/powo.universal.spec.js`:
```js
import { runShared } from "../../shared/runShared";

runShared({
  route: "/PurchaseOrders/Edit",          // the form's edit page
  formId: "purchaseorder-form",            // matches the CSS/JS selectors
  entity: "PurchaseOrder",                 // nameof(entity) — for change-log / shared-component checks
  permissionPrefixes: ["purchaseorder", "workorder"],  // CRUD-010..014; one per variant
  families: {
    txn: true,            // CRUD-027..031 (line reconcile), 032..034 (server-owned), 038..039 (ACID)
    docNumber: true,      // CRUD-035..037 (numbering)
    supportSubforms: true,// CRUD-040..044 + CRUD-059..063 (notes/change-log reuse)
    print: false,         // CRUD-005 / 014 (print gating)
    style: true,          // CRUD-049..058
    lineGrids: [          // LINE-001..009 run once PER grid
      { name: "Items Order",       panelSelector: "#purchaseOrderLinesPanel" },
      { name: "Material to Issue", panelSelector: "#purchaseOrderWoLinesPanel" }
    ]
  }
});
```
A family set to `false` / omitted is skipped (a master form with no line grid omits `txn`, `docNumber`, `lineGrids`). The **C# analog** is a small per-form test class that feeds the same config to a shared parameterized base, so `dotnet test` discovers it by attributes.

**Where the config comes from:** the frozen spec already carries every value — route/menu and per-variant permission prefixes (§5), form id + entity, and the txn / doc-number / line-grid facts (§0/§2c). The Spec Agent surfaces these so the invocation is fill-in-the-blanks.

### First-form bootstrap (one time)
The harness does not exist yet (no `/tests/` folder, no C# test project, no Playwright config). The **first** form built under this process must also establish it — call this out in that form's spec and PR:
1. Create the **C# test project** (e.g. `tests/Tests.csproj`) referencing the app, and the **Playwright config** + `package.json` scripts, so `dotnet test` and `npx playwright test` resolve.
2. Create **`tests/shared/`** with the family base modules + `fixtures/` + `runShared` (and the C# base class). Implement only the families that first form needs; add others when a later form first requires them.
3. Create **`tests/forms/<first-form>/`** with its `BR` tests, its universal-invocation file, and `coverage-report.md`.

Every subsequent form then only adds its own `tests/forms/<form>/` folder (BR tests + invocation + coverage report); it extends a shared base **only** when it introduces a genuinely new shared behavior.

> Legacy note: the current ad-hoc root scripts (`test_*.js`) are **not** part of this structure yet; fold them in opportunistically when the harness is bootstrapped.

## 2. Change Maintenance Workflow

When a form changes:

1. Update and version the frozen spec.
2. Diff the spec by `BR-...` and applicable `CRUD-###` impact.
3. Patch only the affected per-form tests and coverage rows.
4. Run the affected tests first.
5. Run the full form suite as regression before handoff.
6. Human-review the test diff for changed business meaning.

## 3. Universal CRUD Contract

### A. Toolbar Mode Contract

- **CRUD-001** Create mode shows/enables only: Save, dirty-state indicator, Cancel Changes, and disabled Copy. Nothing else.
- **CRUD-002** Edit mode shows/enables the same set as Create.
- **CRUD-003** View mode shows/enables only: Close, Create New, List View, Edit, Delete, and supported Print.
- **CRUD-004** Copy is disabled in every mode until implemented project-wide.
- **CRUD-005** Print is disabled unless the form explicitly supports printing; if supported, it is enabled only in View mode.
- **CRUD-006** Dirty-state indicator is visible only in Create/Edit and reflects clean-to-dirty transitions on first real edit.
- **CRUD-007** Cancel Changes uses the X SVG icon and is visible/enabled only in Create/Edit.
- **CRUD-008** Cancel Changes when clean: Create goes to entity list; Edit goes to the same record in View mode.
- **CRUD-009** Cancel Changes when dirty routes through the central confirm dialog; confirmed Edit reloads last-saved DB values, not client state.

### B. Permissions

- **CRUD-010** Each `.view/.create/.edit/.delete` action is enforced in page handlers; forged unauthorized requests return Forbid/403.
- **CRUD-011** Main-menu item is hidden when the user lacks `.view`.
- **CRUD-012** Create/Edit/Delete buttons are hidden or disabled without matching permission.
- **CRUD-013** A user with only `.view` cannot save; POST is rejected server-side.
- **CRUD-014** Print, if supported, is gated server-side by its own permission.

### C. Lookups / List-of-Values

- **CRUD-015** Typed code + blur resolves against the authoritative table and populates all snapshot fields and hidden id.
- **CRUD-016** Invalid typed code is rejected on save with a field validation error; blur alone blanks or avoids immediate hard-error.
- **CRUD-017** Popup selection populates every snapshot field the callback expects, plus the hidden id.
- **CRUD-018** Dependent LoV is filtered by parent context where required.
- **CRUD-019** Lookup row payload contains every field the callback needs; hidden filter fields never render as visible columns.
- **CRUD-020** Saving with only a posted display code and no valid id cannot persist a bad reference; server re-resolves.

### D. Validation Timing

- **CRUD-021** Invalid date/number/time during data entry blanks on blur with no immediate error message.
- **CRUD-022** Validation errors appear only on save/submit, or on report filter action for required filters.
- **CRUD-023** Header validation shows the red validation label below the control only; input text and borders never turn red.
- **CRUD-024** On save failure, focus moves to the first error; other entered values are preserved.

### E. Concurrency  [txn] and any rowversioned form

- **CRUD-025** Editing a record whose rowversion changed underneath returns the concurrency message and does not overwrite.
- **CRUD-026** After a concurrency error, reloading recovers latest values and a fresh token.

### F. Line Reconciliation  [txn]

- **CRUD-027** Editing an existing line updates it by hidden line id, not delete-and-recreate.
- **CRUD-028** A new line without id is inserted.
- **CRUD-029** A line omitted from the post is deleted.
- **CRUD-030** `item_no` is resequenced server-side from final display order.
- **CRUD-031** Reordering rows persists the new order without corrupting ids.

### G. Server-Owned / Derived Values  [txn]

- **CRUD-032** Posted totals/derived values are ignored; server recomputes from line inputs.
- **CRUD-033** Tampered posted totals do not persist.
- **CRUD-034** Overposting is prevented; server-owned fields are assigned explicitly, never bound from the client.

### H. Document Numbering  [doc#]

- **CRUD-035** A new record receives a number in the specified format.
- **CRUD-036** Numbering rows are locked inside the save transaction; concurrent creates never get the same number.
- **CRUD-037** Idempotent create yields one record, not duplicates.

### I. Persistence / ACID  [txn]

- **CRUD-038** Header + lines + numbering + logs commit in a single transaction.
- **CRUD-039** Forced failure mid-save rolls back the whole unit.

### J. Support Subforms

- **CRUD-040** In Create mode, Notes and Change Log toolbar buttons are disabled.
- **CRUD-041** Existing records enable support subforms per view/edit permission.
- **CRUD-042** Change Log records Created/Modified/Deleted for entities implementing `IChangeLogTrackedEntity`.
- **CRUD-043** Notes support create, edit, close/reopen, and delete.
- **CRUD-044** A note's optional file attachment uploads, replaces, and downloads through the Notes editor; no standalone Attachments button.

#### Shared-Component Reuse  (catches rebuilt subforms — see `docs/spec-core.md#13-shared-notesattachments--change-log-specification`)

- **CRUD-059** The form renders the shared `_FormToolbar` Notes/Change Log buttons and calls `sharedForm.wire({...})` with this form's `formId`/`idFieldName`/`basePage`; no custom notes/log/attachments markup, dialog, JS, or CSS exists for the form.
- **CRUD-060** All seven shared handlers exist with the exact names (`OnGetChangeLogsAsync`, `OnGetNotesAsync`, `OnGetNoteAsync`, `OnPostSaveNoteAsync`, `OnPostToggleNoteClosedAsync`, `OnPostDeleteNoteAsync`, `OnGetDownloadNoteAttachmentAsync`) and respond 200 (not 404/405) for a persisted record.
- **CRUD-061** The entity implements `IChangeLogTrackedEntity`, and a create/edit/delete actually writes `ChangeLogEntry` rows keyed by `ModelName = nameof(Entity)` + `RecordId = id` (proves the change log is not silently empty).
- **CRUD-062** Notes/attachments persist with the same `ModelName`/`RecordId` keying and read back through the shared handlers (no per-form table/column).
- **CRUD-063** The Notes/Change Log dialog markup and classes match the shared component (`.notes-dialog-shell`, `.change-log-dialog-shell`, …); the form introduced no divergent dialog. `MANUAL (developer)` visual confirmation allowed.

### K. List View

- **CRUD-045** List shows the spec's default columns in order.
- **CRUD-046** Paging defaults and visible row count match the spec; page-size options work.
- **CRUD-047** Each declared search filter filters correctly.
- **CRUD-048** Row open navigates to the record in View mode.

### L. Style Auditor Checklist

- **CRUD-049** No native `title` attribute on interactive controls; tooltips use `data-tooltip` and the shared engine.
- **CRUD-050** No generic Bootstrap action classes for ERP actions; use `toolbar-action` / `lookup-action-button`.
- **CRUD-051** No hardcoded green/blue/gray colors or gradients; use theme variables.
- **CRUD-052** Tabulator/dialog tables use theme-token headers, approved font sizes, alternate-row token, full rounded borders, and localized horizontal scroll.
- **CRUD-053** Alerts/confirmations use `window.appDialogs.info` / `.confirm`, never native `alert` / `confirm`.
- **CRUD-054** Edit mode uses cream readonly surfaces for computed fields; View mode is uniform with no cream, row highlight, or selection.
- **CRUD-055** Lookup/date controls are welded inside `.lookup-editor` / `.date-entry` with zero gap.
- **CRUD-056** Active-row CSS selectors are scoped to this form's id.
- **CRUD-057** Grid borders are visible on all four sides; horizontal scroll is contained inside the grid; header controls do not overflow.
- **CRUD-058** Dropdowns use `.form-select`; checkboxes are boxed in `.field-control-panel field-control-panel-checkbox`.

### M. Line-Item Conformance  [txn]  (Invoice gold standard — see `docs/spec-core.md#12-line-item-grid-specification-the-detail-grid`)

- **LINE-001** Line items render inside a **named tab** using the shared `form-tab-*` skeleton.
- **LINE-002** An **add-row-to-bottom** button sits at the grid's top-right (`invoice-add-row-button`) with a `data-tooltip` (no native `title`); clicking it appends a row.
- **LINE-003** Each row has **insert-below, insert-above, delete** controls on **both** the left and right sides (`invoice-grid-action-group` / `invoice-grid-action`), each with a tooltip.
- **LINE-004** An ordered **`No.` column** (`invoice-grid-row-number`, bound to `item_no`) renumbers 1-based after insert/delete/reorder.
- **LINE-005** Edit mode: the active row's editable cells are whitish (`var(--app-editable)` / `invoice-grid-editable-cell`) and non-editable cells are cream (`var(--app-readonly)` / `invoice-grid-readonly-cell` via `.invoice-grid-readonly-input`); text, checkbox, and dropdown cell types all follow this. The active-row CSS selector includes this form's id.
- **LINE-006** The LoV button is its **own column** (`invoice-grid-lookup`); where a line needs a date, the date-picker is its **own column** too — neither is crammed into a data cell.
- **LINE-007** Required line columns show a leading **red asterisk** (`invoice-grid-required-star`).
- **LINE-008** View mode shows **alternating row shades** (`:nth-child(even)` → `var(--app-central-grid-alt-surface)`) and disables row selection/active highlighting.
- **LINE-009** Invalid cells show the **red box** (`invoice-grid-cell-invalid`) with a tooltip-style message via `window.appTooltips`; no separate error summary. *(Visual checks in LINE-005/008/009 may be `MANUAL (developer)`.)*

## 4. Per-Form Test Plan Template

```markdown
# <Form> Test Plan  (spec: <frozen-spec-tag>)

## 0. Test artifact location
- Per-form tests: tests/forms/<FormName>/<form-name>-<test-purpose>.spec.js
- Shared reusable CRUD/style tests: tests/shared/
- Coverage report: tests/forms/<FormName>/coverage-report.md

## 1. Applicable universal contract
CRUD-001..009 (toolbar), CRUD-010..014 (perms), CRUD-015..020 (LoV), ...

## 2. Business requirements -> tests
| BR id | Business rule | Test case(s) | CRUD overlap | Status |
|-------|---------------|--------------|--------------|--------|
| BR-XX-001 | ... | TC-XX-001 | ... | Not run |

## 3. Test case detail
### TC-XX-001  (proves BR-XX-001)
Pre: ...
Steps: ...
Expect: ...

## 4. Negative / edge cases
- ...

## 5. Coverage gate
- [ ] every BR has >=1 TC
- [ ] every TC passes
- [ ] every applicable CRUD-### passes
```

## 5. Test Sub-Agent Instructions

Use this when a Test sub-agent is spawned after a form build.

### Inputs

- Frozen `<form>_form_specs.md` sections 3 and 6.
- This `docs/testing-contract.md`.
- Built artifact surface: routes, handlers, field/control ids, grid column names.

### Method

1. Enumerate every `BR-<form>-###` from the frozen spec and every applicable `CRUD-###`.
2. Reuse shared CRUD/style base tests from `tests/shared/`; do not rewrite common behavior per form.
3. Author only form-specific business-rule tests under `tests/forms/<FormName>/`.
4. Skip `MANUAL (developer)` items but list them in `coverage-report.md`.
5. Run `dotnet build` plus the targeted suite. Style checks use `dotnet build` plus visual/style-auditor pass, not the full E2E suite.
6. Emit/update `coverage-report.md`.

### Rules

- Source of truth is the frozen spec plus this contract, not builder reasoning.
- Any `BR` or applicable `CRUD` id without a passing test is a coverage gap.
- On a change request, patch only tests whose `BR/CRUD` ids changed, then run the full form suite as regression.
- Per-form test plans reference these stable IDs rather than restating the universal contract.
- Functional items A-K run through the project's Playwright/integration path. Style items L use `dotnet build` plus a visual/style-auditor pass, not the full E2E suite.
