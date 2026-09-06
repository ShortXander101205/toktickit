# Skill: Form Engineering (Build & QA)

## Purpose & Scope
This playbook provides a unified workflow for building, refactoring, and verifying form user interfaces and interactions. Use this skill when:
- Creating a new form (e.g. Master or Transaction forms)
- Revising existing form fields, layouts, or event handlers
- Performing compliance reviews, QA checks, or regression testing on a form

## Inputs
- [spec-core.md](file:///{WORKSPACE_ROOT}/docs/spec-core.md) (single source of truth for design patterns and product rules)

## Step-by-Step Workflow

### 1. Structure the Layout
- Implement the standard form shell:
  - **Summary/Title Strip**: Shows form identity and current mode/status. To keep the separating line below from being too close to the text, the bottom padding of `.form-summary-strip` is set to `calc(0.16rem + 2px)` and the bottom padding of `.app-list-top-strip` is set to `calc(0.08rem + 2px)` (moving the line down by 2 pixels).
  - **Toolbar/Action Strip**: Hosts standard command buttons. A thin, semi-transparent light line (`border-top: 1px solid rgba(255, 255, 255, 0.18);` on `.form-toolbar-strip` and dialog toolbars) must separate this strip from the title strip on all forms, list views, and the 3 subforms with top buttons. The toolbar padding is set to exactly `2px` top and bottom (`padding-top: 2px; padding-bottom: 2px`) to ensure a compact, uniform button area. For dialog subforms, the dialog body top/left/right paddings are `0` and dialog headers have `border-bottom: none` to let the toolbar's `border-top` act as the visual separator line.
  - **Attribute/Value Header**: Dense field rows using **simple textboxes**, **shaded simple textboxes**, or **tabular textboxes** as specified.
  - **Tabbed content area** as needed.
- Design headers with responsive density rules:
  - **Simple textbox**: Displays label (no shading) above input. These can be laid out as 1, 2, 3, or 4 textboxes per row (occupying 100%, 50%, 33%, or 25% of the page width, respectively). Inputs and buttons are welded together with no gap, removing adjacent touching borders and rounding only the outer corners.
  - **Shaded simple textbox**: Displays label (shaded green `#afebb5`) above input. These can be laid out as 1, 2, 3, or 4 textboxes per row (occupying 100%, 50%, 33%, or 25% of the page width, respectively). The shaded label and input/button are welded vertically with zero gap, removing the top border of the input/button, and rounding only the bottom-outer corners.
  - **Tabular textbox**: Standalone cell with top-curved shaded heading, bottom-curved value textbox, and `3px` spacing gap between adjacent columns. The developer has full control of each textbox's width. They are responsive.
  - For validation errors on header textboxes (simple textboxes, shaded simple textboxes, and tabular textboxes): the input text color and border remain normal/default. Only the red validation message label is shown in the reserved error row/space below.
  - Up to 4 fields per row on wide viewports (compact/dense presentation).
  - Wrap gracefully to 2–3 fields on medium viewports.
  - Stack to 1 field per row on narrow/mobile screens (no horizontal page overflow).


### 2. Configure Form Fields
- **Dropdowns**: Use `.form-select` instead of `.form-control`. In grid layouts (such as `.standard-form-grid-4`), wrap the field-block in the `.equal-width-textbox` class to ensure the select control stretches to $100\%$ width.
- **Checkboxes**: Never leave checkboxes as standalone, unboxed inputs. Wrap them inside `.field-control-panel` and `.field-control-panel-checkbox` containers like so:
  ```html
  <div class="field-control-panel field-control-panel-checkbox">
      <div class="form-check mb-0">
          <input asp-for="Model.Property" class="form-check-input" />
      </div>
  </div>
  ```
  This ensures the checkbox has a consistent background, border, and height matching adjacent textboxes.
- **Welded Picker Buttons (LoV and Date Fields)**: Group text inputs and their picker buttons inside a `.lookup-editor` or `.date-entry` wrapper. Use Flexbox (`display: flex; gap: 0; align-items: stretch;`) to weld them together, remove adjacent touching borders, round only outer corners, and style borders in unison on input focus.
- **Line Items**: Subform grids must use a Tabulator container. In edit mode, read-only cells utilize flat cream-colored input boxes (`#fffceb`) with visible borders and no inner shadows (via `.invoice-grid-readonly-input`). Grid cell validation errors must apply a red border to the input box inside the cell. In view mode, all grid cells display in the default alternating white/gray background without cream coloring.
  - For every new line-item form, do not leave active-row color CSS scoped only to the invoice form. Add the new form id to the active-row selectors (for example `#receipt-form:not([data-is-read-only="true"]) ...`) or introduce a shared selector that covers the new form. Editable Tabulator columns must use `invoice-grid-editable-cell`; computed/read-only columns must use `invoice-grid-readonly-cell` and the `.invoice-grid-readonly-input` formatter.
  - Verify computed/read-only values and editable input values share the same vertical alignment. The read-only formatter must preserve `var(--app-control-height)` and center the value vertically so computed values do not sit slightly above typed values.
  - To prevent line items in View Mode from changing color or showing active row/cell styling when clicked/pressed:
    1. Set `selectableRows: false` in the Tabulator configuration to disable default row selection/highlighting.
    2. Restrict grid active row CSS rules (e.g., `.invoice-grid-active-row`) to forms that are not read-only: `#invoice-form:not([data-is-read-only="true"]) ...`.
    3. Add fallback CSS rules to force computed cells and inputs (`.invoice-grid-readonly-cell`, `.invoice-grid-readonly-input`) to remain transparent when in View Mode: `form[data-is-read-only="true"] ... { background: transparent !important; }`.
- Set explicit `data-type` attributes (e.g., `currency`, `date`, `text`) for formatting and alignment.
- Right-align and apply thousand separators to numeric business values (quantity, rate, amount, totals).
- Do not reformat identifiers, document numbers, or codes.
- Ensure read-only and system-computed fields are visually distinct from editable fields (using cream-colored backgrounds) only in edit mode. In view mode, all inputs must have a uniform whitish background.
- **Blur Validation Rule**: Ensure that invalid inputs for date, time, or number fields are simply blanked out on blur without displaying any immediate validation error messages. The validation error is only shown when the user explicitly triggers a save/submit action (or for reports, when the user clicks the filter button and a required field is empty).


### 3. Implement Mode Behavior and Dirty Guard
- Set the default mode to `View` for existing records. Switching to `Edit` must be explicit.
- Bind the action strip toolbar buttons based on context:
  - In `Create` and `Edit` modes, enable only `Save`, the dirty-state indicator, `Cancel Changes`, and `Copy` in the primary form action group. `Copy` remains disabled until copy behavior is implemented.
  - In `View` mode, enable only `Close`, `Create New`, `List View`, `Edit`, `Delete`, and `Print`, subject to permissions and form capability.
  - `Print` is currently enabled only for Invoice form view; keep it disabled on Customer, Product, Receipt, User, and Role form views.
  - `Save`, the dirty-state indicator, and `Cancel Changes` must only be visible/enabled in `Create` or `Edit` modes.
  - `Cancel Changes` uses an X SVG icon and a central confirmation dialog when dirty.
- Controls for unauthorized actions should remain visible but disabled.
- Wire a dirty-bit guard:
  - Intercept leave/cancel actions (`Cancel Changes`, `Close`, `New`, `List`, `Edit`, or clicking away) when the form has changes.
  - Prompt the user with a confirmation dialog.
  - Confirmed `Cancel Changes` in Create mode returns to that entity's list view.
  - Confirmed `Cancel Changes` in Edit mode reloads the current record in View mode from the database so the UI shows the last saved record.

### 4. Wire Line-Item Grids (If Applicable)
- **Conform to `docs/spec-core.md#12-line-item-grid-specification-the-detail-grid`** (the Invoice gold-standard nine rules) and reuse the `invoice-grid-*` / `.invoice-lines-panel` skeleton — do not re-author the grid. The rules below restate that contract; the contract is authoritative.
- Use a Tabulator-backed grid nested within a bounded container.
- **Grid and Table Headers Theme Compliance**: Ensure that all Tabulator grids or custom grid tables (such as Notes) use `var(--app-label-shaded-surface)` for header backgrounds with `0.825rem` font size and bold weight (`var(--app-font-weight-bold)`). Data rows must alternately be shaded using `var(--app-central-grid-alt-surface)`. Avoid hardcoded background gradients or static colors to guarantee correct dynamic styling when switching themes.
- Establish a complete border on all four sides of the grid panel.
- Implement standard row actions in this precise order:
  1. Insert Below
  2. Insert Above
  3. Delete Row
- Apply custom keyboard handlers (`Tab`/`Arrow` navigation) to match ERP grid density.
- Recalculate line and header totals immediately on cell edit, row insertion, or row deletion.

### 5. Enforce Server-Side Integrity
- Recalculate all read-only/derived fields (e.g., tax, totals) on the server side during the save transaction.
- Clear any model-state errors on derived or read-only fields before validating, preventing stale model-binding errors from blocking a corrected save attempt.
- Ensure the save action is executed as a single ACID transaction.
- Enforce optimistic concurrency using `rowversion` for existing records.

---

## Strict QA & Verification Checklist

Before completing any form changes, execute this verification protocol:

- [ ] **Visual Layout Compliance**: Form respects standard shell and theme spacing; a thin separating line and uniform 2px vertical padding are present on all button toolbars (including list views, report panels, and the 3 dialog subforms); attribute-value textboxes (simple textboxes, simple textboxes with shaded attributes, and tabular textboxes with curved shaded labels/curved inputs, 3px spacing, reserved error row) are rendered correctly; pager and grids are fully bounded with borders.
  - [ ] **Visual mode color-coding**: All header fields and total boxes are uniform whitish in view-only mode. Color-coding (cream for readonly/calculated fields, whitish for editable fields) is only displayed in edit mode.
- [ ] **Control Styling & Consistency**:
  - [ ] **Checkboxes**: All header grid checkboxes are wrapped in `.field-control-panel` to ensure they have boxed backgrounds and align vertically.
  - [ ] **Dropdowns**: Select fields use `.form-select` and stretch to $100\%$ width inside grid layouts.
  - [ ] **Welded Buttons**: Lookup and Date buttons are welded directly to inputs with zero gap and round only outer corners. Focus outlines cover the entire welded group.
- [ ] **Line Items**: Readonly cells in grids render with flat cream background styling (`#fffceb`) and no inner shadows *only in edit mode when a row is actively selected/edited*. In view mode, all cells show flat alternating zebra backgrounds and do not change background colors or highlight when clicked/focused (verifying that row selection is disabled and active styles are restricted). Validation errors apply a red border to the input box.
  - [ ] For new forms, active-row CSS includes the new form id (not only `#invoice-form`), editable columns carry `invoice-grid-editable-cell`, and computed/read-only columns carry `invoice-grid-readonly-cell` plus `.invoice-grid-readonly-input`.
  - [ ] Computed/read-only cell values align vertically with editable cell inputs in the same row.
  - [ ] **Buttons & Tooltips Theme Compliance**: Every button and tooltip conforms strictly to the active theme's color scheme. Custom buttons use `lookup-action-button` or `toolbar-action` classes instead of Bootstrap classes (e.g., `btn-primary`), and tooltips are wired via `data-tooltip` to support custom themed floating tooltips instead of native `title` tooltips.
  - [ ] **Dialog / Modal Header Height**: All dialog headers (confirm, info, warning, password, notes, change-logs) must use compact single-row padding (`0.38rem 1rem`). The title font must be `--app-font-size-summary` (0.96rem) at regular weight (`--app-font-weight-regular`, 400) — never bold, never a hard-coded larger size. No toolbar or action row is ever placed inside a dialog header strip.
  - [ ] **Centralized Confirmation and Alert Dialogs**: All alert messages and yes/no confirmations must utilize the central dialog engine (`window.appDialogs.info` for OK Only and `window.appDialogs.confirm` for Yes/No) instead of custom modal components or native browser alerts/confirms. These central dialogs display messages with right-justified buttons in the bottom footer after a thin horizontal separation border line.
  - [ ] **Login Form Compliance**: The Login form has its "Sign In" button placed in the top right toolbar strip after "Close" (using `toolbar-action-primary`, a key SVG icon, and `data-tooltip="เข้าสู่ระบบ"`), with a compact body and no body-level submit button. Pressing Enter inside the password field shifts focus to the Sign In button.
- [ ] **Formatting Pass**: Numbers are correctly right-aligned and formatted; IDs and codes are unformatted.
- [ ] **Blur Validation Rule Compliance**: Verify that entering invalid date/time/number values clears the inputs on blur with NO immediate validation error shown.
- [ ] **Dirty Bit Verification**: Modifying any field (header or line item) flags the form as dirty and blocks transitions without confirmation.
- [ ] **Toolbar Mode Verification**: View mode enables only Close, Create New, List View, Edit, Delete, and form-capable Print; Create/Edit modes enable only Save, dirty-state indicator, Cancel Changes, and disabled Copy. Copy remains disabled everywhere until implemented, and Print remains enabled only for Invoice view mode.
- [ ] **Cancel Changes Verification**: In Create mode, Cancel Changes returns to list after confirmation if dirty. In Edit mode, Cancel Changes returns to View mode for the same record and reloads the last-saved database values after confirmation if dirty.
- [ ] **Re-Save Regression Test (Critical)**:
  1. Open/create a record, input an invalid value (e.g. quantity `0`), and click Save.
  2. Confirm the save fails with a clear, user-visible validation error message.
  3. Correct the invalid value to a valid number.
  4. Save again. The save **must succeed** without being blocked by stale validation errors on derived/read-only fields.
- [ ] **Concurrency Test**: Attempt to edit the same record simultaneously in another context and verify that the optimistic concurrency check blocks overwrite and outputs clear reload/retry guidance.
- [ ] Test Coverage: Ensure associated automated integration tests (such as Playwright E2E suites) or unit tests pass successfully.


## 6. Building a New Form Checklist (Blueprint Checklist)

Use this checklist whenever you are developing a new form for a particular entity (e.g., "Receipt") to ensure complete alignment with all design, alignment, theme, and behavior specifications.

### Phase 1: Planning and Parameter Collection
Before writing code, gather and define:
- [ ] **Header Fields**: Identify all columns that reside in the header area.
- [ ] **Line Item Fields**: Identify all columns that reside in the nested line-items subform grid.
- [ ] **Field Roles**: Specify which fields are:
  - Required entries (requires red labels/markers).
  - Editable by the user.
  - System-generated or computed (read-only in Edit Mode, showing cream background `#fffceb`).
- [ ] **Foreign Keys & Lookups (LoVs)**: Identify fields referencing other models and register them to use the Modal Popup LoV window with appropriate callback mappings.
- [ ] **Date Fields**: Identify date fields to wire with popover date pickers.
- [ ] **Header Style Choice**: Choose whether header field layouts are formatted as:
  - **Simple textboxes** (no shading, 1–4 per row).
  - **Shaded simple textboxes** (label shaded, vertically welded with input, 1–4 per row).
  - **Tabular textboxes** (curved shaded label/input, developer-specified character widths, separated by 3px gap).
- [ ] **Enums & Dropdowns**: Identify enum fields in headers and grid columns to render using `.form-select`.
- [ ] **Standard Toolbar Buttons**: Define which standard buttons (Close, Save, New, List, Edit, Copy, Delete, Print, Cancel Changes, dirty-state indicator) should be active, ensuring mode-specific enablement, proper icons, and tooltips are wired.
- [ ] **Catalog & Permission Registration**: Plan the dot-notation permission names and register them in [AppPermissions.cs](file:///{WORKSPACE_ROOT}/Security/AppPermissions.cs) and [AppPermissionCatalog.cs](file:///{WORKSPACE_ROOT}/Security/AppPermissionCatalog.cs) under the correct parent menu module, so it syncs to the database.

### Phase 2: Implementation & Verification Checklist

#### 1. Header Field Styling
- [ ] Textbox styles (Simple, Shaded Simple, or Tabular) are correctly structured and welded with inputs or Date/LoV picker buttons.
- [ ] Adjacent welded datepicker or LoV search buttons have zero gap, rounded outer corners, and unified focus borders.
- [ ] Dropdowns use `.form-select` and expand to $100\%$ width using `.equal-width-textbox`.
- [ ] Checkboxes are boxed within `.field-control-panel` to align vertically and match input heights.
- [ ] Font weights and sizes match the standard hierarchy (`0.825rem` for labels/headers, `0.9rem` for inputs/cells).

#### 2. Mode Contrast (View Mode vs. Edit Mode)
- [ ] **View Mode**:
  - [ ] All header inputs, select fields, and totals are rendered with a uniform whitish background (`var(--app-editable)`).
  - [ ] Line-item grid rows have alternating white/gray zebra backgrounds with no cream shading.
  - [ ] Row selection is disabled (`selectableRows: false`) and active row/cell styles are prevented.
- [ ] **Edit Mode**:
  - [ ] Editable inputs have a whitish background (`var(--app-editable)`).
  - [ ] Calculated/disabled fields have cream shading (`var(--app-readonly)` or `#fffceb`).
  - [ ] Read-only columns in the active grid row are styled with cream backgrounds.

#### 3. Alignment and Formatting
- [ ] Numeric business fields (extended amounts, prices, quantities) are right-aligned.
- [ ] Thousand separators are applied to all numeric business values.
- [ ] Identifier/code fields are left-aligned and NOT reformatted as numbers.

#### 4. Subform Grid Controls (Tabulator)
- [ ] Grid panel has a fully bounded rounded outer border visible on all four sides.
- [ ] Sticky headers are active, and vertical scrolling is constrained internally (`max-height: 12rem`).
- [ ] Line rows include hidden persisted `Id` and ordered `item_no`; edit saves reconcile by line `Id` instead of deleting/reinserting unchanged rows.
- [ ] Row action buttons are grouped in a column in this exact order: `Insert Below` (tooltip `แทรกแถวล่าง`), `Insert Above` (tooltip `แทรกแถวบน`), and `Delete` (tooltip `ลบรายการนี้`).
- [ ] Keyboard navigation follows row-wise order (Tab/Enter moves left-to-right through editable cells/pickers, ArrowUp/Down navigates vertically).
- [ ] Advancing past the last cell of the last row automatically appends a new blank row.

#### 5. Navigation, Sidebar, and Dirty-Bit Guards
- [ ] Sidebar support strip (Notes / Attachments and Change Logs) is present on the right-hand side and loaded via `sharedForm?.wire({...})` — **reused, not rebuilt**, per [docs/spec-core.md#13-shared-notesattachments--change-log-specification](file:///{WORKSPACE_ROOT}/docs/spec-core.md#13-shared-notesattachments--change-log-specification) (entity + id, the seven shared handlers, `IChangeLogTrackedEntity`, toolbar flags).
- [ ] The toolbar form state indicator displays `✗` (dirty, orange `#b97700`) or `✓` (clean, green `#1e7f3a`) with Thai tooltips and is visible only in Create/Edit modes.
- [ ] Navigation/cancel buttons (Cancel Changes, Close, New, List View, Edit) trigger the unsaved-change confirmation warning if the form has modifications.
- [ ] Centralized modal dialogs (`window.appDialogs.info` and `window.appDialogs.confirm`) are reused for all OK Only alerts and Yes/No confirmations (e.g., delete confirmation).
- [ ] Saving triggers a loading spinner and displays the `กำลังบันทึก...` feedback state on the Save button.

#### 6. Validation Error Display
- [ ] Header validation errors show red messages in the reserved row/space directly below the textbox (input borders remain unchanged).
- [ ] Grid line-item validation errors mark cells with red borders (`.invoice-grid-cell-invalid`) and hover/focus tooltips (`data-tooltip`), with focus moving to the first invalid cell. No duplicate error list is shown at the bottom of the page.

#### 7. Catalog and Permission Registration
- [ ] **AppPermissions & AppPermissionCatalog Sync**: Verify that the form and its corresponding permission constants are registered in the code catalog and successfully seed into the database on startup.
- [ ] **Default Authorization Pass**: Verify that the new form default permissions are secure (not viewable by everyone except admin by default).

- [ ] **Voucher vs. List Mode**: Define whether the report is document-centric (Voucher Mode, e.g., print invoices) which renders as a vector PDF inline inside the iframe, or grid-centric which renders as paginated HTML.
- [ ] **No Warning Message**: Confirm that no layout-scaling warning messages are rendered in the report preview toolbar area.
- [ ] **Cache Prevention**: Confirm the report page model enforces `[ResponseCache]` header validation and client-side download requests append a timestamp cache-buster (`_t`) parameter.
- [ ] **ClosedXML Excel Export**: Confirm that Excel exports generate native, warning-free `.xlsx` sheets utilizing the `ClosedXML` workbook integration. Verify that numbers are right-aligned, dates are center-aligned, column widths are auto-adjusted, and header column names are translated.
- [ ] **Filter Template & Registry Mappings**: Verify report interactive filters are factored into separate partial views (e.g., `_Filters_InvoiceList.cshtml`) and registered in `ReportRegistry.cs`.
- [ ] **Collapsible Filter Drawer**: Confirm that filters are wrapped in a collapsible `<details class="report-filter-drawer" open>` container. The `<summary class="filter-drawer-header">` must render as a compact two-row header: row 1 shows the Thai title "ตัวกรองรายงาน" with a disclosure arrow (`.filter-drawer-title-row`); row 2 (`.filter-drawer-toolbar-row`) hosts the filter submit button. The title must use `--app-font-size-summary` at regular weight — NOT bold, NOT `--app-font-size-menu`.
- [ ] **Filter Submit Button in Summary Header**: Confirm that `#filterSubmitButton` is placed inside the `<summary>` element (in `.filter-drawer-toolbar-row`), **not** in the form body. It must use the standard light toolbar button style (`--app-lookup-surface` background, `--app-lookup-border` border, `--app-lookup-text` color) — same light-background / dark-icon appearance as every other toolbar button. It must use `toolbar-action toolbar-action-primary` classes, contain only a funnel SVG icon, carry a `data-tooltip`, include `onclick="event.stopPropagation();"` to prevent drawer toggle on click, and use `form="reportFilterForm"` to bind to the filter form.
- [ ] **Delayed Execution Placeholder**: Confirm that reports with interactive filters display a clean empty placeholder area (no Thai prompt text) before they are run.


### Addendum — header layout (simple vs tabular, uniformity)  [v2 hardening — added]
Non-grid header fields use one of two label-above cell types:
- **Simple** = N per row (usually 4). The default.
- **Tabular** = explicit approx char width per field, no per-row limit; for dense related bands (totals; contact strips). chars ~= legacy twips / 110.
Rules: default everything to a uniform N-per-row simple grid so columns align; reserve tabular for genuinely dense bands; don't mix simple + tabular within one row. **Checkboxes and Enum dropdowns use the same label-above cell and sit INLINE alongside textboxes — do not segregate them onto their own row.** Preserve legacy order/grouping and tab membership (from the legacy `Tab(n).Control(m)`).
