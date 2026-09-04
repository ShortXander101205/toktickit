# Skill: New Form Development

## Purpose & Scope
Use this playbook when implementing a new ERP form from a filled spec file that follows `docs/form_prompts/new_form_prompt.md`.

The goal is repeatability: once the agent understands the invoice form, it should be able to build the next form with the same architecture, file locations, function naming pattern, styling, lookup behavior, permissions, and verification gates.

This skill is for full new artifacts, not small field changes. For edits to an existing form, use `skill-form-engineering.md` first.

## Required Inputs

Before coding, confirm that a filled form spec exists, normally named:

- `docs/<entity>_form_specs.md`

The spec must provide:

- Header table and line table names.
- Header fields, captions, field types, required flags, and editable/computed status.
- Line item grid columns in final display order, including Thai captions.
- Lookup mappings and callback targets.
- Numbering rule.
- List view columns and search filters.
- Permission names and parent menu/module.
- Menu placement: parent menu, display caption, route, sort order, and whether the item appears in the main navigation or is reached from another form/list/action.
- Support subforms: whether Change Log and Notes / Attachments are enabled; if enabled, they must be wired to the entity record and verified.
- Toolbar capability notes: whether Print is supported for this form. Copy is not implemented in the template and must remain disabled. Cancel Changes and dirty-state indicator follow the standard mode contract.
- Business rules and server-side recalculation rules.
- Required tests or example scenarios.

If the spec is incomplete, make the smallest reasonable assumption only for obvious template defaults. Ask the user before inventing database fields, permission names, accounting rules, or lookup filters.

## Required Reading Order

Load only what is needed for the pass:

1. `AGENTS.md`
2. The filled spec file (e.g. `docs/receipt_form_specs.md`)
3. `docs/form_prompts/new_form_prompt.md`
4. `docs/spec-core.md` (System specifications, line-item grid contract, and shared components reuse)
5. `docs/style-contract.md` (UI style contract)
6. `docs/skills/skill-form-engineering.md` (QA playbook)
7. `docs/testing-contract.md` (Testing rules)


## Baseline Code to Inspect

Always inspect the invoice implementation and the closest existing sibling form before scaffolding:

- `Pages/Invoices/Edit.cshtml`
- `Pages/Invoices/Edit.cshtml.cs`
- `wwwroot/js/pages/invoice.js`
- `Models/Invoice*.cs`
- `Data/AppDbContext.cs`
- `ListViews/AppListRegistry.cs`
- `Security/AppPermissions.cs`
- `Security/AppPermissionCatalog.cs`
- `wwwroot/css/site.css`

For a receipt-like transactional form, also inspect:

- `Pages/Receipts/Edit.cshtml`
- `Pages/Receipts/Edit.cshtml.cs`
- `wwwroot/js/pages/receipt.js`
- `Models/Receipt*.cs`

## Build Order

Follow this order exactly unless the existing codebase forces a small adjustment. Do not jump straight to Razor/JavaScript before the data, captions, and registration map are understood.

### 1. Convert The Spec Into A Work Map

Before editing code, write a short implementation map for yourself:

- Entity name, route, form id, page model name, JS module name.
- Header model and line model.
- Final header field order.
- Final line grid column order.
- Editable fields versus computed/read-only fields.
- Lookup inputs, lookup buttons, hidden id fields, and callback function names.
- Server-calculated fields that must never trust posted values.
- List registration and permission registration points.
- Tests to add or update.
- Support subform handlers and toolbar availability for Change Log and Notes / Attachments.
- Toolbar mode behavior: View mode enables only Close, New, List, Edit, Delete, and supported Print; Create/Edit enables only Save, dirty-state indicator, Cancel Changes, and disabled Copy.

Use invoice naming patterns whenever possible:

- Form id: `<entity>-form`
- Grid id: `<entity>LinesGrid`
- JS entry point: `window.<entity>Form` or existing local pattern.
- Lookup receiver: `window.<entity><Target>Lookup.receive...`
- Hidden line host: `#<entity>LineFieldsHost`
- Page folder: `Pages/<PluralEntity>/`
- JS file: `wwwroot/js/pages/<entity>.js`

Stop condition for this step:

