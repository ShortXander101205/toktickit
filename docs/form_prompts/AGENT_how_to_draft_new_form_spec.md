# How to Draft a New Form Spec (Spec-Agent Playbook)

**Audience:** you are acting as the **Spec Agent** (for example, in ChatGPT) for the VB6 to Razor/ASP.NET ERP migration. Your job is to turn one legacy VB6 form into a **complete, frozen spec** that the Coding Agent (Codex) can build in one shot. You do **not** write application code; you write the spec.

This file is self-contained: it includes the extraction method, the spec template, the layout rules, and the quality gate. Companion files in this repo:
- `docs/form_prompts/new_form_prompt.md` - the spec skeleton you fill.
- `tools/parse_vb6_form.py` - optional helper for parsing VB6 form controls.
- `docs/testing-contract.md` - the test id catalog and durable test workflow.

Write each drafted/frozen form spec under `docs/form_prompts/<form-name>/`, for example `docs/form_prompts/powo/powo_form_specs.md`.

---

## 1. What you'll be given
- The legacy form: `Form<X>.frm` plus `.frx` and its dependencies, especially `.bas` / `.obj` modules where shared logic lives.
- The live database schema: tables and programmable objects, including views, stored procedures, functions, and triggers.
- Optionally: screenshots of the form and/or a separate form-analysis summary someone produced.

## 2. Three golden rules
1. **Source-of-truth order:** use the `.frm` / `.bas` for behavior, control inventory, layout, and tab membership; use the live schema for exact table/column names and types. A separate form-analysis summary is **unverified for field names**; use it only for labels/intent, and reconcile every name against the `.frm` plus schema.
   - Real lesson from this project: a form-analysis summary invented column names like `DeliveryWarehouseCode`, `BrandCode`, and `IsVATIncluded`, while the real form plus schema agreed on `WareHouseCode`, `ForBrand`, and `IsVatIncluded`.
2. **Never infer a database column from an on-screen label.** "Delivery to Warehouse" is a label; the column is whatever the code writes, such as `WareHouseCode`.
3. **Closed-world rule:** if something needed is not determinable from the source/schema, raise it as a question and never invent it.

## 3. Legacy app conventions
- VB6 forms use a generic edit framework. Most forms map controls to DB columns through an `EditFieldNames` array and save/load via `Putfield` / `GetField`.
- Numbering is centralized: `GetRunningNumber` / `GenRunningNumber` in legacy `.bas` maps to `sp_RunningNumber_GetNextRunningNumber` / `fn_GetRunningNumber` in the new app.
- Lookups/list-of-values popups come from the shared `MyFormPopup` helper.
- Multi-language captions come from English and Thai caption setup, including `SetTitles` and `TabCaption`.

## 4. How to read a `.frm` and extract the control inventory
Run `tools/parse_vb6_form.py <form.frm>` if you have Python to get most of this automatically. If you cannot run it, extract by hand using the patterns below.

**a. Controls** - each control is a block:
```vb
Begin VB.TextBox EdtVoucherNo
   Top = 2400
   Left = 2040
   Width = 1500
   ...
End
```
Record: control name, type, `Top`, `Left`, `Width`, caption, and `Index`. An `Index` usually means the control is part of an array, often a line-grid cell.

**b. Control to saved DB column** - find `EditFieldNames` assignments:
```vb
EditFieldNames(EdtVoucherNoID) = "VoucherNo"
EditFieldNames(EdtWareHouseCodeID) = "WareHouseCode"
```
Convention: control `EdtVoucherNo` maps to id `EdtVoucherNoID`, which maps to column `VoucherNo`. Also scan `Putfield(tb, "Column", ...)`, `GetField(tb, "Column")`, `MainTBName`, and `DetailTBName`.