- You can name every file that will be created or edited.
- You know which fields are stored, which are lookup snapshots, and which are computed.
- You know which lookup/list registrations and permissions are required.

### 2. Define Header Layout Semantics

Before writing markup, classify each header row from the spec using the official textbox vocabulary below. These terms have precise meanings.

#### Simple Textbox

Use when the spec says "Simple Textbox".

- Markup pattern: label above input, no shaded label surface.
- Desktop columns per row: exactly the spec value, normally 1, 2, 3, or 4.
- Responsive behavior: wraps to fewer columns on medium/narrow widths; no page-level horizontal scroll.
- LoV/date controls: input and button must be welded in `.lookup-editor` or `.date-entry` with zero gap.
- Typical use: normal header fields such as document number, date, customer code, customer name, reference number.

#### Shaded Simple Textbox

Use when the spec says "Shaded Simple Textbox".

- Markup pattern: shaded label above input, vertically welded to the input/control.
- Desktop columns per row: exactly the spec value, normally 1, 2, 3, or 4.
- The shaded label uses theme tokens through existing shared classes; do not hardcode green/blue.
- LoV/date controls remain welded inside the value area.
- Typical use: header fields that need stronger label grouping while still participating in a grid.

#### Tabular Textbox

Use when the spec says "Tabular Textbox".

- Markup pattern: standalone small cell with curved shaded heading and curved value textbox directly below.
- Width: each field must use the custom `ch` or `rem` width from the spec.
- Horizontal spacing: exactly `3px` between adjacent tabular boxes.
- Alignment: commonly used for totals and compact numeric summary fields.
- Validation: reserve the error row below the value so errors do not shift neighboring boxes.

Universal header rules:

- Editable fields use the editable/view surface according to mode.
- Computed/read-only fields use the readonly cream surface only in edit mode; view mode is uniform whitish.
- Header validation shows only the red validation label below the control. Do not turn header input text or borders red.
- Dropdowns use `.form-select`, not `.form-control`.
- Checkboxes must be boxed inside `.field-control-panel field-control-panel-checkbox`.

Stop condition for this step:

- Every header field has a style, row number, desktop column/span or explicit width, required flag, editability, and control type.

### 3. Data Model And Migration

Create or update:

- Header model in `Models/`.
- Line model in `Models/`.
- Any lookup/view rows needed for filtered line-item LoVs.
- `DbSet<>` entries and model configuration in `Data/AppDbContext.cs`.
- Decimal precision/column types for all money and quantity fields.
- Rowversion concurrency token.
- Required indexes and foreign keys.
- EF migration for schema, views, numbering seed rows, menu/module/object seed data, and permission seed data as appropriate.

Rules:

- Give every header and line-item entity a hidden integer `Id` primary key for shared infrastructure. Keep legacy business keys (codes, voucher numbers, transaction numbers) as unique alternate keys when the migrated schema requires them.
- Line-item tables must include `item_no` as the ordered display/resequence column. For voucher-style transactions, add the legacy/reporting unique key using voucher number + `item_no` when that is the existing business identity.
- Use explicit decimal precision. Do not leave EF decimal warnings.
- Keep fresh database creation and upgrade paths equivalent. If a SQL view is introduced, update both the original module migration when appropriate and add a forward migration for existing databases.
- Server-side computed values must be stored only after recalculation during save.

Artifact checklist:

- `Models/<Entity>.cs`
- `Models/<Entity>LineItem.cs` or existing naming convention
- lookup/view row models, if needed
- `Data/AppDbContext.cs`
- `Migrations/<timestamp>_<Name>.cs`
- migration designer/snapshot files when generated by EF

Verification before moving on:

- The project compiles conceptually with all model references resolvable.
- Migration includes tables, indexes, FKs, rowversion, precision, seed rows, and SQL views required by the spec.
- No decimal field is left without explicit precision or SQL type.

### 4. Captions And Resources

Create or update caption classes/resource locations following the invoice pattern.

Ensure every visible caption from the spec is represented:

- Page title and toolbar text/tooltips.
- Header labels.
- Line grid headers.
- Lookup/list column captions.
- Validation and confirmation messages.

Do not hardcode Thai captions in JavaScript unless the existing pattern for that page passes localized strings from Razor into the JS config.

Artifact checklist:

- caption/resource class for the form
- resource entries or strongly typed caption members matching existing project pattern
- any list/lookup caption entries
- validation/confirmation message captions

Verification before moving on:

- Every visible label in the spec has one source.
- Razor can pass line grid captions into JavaScript through the page config.

### 5. Register Security, Menu, And App Object Names

Register the new module early so page scaffolding can reference final policy names and final navigation routes instead of placeholders.

Create or update:

- `Security/AppPermissions.cs`
- `Security/AppPermissionCatalog.cs`
- module/app object seed locations used by the existing app
- menu/navigation layout files such as `Pages/Shared/_Layout.cshtml`, when the spec says the item appears in the main menu
- page authorization policy attributes or conventions

Rules:

- Permission names use the dot-notation prefix from the spec, such as `receipt.view`, `receipt.create`, `receipt.edit`, `receipt.delete`.
- Default access should be administrator-only unless the spec explicitly grants broader roles.
- Do not invent role grants.
- Every form must have a documented way to open it. If the spec does not provide menu placement, stop and ask whether the form should be a main menu item, a child action from another form/list, or an internal/support-only page.
- If it is a main menu item, add the menu link in the correct parent menu and guard visibility with the form's view permission.

Verification before moving on:

- Every page action has a permission constant.
- The form can be discovered by the provisioning/menu sync path.
- The user can reach the form through the documented route/menu/action, and unauthorized users cannot see the menu item.

### 6. Register Lists And Lookups

Create or update:

- `ListViews/AppListRegistry.cs`
- list contract/projection classes if needed
- list script support only if the new lookup requires a shared capability not already present

Rules:

- Main list columns follow the spec order.
- Lookup popup columns follow the spec order.
- Hidden filters must be explicitly registered for dependent LoVs.
- Dependent lookup rule: a child lookup must be filtered by its parent context when the business rule requires it. Example: a receipt invoice LoV must show only invoices for the selected customer with remaining balance.

Verification before moving on:

- Main list route and lookup route names are known.
- Lookup row payload contains every field needed by the JavaScript callback.
- Hidden filters cannot accidentally appear as visible columns.

### 7. Razor Page Scaffold

Create `Pages/<PluralEntity>/Edit.cshtml` first, then create `Pages/<PluralEntity>/Edit.cshtml.cs`.

The Razor page must include:

- Standard summary/title strip.
- Standard toolbar/action strip.
  - Must use the shared toolbar mode contract:
    - Create/Edit mode: Save, dirty-state indicator, Cancel Changes, and disabled Copy only.
    - View mode: Close, Create New, List View, Edit, Delete, and supported Print only.
    - Copy remains disabled until implemented.
    - Print is enabled only when the form explicitly supports printing; currently Invoice form view is the only enabled standard print form.
    - Cancel Changes uses an X SVG icon and must be wired through the dirty guard.
- Form id matching the JS/CSS selectors.
- Header fields using only approved textbox styles: simple, shaded simple, or tabular.
- Welded lookup/date controls with `.lookup-editor` or `.date-entry`.
- Hidden id fields for LoV references.
- Support subforms where the entity supports notes / attachments or change logs.
- Line item Tabulator container and hidden line field host.
- Script initialization block passing URLs, read-only mode, translations, initial lines, and lookup config.
- `<script src="~/js/pages/<entity>.js" asp-append-version="true"></script>` so browser caching does not hide JS changes.

Style rules:

- Use `toolbar-action` / `lookup-action-button`.
- Use `data-tooltip`; never use native `title` on interactive controls.
- Do not add page-local button colors or Bootstrap action button classes for ERP actions.

Artifact checklist:

- `Pages/<PluralEntity>/Edit.cshtml`
- `Pages/<PluralEntity>/Edit.cshtml.cs`
- optional page folder files that match the invoice pattern

Verification before moving on:

- Form id matches the JavaScript and CSS plan.
- Header markup matches the layout semantics from Step 2.
- Script config contains all URLs, captions, read-only flags, initial line data, and lookup filters needed by JavaScript.
- Page script uses `asp-append-version="true"`.

### 8. Form JavaScript

Create `wwwroot/js/pages/<entity>.js` following `invoice.js` structure.

Implement these named sections or equivalent local functions:

- config normalization and DOM lookup.
- `initializeGrid`.
- column definitions in the exact spec order.
- lookup button formatter/cell handlers.
- lookup callback receiver functions.
- code-on-blur lookup resolution for typed codes.
- row insert/delete actions in standard order.
- live row recalculation.
- live header total recalculation.
- row validation and first-error focus.
- line serialization into hidden inputs before submit.
- dirty-state notification to `shared-form.js`.
- Cancel Changes behavior:
  - if clean in Create mode, navigate to the entity list;
  - if clean in Edit mode, navigate/reload the same record in View mode;
  - if dirty, use the central confirmation dialog before either navigation;
  - after confirmed Edit cancel, reload from the database rather than preserving unsaved client state.
- read-only/view mode guards.

Line grid styling requirements — **conform to `docs/spec-core.md#12-line-item-grid-specification-the-detail-grid` (the nine line-item rules); reuse the invoice grid, do not re-author it:**

- The grid is **Tabulator** on the `.invoice-lines-panel` + `invoice-grid-*` skeleton (not the `.app-list-grid` list skeleton). Model `wwwroot/js/pages/<entity>.js` on `invoice.js` and reuse `insertLine`/`deleteLine`/`openLookupModal`/`applyLineValidationHighlights`.
- Named tab; add-row-to-bottom button top-right with `data-tooltip`; per-row insert-below/insert-above/delete groups on **both** sides; ordered `No.` column; LoV (and date-picker if needed) each as their **own** column; required columns show `invoice-grid-required-star`; view-mode alternating shades; invalid cells use `invoice-grid-cell-invalid` + `data-tooltip`.
- Editable columns must include `invoice-grid-editable-cell`.
- Computed/read-only columns must include `invoice-grid-readonly-cell`.
- Computed/read-only displayed values must use `.invoice-grid-readonly-input` or the shared formatter pattern.
- Active row CSS must apply to the new form id, not only `#invoice-form`.
- View mode must disable selection/highlighting and must not show cream computed-cell backgrounds.
- Computed and editable cell values must align vertically.

Artifact checklist:

- `wwwroot/js/pages/<entity>.js`
- any shared JS helper only if the behavior is genuinely reusable and already matches project style

Verification before moving on:

- `node --check wwwroot/js/pages/<entity>.js` passes.
- Grid columns are in the exact spec order.
- Every lookup button has a receiver callback.
- Hidden line serialization field names match the C# model binder.

### 9. Backend Page Model

Implement `Edit.cshtml.cs` with the same responsibilities as invoice:

- `OnGetAsync` loads existing records or initializes create mode defaults.
- `OnPostAsync` validates, recalculates, saves, and redirects/returns errors.
- Load lookup display fields from authoritative tables.
- Rebuild line display fields after validation errors so the page can re-render.
- Clear `ModelState` entries for server-computed fields before validation.
- Save header and lines in one ACID transaction.
- Lock numbering rows when assigning document numbers.
- Enforce optimistic concurrency for existing records.
- Prevent overposting by assigning server-owned fields explicitly.
- Reconcile posted line rows by hidden line `Id`: update rows whose ids remain, insert rows without ids, delete rows omitted from the post, and server-resequence `item_no` from the current display order. Do not delete/recreate all lines for ordinary edits.

Never rely on client-posted totals, balances, statuses, or other derived accounting values.

Artifact checklist:

- `Pages/<PluralEntity>/Edit.cshtml.cs`
- any service/helper only if the existing codebase uses that pattern for equivalent behavior

Verification before moving on:

- Create, load existing, save, validation failure, corrected re-save, delete, and concurrency paths are covered.
- Server recomputes every derived field named in the spec.
- Invalid or missing lookup ids cannot be saved just because a display code was posted.

### 10. Central Support Subforms