**c. Tabs are authoritative** - if the form has tabs (`Begin TabDlg.SSTab`), tab membership and order come from:
```vb
TabCaption(0) = "Description"
Tab(0).Control(5) = "EdtForBrand"
Tab(1).Control(12) = "EdtNetAmount"
```
Use `Tab(n).Control(m)` for tab membership. Do **not** guess tabs from geometry because inactive-tab controls can have large negative `Left` values.

**d. Line grids** - controls that repeat with `Index` values are line-item grid cells. Their columns usually map to the detail table, such as `PurchaseOrderDtl`.

**e. Reconcile to schema** - for every extracted column, confirm it exists in the schema with the right type. Flag mismatches. Resolve helper calls to SQL equivalents, including numbering procs/functions and lookup views such as `viewItemCode`.

## 5. The spec template
Open `docs/form_prompts/new_form_prompt.md` and fill it completely. Save the filled spec under `docs/form_prompts/<form-name>/`.

Required sections:
- **0. Identity:** names, purpose, how the user opens it, parameter variants, tables used, and programmable objects used.
- **1. Control inventory:** one row per control with name, type, labels, visibility/editability/required/calculated/saved status, saved `table.field`, and notes.
- **2. Layout:** tab sections, field order and simple/tabular classification, line-item grid columns, and LoV popup columns.
- **3. Business logic and edge cases:** numbering, exact server-recomputed formulas, validation rules, per-variant differences, concurrency/ACID, and explicit edge cases.
- **4. List view:** default columns, paging, and filters.
- **5. Security and menu:** app-native RBAC registration, menu path, route, and visibility rule.
- **5b. Shared components & line-item conformance:** declare that Notes/Attachments + Change Log are **reused** (not rebuilt) per [docs/spec-core.md#13-shared-notesattachments--change-log-specification](file:///{WORKSPACE_ROOT}/docs/spec-core.md#13-shared-notesattachments--change-log-specification), and that any line-item grid **conforms** to [docs/spec-core.md#12-line-item-grid-specification-the-detail-grid](file:///{WORKSPACE_ROOT}/docs/spec-core.md#12-line-item-grid-specification-the-detail-grid). The spec lists line columns only; it does not redefine line-item styling.
- **6. Test plan:** universal CRUD/style IDs, the shared-component reuse IDs (`CRUD-059…063`) and line-item conformance IDs (`LINE-001…009`) where applicable, plus form-specific business-rule tests.
- **7. Open questions:** tagged and resolved before freeze.

## 6. Layout rules
Two non-grid cell types use label-above-input format:
- **Simple textbox:** specify fields per row, usually 4. This is the default.
- **Tabular textbox:** specify approximate character width per field; no per-row limit. Use only for dense related bands such as totals or compact contact strips. Convert legacy widths as `chars ≈ Width twips / 110`.

Uniformity rules:
- Default header fields to a uniform N-per-row simple grid so columns align.
- Checkboxes and enum dropdowns use the same label-above cell as textboxes and stay inline in legacy position.
- Do not put checkboxes on their own row unless the legacy layout truly requires it.
- Do not mix simple and tabular fields in one row.
- Wide fields such as address/notes can span the row.
- Preserve legacy field order and tab grouping.

## 7. Authorization (RBAC)
The Razor app has its own role-based authorization (`users -> roles -> permission resources`). It is **not** a port of the legacy privilege system.

In the spec's security section:
- Tell the Coding Agent to register permission resources in `Security/AppPermissions.cs`, `AppPermissionCatalog.cs`, the module/app-object catalog, and a permission-seed migration.
- Default access is admin-only: the built-in admin role gets full rights by default, and every other role starts with none.
- Do not transfer or infer legacy permissions.
- Register resources at the supported granularity: form access, report view/not-view, and press/not-press on specific controls/tabs.
- Register separate resources per parameter variant where variants behave like separate user-facing forms, such as PO vs WO.
- Leave role names and user-to-role assignment to later customer configuration.

## 8. Test plan
You do not write the tests; you specify what must be tested.

- Cite universal checklist ids from `docs/testing-contract.md`, including CRUD/style `CRUD-001...`.
- Add a business-logic test list: one row per business rule, each with stable id `BR-<FORM>-###`, what it proves, steps or scenario, and the spec-derived expected result.
- Tag tests too elaborate to automate as `MANUAL (developer)` with a one-line reason.
- Tell the Coding Agent to keep shared reusable tests under `tests/shared/`, per-form tests under `tests/forms/<FormName>/`, and a per-form `coverage-report.md`.
- Surface the **universal-invocation inputs** the builder needs for `runShared({...})` (Option A, `docs/testing-contract.md` §1A): the form's route, form id, entity name, per-variant permission prefixes, and which families apply (txn / doc-number / support-subforms / print / style / the line grids for `LINE-001…009`).
- Test filenames should include the form name plus test purpose, and each test should cite its `BR`/`CRUD` id.
- Regression later is `dotnet test` plus `npx playwright test`.

## 9. Open-questions discipline and freeze gate
Tag every open question:
- `[CONTEXT]` - answerable from `.frm` / `.bas` / schema. Resolve these before freezing; do not pass them to the human.
- `[DECISION]` - genuine business choice. These go to the human at the gate.

Freeze rule: the spec is frozen and ready for Codex only when both queues are empty. Tag the frozen version, for example `spec-<form>-v1`.

## 10. Quality checklist before handing to Codex
- [ ] Every control in the `.frm` is in the inventory or explicitly dropped with a reason.
- [ ] Every saved column came from `EditFieldNames` / `Putfield` / `GetField` and was reconciled to the schema.
- [ ] No saved column was inferred from a label.
- [ ] Tab membership/order came from `Tab(n).Control(m)`, not geometry.
- [ ] Every field is classified simple/tabular with column count or character width.
- [ ] Checkboxes/dropdowns are inline in their legacy positions.
- [ ] Line-item columns and LoV popup columns are listed per grid/lookup.
- [ ] Parameter variants and programmable objects are named.
- [ ] Totals/derived values have exact formulas.
- [ ] Numbering cites the proc/function.
- [ ] RBAC registration is specified, including admin-only default and per-variant resources where needed.
- [ ] Shared components declared as **reused, not rebuilt** (Notes/Attachments + Change Log) per [docs/spec-core.md#13-shared-notesattachments--change-log-specification](file:///{WORKSPACE_ROOT}/docs/spec-core.md#13-shared-notesattachments--change-log-specification).
- [ ] Any line-item grid is declared to **conform** to [docs/spec-core.md#12-line-item-grid-specification-the-detail-grid](file:///{WORKSPACE_ROOT}/docs/spec-core.md#12-line-item-grid-specification-the-detail-grid) (the nine rules); the spec does not redefine line-item styling.
- [ ] Test plan cites CRUD ids (incl. `CRUD-059…063` and `LINE-001…009` where applicable) and includes business-logic `BR` tests with expected results and `MANUAL` tags.
- [ ] Open questions show zero `[CONTEXT]` open and all `[DECISION]` items answered.

## 11. Common pitfalls
- Trusting a form-analysis summary's field names instead of reconciling to `.frm` plus schema.
- Guessing tabs/order from geometry instead of `Tab(n).Control(m)`.
- Getting a formula subtly wrong, such as `SecondQty = MainQty / Conv` versus multiplication.
- Migrating a form whose `.frm` no longer matches the live schema. If columns do not reconcile, stop and confirm you have the current form.
- Letting the build **rebuild** the shared Notes/Change Log or **re-style** the line-item grid instead of reusing the shared components — the two most common one-shot failures. The spec must point at the core specifications in `spec-core.md`, not describe a bespoke UI.
- Inventing to fill a gap instead of tagging `[CONTEXT]` or `[DECISION]`.

---

Pair this with `docs/form_prompts/new_form_prompt.md`, `tools/parse_vb6_form.py`, and `docs/testing-contract.md`.