**REUSE, never rebuild.** Change Log and Notes / Attachments are central shared infrastructure (engine `wwwroot/js/shared-form.js`, buttons in `Pages/Shared/_FormToolbar.cshtml`, dialog CSS in `site.css`). Do **not** fork `shared-form.js`, recreate the notes/log dialog markup, or add page-local dialog CSS or a standalone Attachments button. Follow the requirements in [docs/spec-core.md#13-shared-notesattachments--change-log-specification](file:///{WORKSPACE_ROOT}/docs/spec-core.md#13-shared-notesattachments--change-log-specification) exactly. The feature breaks in a non-obvious way unless **all three layers** are in sync: (1) the entity implements `IChangeLogTrackedEntity` (else the change log is silently empty), (2) the seven handlers below have the **exact** names `shared-form.js` calls via `?handler=...` (else 404/405), and (3) `SetToolbar()` sets `CanViewNotes`/`CanViewChangeLogs = !IsCreateMode` (else the buttons stay disabled).

Wire the two central support forms for persisted records unless the spec explicitly says the entity does not support them:

- Change Log
- Notes / Attachments

Create or update the page model handlers expected by `wwwroot/js/shared-form.js` (copy them verbatim from `Pages/Customers/Edit.cshtml.cs`; change only the entity type / DbSet):

- `OnGetChangeLogsAsync(int id)`
- `OnGetNotesAsync(int id)`
- `OnGetNoteAsync(int id, int noteId)`
- `OnPostSaveNoteAsync([FromForm] SaveNoteRequest? request)` with optional `IFormFile? AttachedFile`
- `OnPostToggleNoteClosedAsync([FromBody] ToggleNoteClosedRequest? request)`
- `OnPostDeleteNoteAsync([FromBody] DeleteNoteRequest? request)`
- `OnGetDownloadNoteAttachmentAsync(int id, int noteId)`

Rules:

- Use `nameof(<Entity>)` as the `ModelName` for `ChangeLogEntry` and `NoteEntry`.
- Use the persisted entity id as `RecordId`.
- Disable these toolbar buttons in create mode; enable them for existing records according to view/edit permissions.
- View permission allows loading change logs, notes, and note attachment downloads.
- Edit permission allows creating/updating/deleting notes and uploading/replacing a note's optional attached file.
- Do not add a standalone Attachments toolbar button or central Attachments dialog. File attachment belongs inside the Notes dialog.
- If the entity implements `IChangeLogTrackedEntity`, verify create/edit/delete changes are actually written to `ChangeLogEntry`.

Artifact checklist:

- `Pages/<PluralEntity>/Edit.cshtml.cs` support handlers
- `SetToolbar()` / toolbar model enables `CanViewChangeLogs` and `CanViewNotes` for persisted records
- request DTOs for notes when not already shared

Verification before moving on:

- Existing record opens with the two toolbar buttons enabled when permissions allow.
- Change Log loads entries for the entity.
- Notes can be created, selected, edited, closed/reopened, deleted, and saved with an optional attached file.
- Note attachments can be uploaded/replaced through the Notes editor and downloaded through the Notes editor toolbar.
- Create mode disables support subforms until the record exists.

### 11. CSS And Shared Style Hooks

Prefer existing shared classes. Add CSS only when the new form needs a reusable hook.

Before adding new CSS, search `wwwroot/css/site.css` for the invoice and receipt patterns.

Required checks:

- No page-specific colors when a theme token exists.
- Form id included in active-row selectors if the selector is scoped.
- Grid borders visible on all four sides.
- Horizontal scroll contained inside the grid.
- Header controls do not overflow on narrow widths.
- Edit mode and view mode colors follow `docs/style-contract.md`.

Artifact checklist:

- `wwwroot/css/site.css`
- no page-local CSS unless the existing form pattern uses it

Verification before moving on:

- Active row selectors include the new form id if scoped.
- No new hardcoded theme colors are introduced.
- No native `title` tooltip or Bootstrap action button drift is introduced.

### 12. Tests And Verification

Add or update targeted tests for the new form. A new transaction form should normally have Playwright coverage for:

- Login and navigation to the new form.
- Create mode opens with expected toolbar state.
  - Create/Edit mode toolbar shows/enables only Save, dirty-state indicator, Cancel Changes, and disabled Copy.
  - View mode toolbar shows/enables only Close, Create New, List View, Edit, Delete, and supported Print.
  - Copy is disabled everywhere until implemented.
  - Print is disabled unless this form explicitly supports printing.
  - Cancel Changes returns Create mode to list and Edit mode to same-record View mode, with dirty confirmation when needed.
- Required header validation.
- Parent LoV typed-code lookup and popup selection.
- Dependent line LoV filtering.
- Line selection populates computed fields.
- Editable line fields update header totals.
- Over-limit or business-rule validation.
- Save succeeds.
- Existing record opens in view mode.
- Change Log and Notes / Attachments toolbar buttons are enabled for existing records and disabled in create mode.
- Notes / Attachments central form can perform its core actions for the new entity.
- **Shared-component reuse** (`CRUD-059…063`): the form uses the shared toolbar + `sharedForm.wire`, the seven handlers respond 200, `IChangeLogTrackedEntity` writes change-log rows, and no custom subform UI was introduced.
- **Line-item conformance** (`LINE-001…009`): the grid satisfies the nine line-item rules and reuses the `invoice-grid-*` classes.
- Edit mode changes mark dirty.
- Re-save after validation failure succeeds after correction.
- Delete or permission behavior if included in spec.

Run:

1. `dotnet build`
2. Targeted Playwright/unit tests for the form
3. Broader verification only when the change touches shared infrastructure

If normal `dotnet build` is blocked by a running app locking `bin\Debug`, use an alternate output folder, for example:

```powershell
dotnet build invoice_app_template.csproj -o .\bin\new-form-build
```

For LocalDB, EF, or browser-server checks that require access outside the sandbox, request elevated execution as described in `AGENTS.md`.

Artifact checklist:

- `test_<entity>.js` or the closest existing targeted test file
- updated test selectors only when necessary

Verification before moving on:

- Build passes.
- Targeted tests pass or the exact blocker is documented.
- Visual/style auditor pass is complete.

### 13. Documentation Handoff

Update:

- `docs/spec-core.md` if the work changes canonical behavior.
- The filled form spec if implementation discovered missing details.
- `docs/progress-log.md` with a concise dated entry.
- `docs/open-questions.md` if questions were opened or resolved.
- Relevant skill docs only when the reusable workflow changes.

Do not update `docs/deadwood/` unless explicitly requested.

## Completion Definition

A new form is not complete until:

- The filled spec maps clearly to implemented files.
- The form, list, lookups, permissions, numbering, and migrations are registered.
- Server-side recalculation and validation are implemented.
- UI style auditor checks pass.
- Targeted tests prove core create/edit/lookup/save behavior.
- Shared Notes/Change Log are **reused** (not rebuilt) per [docs/spec-core.md#13-shared-notesattachments--change-log-specification](file:///{WORKSPACE_ROOT}/docs/spec-core.md#13-shared-notesattachments--change-log-specification), and any line-item grid **conforms** to [docs/spec-core.md#12-line-item-grid-specification-the-detail-grid](file:///{WORKSPACE_ROOT}/docs/spec-core.md#12-line-item-grid-specification-the-detail-grid) (`CRUD-059…063` / `LINE-001…009` pass).
- Documentation handoff is current.


### Addendum — additional required steps  [v2 hardening — added]
- **Layout:** render the header per the spec's tab sections + field order + simple/tabular classes (see skill-form-engineering addendum).
- **Variants:** implement parameter-driven variants (e.g., PO vs WO) per spec section 0.
- **Permissions:** register RBAC resources per the skill-auth-permissions addendum (admin-only default, per-variant).
- **After build:** hand off to a minimal-context **Test sub-agent** (`docs/testing-contract.md` + spec section 6) and a **Style-review sub-agent** (style-contract + changed UI files only). See the multi-agent delegation guidelines in [AGENTS.md](file:///{WORKSPACE_ROOT}/AGENTS.md).
- **Tests:** keep shared reusable tests under `/tests/shared/` and per-form tests under `/tests/forms/<FormName>/` with descriptive form-name filenames; each test cites its `BR`/`CRUD` id and updates that form's `coverage-report.md`. The universal `CRUD`/`LINE` checks live **once** in `/tests/shared/` and are aimed at this form via a small `runShared({...})` invocation file in its folder (Option A — see `docs/testing-contract.md` §1A). If no harness exists yet, the **first** form also bootstraps `/tests/shared/` + the C# test project + the Playwright config.
- **PR report:** when done, open the PR and report it with a GitHub link + test summary (spec/Codex/total counts, manual count + developer-tested, automated pass count, notes).
- **Closed-world:** if the spec is silent on something needed, STOP and ask; never invent. If the one-shot build fails, append a `BUILD-FEEDBACK` note.
