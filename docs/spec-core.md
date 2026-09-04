# Spec Core

## 1. Purpose
This repository is a reusable ERP-style Razor Pages template for legacy migration work.
The baseline app is an Invoice App with maintainable shared patterns that can scale across many forms.

## 2. Scope Baseline
- Modules in active baseline:
  - Home
  - Masters (Products, Customers)
  - Transactions (Invoices)
  - Administration (Users, Roles, Permissions, Configuration)
- Shared list framework is the standard for model lists and lookup/LoV flows.
- Invoice supports header + line items + computed totals.

## 3. Technical Baseline
- ASP.NET Core Razor Pages
- C#
- EF Core
- SQL Server 2025 Developer Edition in Docker for the restored `mct_standard` development baseline
- Bootstrap UI
- ASP.NET Core Identity authentication
- Policy-based authorization (model/control/report permissions)

## 4. Non-Negotiable Product Rules
- Use surrogate `Id` keys for business tables and FK relationships.
- Use shared list/form conventions across modules.
- Existing records open in `View` mode by default; `Edit` is explicit.
- Numeric business values are right-aligned and display with thousand separators.
- Identifier/code fields are not reformatted as numeric display values.
- For unauthorized controls, UI is generally visible but disabled; server-side enforcement is mandatory.
- Failed saves must always show clear user-visible errors.
- Existing-record edits require optimistic concurrency (`rowversion`) handling.
- Form save requests are ACID units of work.
- Keep implementation practical and maintainable; favor explicit, readable code over excessive generic abstractions.
- For ERP models, favor reusable conventions that scale well across future modules.

## 5. Shared List and LoV Contract
- One central list framework for model list + LoV mode.
- Supports remote paging/sorting/filtering, per-list definitions, and row PK return.
- LoV selection returns the row's stable unique key plus the row payload exposed by the list definition. The caller decides which display/snapshot fields to copy and must re-resolve authoritative values server-side before save when data integrity matters.
- Report filters may accept wildcard/pattern text such as `C*`; report filter textboxes must not be forced to match one unique LoV key unless the report spec explicitly requires an exact entity.
- Shared defaults:
  - visible rows: model list `11`, LoV `8`
  - page sizes: `25`, `50`, `100`
  - default page size: `50`
- Grid panel must show a full, bounded, rounded border on all sides (including right edge).

## 6. Shared Form Contract
- Standard shell includes:
  - summary/title strip
  - toolbar/action strip
  - attribute/value header area
  - tabbed content sections as needed
- Shared toolbar behavior:
  - Existing records open in `View`; `Create` and `Edit` modes are explicit.
  - In `Create` or `Edit` mode, only `Save`, the dirty-state indicator, `Cancel Changes`, and `Copy` may be enabled/visible in the primary action group. `Copy` remains visible but disabled until copy behavior is implemented.
  - In `View` mode, only `Close`, `New`, `List`, `Edit`, `Delete`, and `Print` may be enabled according to permissions and form capability. `Print` is currently enabled only for Invoice form view and disabled for all other form views.
  - `Save` and the dirty-state indicator are only visible in `Create` or `Edit`.
  - `Cancel Changes` is visible/enabled only in `Create` or `Edit`.
  - Unauthorized controls should remain visible but disabled unless the surrounding pattern explicitly hides them.
- Dirty-bit guard:
  - unsaved-change confirmation on leave/cancel actions (`Cancel Changes`, `Close`, `New`, `List`, `Edit`, navigation transitions)
  - `Cancel Changes` uses the central confirmation dialog when dirty. If confirmed in `Create`, return to the entity list. If confirmed in `Edit`, reload the current record in `View` mode from the database so the UI shows last-saved values.
- Line-item save reliability:
  - editable inputs are the source of truth for validation
  - computed/read-only totals and snapshots are server-derived and recalculated on save
  - stale model-binding errors on derived/read-only fields must not block a corrected re-save attempt
  - transactional headers and line-item tables use hidden integer `Id` primary keys for shared form infrastructure and reconciliation; legacy voucher/code fields remain visible business keys and should be kept as unique alternate keys where required
  - every line-item form has `item_no` as the ordered display/resequence column; invoice and receipt lines enforce voucher number + `item_no` uniqueness as the legacy/reporting key
  - editing a persisted line-item form must reconcile rows by hidden line `Id`: update existing rows, insert new rows, delete removed rows, and resequence `item_no` from the posted display order instead of deleting and reinserting all rows
- Centralized support subforms — **Notes / Attachments** and **Change Log** — are shared infrastructure. Every new form **reuses** them by wiring its entity type + persisted id (entity implements `IChangeLogTrackedEntity`; `ModelName = nameof(Entity)` + `RecordId = id`; the shared toolbar buttons, `sharedForm.wire(...)`, and the shared page handlers). New forms must **not** rebuild the notes/log dialog, JavaScript, or CSS. Enforcement detail: see [Section 13](#13-shared-notesattachments--change-log-specification).

## 7. Localization and Text
- Thai is the baseline display language for current project behavior.
- Shared captions/messages are centralized; avoid scattered hardcoded duplicates.
- Treat UTF-8 as the required encoding for application source files and display-text files (especially `.cshtml`, `.cs`, `.js`, `.css`, `.json`, `.md`, and SQL files).
- When touching files that contain Thai text, preserve encoding carefully and verify literal Thai text to prevent mojibake/corrupt characters.
- Do not rewrite existing Thai display text unless required; confirm edited text remains valid Thai.

## 8. Documentation Contract
- This file is the only product behavior source of truth.
- Skill docs define execution workflow/checklists and must not introduce independent product rules.
- `docs/progress-log.md` tracks completed work.
- `docs/open-questions.md` tracks unresolved decisions.
- Historical materials are stored in `docs/deadwood/`.

## 9. Spec-Driven Engineering Contract
- Implementation of any view or behavior (e.g., Customer, Product, Invoice, User Roles) must map to explicit, testable criteria defined in the specs.
- Test suites (automated or exploratory) serve as the ultimate verification that the spec has been fulfilled.
- A feature is not considered complete until its corresponding test contract passes successfully.

## 10. Attribute-Value Header Field Styles
- Three official styles are supported for form header attribute-value textboxes:
  - **Simple textbox**: Displays the field label (no shading) above the input control. These can be laid out as 1, 2, 3, or 4 textboxes per row (occupying 100%, 50%, 33%, or 25% of the page width, respectively). They are responsive, welding the input control and any action buttons (e.g., Date picker, LoV search) together with no gap, removing adjacent touching borders and rounding only the outer corners.
  - **Shaded simple textbox**: Displays the field label (shaded green `#afebb5`) above the input control. These can be laid out as 1, 2, 3, or 4 textboxes per row (occupying 100%, 50%, 33%, or 25% of the page width, respectively). The shaded label and input/button are welded vertically with zero gap, removing the top border of the input/button, and rounding only the bottom-outer corners.
  - **Tabular textbox**: Displays a standalone, curved shaded attribute heading and a curved shaded value textbox of the exact same width directly underneath. The developer has full control of each textbox's width. They are responsive.
- Spacing: Tabular textboxes must have exactly `3px` of horizontal spacing between adjacent boxes to maintain grid layout, and can wrap responsively on narrower screens.
- Spacing on Validation: A dedicated vertical space (error row) is reserved directly below the value textbox. If a validation error is active, the red error text appears in this reserved row without shifting or misaligning adjacent textboxes.
- Validation Styling: For validation errors on header textboxes (simple textboxes, shaded simple textboxes, and tabular textboxes), the value textbox border and input text color do not change to red; they remain normal/default. Only the validation error message label below the textboxes is shown in red. However, this does not apply to subform line items, where validation errors in the tabular grid cells retain their red border/background styling.
- Blur Validation Rule: When an invalid date, time, or number field is entered during general data entry, on blur the control simply blanks out the input value with NO immediate validation error message. The validation error is only shown when the user triggers a save/submit action (or for reports, when the user clicks the filter button and a required field is empty).
- Theme Generalization: Styles generalize to all themes (e.g., Zen Green, Business Blue) where the shapes and spacings remain identical and only the color tokens change.
- Dropdown Controls: Dropdown fields use `.form-select` instead of `.form-control` and must match standard textboxes in control height, borders, background, and width. Within grid layouts (such as `.standard-form-grid-4`), they must utilize the `.equal-width-textbox` class to stretch to $100\%$ of their grid cell.
- Checkbox Controls: Checkbox inputs in form headers must never render as standalone, unboxed inputs. They must always be wrapped in a `.field-control-panel` and `.field-control-panel-checkbox` container inside the `.field-block-value`. This container matches the height (`var(--app-control-height)`), borders, and editable background (`var(--app-editable)`) of standard textboxes to maintain horizontal grid alignment and row-height consistency.
- Welded Picker Controls (Textboxes with Buttons):
  - Fields with lookup (LoV) search buttons or datepicker buttons must be wrapped in a `.lookup-editor` or `.date-entry` flexbox container (`display: flex; gap: 0; align-items: stretch;`).
  - Inputs and buttons are welded side-by-side with no gap, removing adjacent touching borders and rounding only the outer corners of the group (left corners for inputs, right corners for buttons).
  - Focus outlines must style the input and button borders in unison using `--app-input-focus-border` when the input is active.
- Line Item Fields: Cells in the Tabulator subform grid are styled distinctly from header fields. Read-only calculated cells (such as product names or extended prices) must use flat cream-colored (`#fffceb`) inputs with borders but no inner shadow (via `.invoice-grid-readonly-input`). Validation error styles on line item grid cells apply a red border to the input within the cell itself, rather than using a reserved message row below.
- Line-item computed cells must refresh immediately in both Create and Edit mode when a dependent editable cell changes; users must not have to save before seeing recalculated visible values such as receipt still-remain amounts.
- View Mode vs. Edit Mode Color-Coding:
  - Header Fields & Totals: When a form is in view mode (`data-is-read-only="true"`), all input textboxes, select controls, and total fields are styled uniformly using the whitish background color (`var(--app-editable)`). The two-color feedback (whitish for editable fields, cream `var(--app-readonly)` for read-only/calculated fields) is only shown in edit mode to guide user interaction.
  - Subform Grids / Line Items: In view-only mode, all line item cells (including read-only cells) are styled in the default editable color (whitish color with alternating light and dark-overlay zebra backgrounds). In edit mode, when a row is actively being edited, its read-only/calculated cells are styled with a cream background (`var(--app-readonly)`) to distinguish them from the active cell being edited (which shows as whitish when entering input).
  - New line-item forms that reuse the shared `.invoice-lines-panel`/`.invoice-grid-*` styling must explicitly add their form id to the active-row CSS selectors (for example `#receipt-form:not([data-is-read-only="true"]) ...`) or use an equivalent shared selector. Editable Tabulator columns must carry `invoice-grid-editable-cell`; computed/read-only columns must carry `invoice-grid-readonly-cell` and render through `.invoice-grid-readonly-input`. This prevents new forms from losing the whitish-vs-cream edit-mode contrast.
  - Computed/read-only grid values must use the same control height and vertical centering as editable inputs (`var(--app-control-height)` and centered flex alignment) so data baselines line up across editable and computed columns.
  - Preventing Grid Click/Active Color Bleed in View Mode:
    1. Grid configuration must explicitly disable row selection highlighting (e.g. set `selectableRows: false` in Tabulator options) to prevent click/press states from applying background tints.
    2. Grid-active row CSS styles (like `.tabulator-row.invoice-grid-active-row`) must be restricted to forms that are not read-only: `#invoice-form:not([data-is-read-only="true"]) ...`.
    3. Explicit CSS fallbacks must force computed/readonly cells and inputs (`.invoice-grid-readonly-cell`, `.invoice-grid-readonly-input`) to remain transparent when the form is read-only: `form[data-is-read-only="true"] ... { background: transparent !important; }`.
- **Line-item grid conformance:** every form with a line-item grid must conform to the Invoice gold standard — the nine line-item rules (named tab; add-row-to-bottom button; per-row insert-above/insert-below/delete on both sides; ordered `No.` column; edit-mode whitish-editable vs cream-readonly across text/checkbox/dropdown; LoV and date-picker each as their own column; required-column red asterisk; view-mode alternating shades; red-box cell validation with tooltip) — reusing the `invoice-grid-*` / `.invoice-lines-panel` skeleton. Enforcement detail and class map: see [Section 12](#12-line-item-grid-specification-the-detail-grid) (annotated source: [line-item-section.pdf](file:///{WORKSPACE_ROOT}/docs/ui/line-item-section.pdf)).


## 11. Standard Form & List Blueprint
This blueprint defines the standard layout, spacing, colors, typography, and interaction parameters for all forms and lists.

### A. Dimensions, Scrolling & Viewport Containment
- **Form View**:
  - The form is contained inside a centered draggable workspace panel (`.workspace-panel.workspace-panel-draggable`) on a page-shell flex background (`.page-shell`).
  - Fields stack responsively: stacked vertically in 1 column on narrow screens (<768px), 2 columns on medium screens (768px–1200px), and up to 4 columns on wide screens (>1200px) using the `.standard-form-grid-4` layout.
  - Header textboxes must map to one of the three styles defined in Section 10: **Simple Textbox** (unshaded, 1–4 columns), **Shaded Simple Textbox** (shaded, 1–4 columns), or **Tabular Textbox** (shaded, developer-controlled character/rem widths).
- **List View**:
  - Formatted as a bounded rounded container with sticky header. Default visible row count is exactly `11`.
- **LoV Popup Forms**:
  - Popup defaults to a width of `920px` and a height of `475px` unless a list-specific override is defined. Default visible row count is exactly `8`.
  - Implements modal-like focus tracking (closes automatically on parent page unload, focuses existing popup instead of duplicates).
- **Line Item Grid Scrolling**:
  - Vertically scrolls internally within a bounded panel, keeping header rows sticky. Height is capped at `12rem` (`--line-items-panel-max-height: 12rem`).
  - Horizontal scrolling is strictly localized to the subform grid container (no full-page horizontal scrolling).

### B. Typography & Font Scale
- **Font Family**: Reuses the shared system/Google Font stack defined in `--app-font-family-base`, keeping Thai text completely legible.
- **Scale Hierarchy**:
  - Form/List Titles: ~18px
  - Section Headers & Tab Labels: ~16px
  - Field Labels & Tabulator Column Headers: `0.825rem` (~13px)
  - Inputs & Tabulator Data Cells: `0.9rem` (~14px)
  - Validation Messages & Helper Text: `0.8rem` (~12.8px)
- **Weight**: Textbox labels and table headers must use bold weight (`var(--app-font-weight-bold)`).

### C. Color Schemes & Themes (Zen Green vs. Business Blue)
- **Color Tokenization**: All visual elements (borders, headers, highlights) are driven dynamically by theme variables (no hardcoded color values).
- **Tabulator and Dialog Grid Headers Theme Compliance**: Whenever Tabulator grids or central dialog tables (such as Notes) are implemented, their column header background must use the theme variable `var(--app-label-shaded-surface)` with a font size of `0.825rem` and bold weight (`var(--app-font-weight-bold)`). Data rows must alternately be shaded using `var(--app-central-grid-alt-surface)`. Hardcoded colors or standalone gradients must be avoided to ensure layouts dynamically adapt when switching themes.
- **Buttons and Tooltips Theme Compliance**: Every button and tooltip must adhere strictly to the active theme's colors. Custom action and search buttons in forms, lookups, and reporting panels must use `lookup-action-button` or `toolbar-action` classes instead of generic Bootstrap styles (like `btn-primary`), and must use the `data-tooltip` attribute instead of the native HTML `title` attribute to show custom themed tooltips.
- **Shaded Attribute Labels**:
  - Zen Green theme: shaded label surface is `#afebb5` (`--app-label-shaded-surface`), with border `#7ea483`.
  - Business Blue theme: shaded label surface is `#b8d3ec` (`--app-label-shaded-surface`), with border `#7ea0c4`.
- **Top Button Control Strips**: Any standalone region or panel that contains button controls at the top (such as the Notes editor block) must shade that toolbar strip using the form header shading color (`var(--app-form-header-surface)`). It must use exactly `3px` of top and bottom padding for the shaded area, followed by a separator border, after which the inputs or textboxes are placed. The top corners of this shaded strip must have a border-radius matching its parent container.
- **Dialog & Modal Headers**: Must match the theme form header surface (`var(--app-form-header-surface)`). All dialog headers (confirm, info, warning, password, notes, change-logs) use a **compact single-row height** matching the form summary strip — padding is `0.38rem 1rem` (vertical × horizontal). The title font must use `--app-font-size-summary` (0.96rem) at regular weight (`--app-font-weight-regular`, 400), never bold and never a larger hard-coded size. Dialogs do not have a second toolbar row in their header; any inner toolbar or action area belongs in the dialog body. Failing to follow this makes dialogs appear disproportionately tall compared to the rest of the UI.
- **Centralized Info and Confirmation Dialogs**: All alert messages and yes/no confirmations must utilize the central dialog engine `window.appDialogs.info` (for "OK Only" panels) and `window.appDialogs.confirm` (for "Yes/No" confirmations) instead of creating custom modal components or native browser alerts/confirms. These central dialogs display messages with right-justified buttons in the bottom footer after a thin horizontal separation border line. Standardized message variables under `window.appMessages.formState` (e.g. `deleteTitle`, `deleteMessage`, `unsavedTitle`, `unsavedMessage`) should be used whenever verifying actions like record deletion or navigating away from dirty forms.
- **View Mode vs. Edit Mode Contrast**:
  - *View Mode*: All textboxes, select controls, and totals fields are styled with a uniform whitish background (`var(--app-editable)`). Grid cell selection is disabled (`selectableRows: false`), and active row highlighting is restricted to prevent click highlights.
  - *Edit Mode*: Whitish background (`var(--app-editable)`) for active/editable inputs. Cream background (`var(--app-readonly)` or `#fffceb`) for calculated/disabled inputs (both in headers and inside line-item grids).

### D. Controls (Checkboxes & Dropdowns)
- **Checkboxes**: Must be wrapped in `.field-control-panel` and `.field-control-panel-checkbox` to enforce borders, editable background, and standard height (`var(--app-control-height)`).
- **Dropdowns**: Use `.form-select` instead of `.form-control`, matching standard textboxes in height and borders. Use `.equal-width-textbox` to fill grids.

### E. Form Buttons & Toolbar Layout
The form action toolbar (`_FormToolbar.cshtml`) hosts standard action buttons.
- **Separating Line & Toolbar Height**: A thin, semi-transparent light line (`border-top: 1px solid rgba(255, 255, 255, 0.18);` on `.form-toolbar-strip` and dialog toolbars) must separate the top form title strip from the toolbar buttons row in all forms, list views, and the 2 central subforms (change logs and notes / attachments).
  - **Background Color**: As a global standard, all areas with top control buttons must have a background strip colored with `var(--app-form-header-surface)` so that they remain visually uniform when switching themes.
  - To ensure the line is not too close to the title text, the bottom padding of the form title strip (`.form-summary-strip`) is set to `calc(0.16rem + 2px)` and the bottom padding of the list title strip (`.app-list-top-strip`) is set to `calc(0.08rem + 2px)`.
  - To make the button strip height shorter and uniform, the toolbar strip (`.form-toolbar-strip`, `.app-list-toolbar-strip`, and the 2 dialog toolbars) must have exactly `2px` of vertical padding/margins above and below the buttons (i.e. `padding-top: 2px` and `padding-bottom: 2px`).
  - Dialog subforms must match this exact design, where the dialog body top/left/right paddings are set to `0` to allow the toolbar strip to sit flush against the dialog header, and dialog headers have `border-bottom: none` to let the toolbar's `border-top` act as the visual separator line. This ensures a consistent, crisp structural separation throughout the UI.
- **Close (`ปิด`)**: Neutral style button (`toolbar-action-neutral`). Tooltip/label "ปิด". Uses dirty check if modified.
- **Save (`บันทึก`)**: Primary style button (`toolbar-action-primary`). Tooltip/label "บันทึก". Only visible in Create/Edit. Shows loading spinner and text `กำลังบันทึก...` during save.
- **Cancel Changes (`ยกเลิกการแก้ไข`)**: Neutral style button. Uses an X SVG icon. Visible/enabled only in Create/Edit. If the form is dirty, asks for confirmation through `window.appDialogs.confirm`; confirmed Create mode navigates to the entity list, while confirmed Edit mode reloads the same record in View mode from the database.
- **New (`สร้างใหม่`)**: Neutral style button. Tooltip/label "สร้างใหม่".
- **List (`รายการ`)**: Neutral style button. Tooltip/label "รายการ".
- **Edit (`แก้ไข`)**: Neutral style button. Tooltip/label "แก้ไข".
- **Copy (`คัดลอก`)**: Support style button. Tooltip/label "คัดลอก". Visible but disabled until copy behavior is implemented.
- **Delete (`ลบ`)**: Danger style button (`toolbar-action-danger`). Tooltip/label "ลบ".
- **Print (`พิมพ์`)**: Support style button. Tooltip/label "พิมพ์". Currently enabled only on Invoice form view when the user has print permission; disabled on Customer, Product, Receipt, User, and Role form views.

**Login Page Button & Keyboard Flow Standard**:
- To maintain consistency with standard toolbar-based forms, the Login form must not utilize a large full-width "Sign In" button in the form body.
- Instead, the "Sign In" action is placed in the top right toolbar strip (after the "Close" button) as a primary toolbar-action button (`toolbar-action-primary`) using a key/lock SVG icon and a themed floating tooltip (`data-tooltip="เข้าสู่ระบบ"`).
- Removing the body-level button allows for a reduced, compact form layout height.
- To facilitate keyboard-only navigation, typing Enter inside the password field must programmatically set focus to the toolbar "Sign In" button rather than triggering an immediate form submit. The user can then press Enter a second time to execute the login, ensuring clear interactive feedback.

### F. Dirty-Bit Guard & Form State Indicator
- **State Indicator**: Renders `✗` (orange/dirty, `#b97700`) or `✓` (green/clean, `#1e7f3a`) in the toolbar with a Thai tooltip. It is visible only in Create/Edit modes.
- **Leave Warning**: Warns the user on leaving or canceling (via Cancel Changes, close, new, list view, edit navigation, menu, or page-navigation) if the form has modifications.

### G. Support Sidebar Buttons (Right Column)
- Change Logs and Notes / Attachments are aligned in a right-hand sidebar. Wired globally via `sharedForm?.wire({...})` using centralized AJAX loaders and modal dialogue boxes.
- The shared Notes dialog is the only attachments UI. It supports one optional inline attached file per note. The edit area must include Notes text (required), Closed, an optional Attached File picker, and an edit-area toolbar download button enabled only after the note has a saved attachment. The grid shows the attached file name as a compact no-wrap column after Closed. Do not add or wire a standalone Attachments toolbar button or central form.

### H. Validation Error Display
- **Headers**: Validation error displays as a red label below the value textbox. Input border and text remain default (no red outline).
- **Line Items**: Invalid cells show persistent red outlines (`.invoice-grid-cell-invalid`) and hover/focus tooltips (`data-tooltip`) showing the error message. No secondary summary list.

### I. Tabulator Line-Item Grids
- **Action Buttons**: Grouped in an action column: Insert Below, Insert Above, Delete in that order. Tooltips are localized: `แทรกแถวล่าง`, `แทรกแถวบน`, `ลบรายการนี้`.
- **Keyboard Navigation**: Tab/Enter advances left-to-right through actions, editable cells, and picker buttons. Appends a new blank row when tabbing past the last cell of the last row. ArrowUp/ArrowDown move vertically.

### J. Report Viewer and Preview Modes
- **Native PDF Previews**: All reports render natively as vector-precise, server-generated PDF streams inline inside the page's preview `<iframe>` with page mode thumbnail bar hidden by default (`#pagemode=none`). This ensures exact WYSIWYG parity between what the user sees on screen and what is sent to the printer.
- **Redundant Actions Removed**: Shell-level "Print" and "Export PDF" buttons are removed since the browser's native PDF iframe plugin provides these actions directly.
- **Delayed Execution**: Reports featuring interactive filter parameters do not run automatically on initial page load (saving database and rendering performance). On initial load, a clean empty placeholder area is displayed (with no Thai prompt text). Report execution starts when the user clicks the filter submit button. Report pages without interactive filters (such as direct invoice print previews) load immediately.
- **Template-Based Report Filters**: Report-specific filter inputs are separated into dynamic partial views (located in `Pages/Shared/` and named e.g., `_Filters_InvoiceList.cshtml`) mapping to the report definition's `FilterTemplate` property in `ReportRegistry.cs`.
- **Collapsible Filter Drawer**: Report filter panels must be wrapped in a collapsible `<details class="report-filter-drawer" open>` container. The `.filter-drawer-header` (`<summary>` element) serves as an interactive toggle and is styled as a compact two-row header strip: row 1 shows the Thai title "ตัวกรองรายงาน" with a disclosure arrow; row 2 (`.filter-drawer-toolbar-row`) hosts the filter submit button. The title font must use `--app-font-size-summary` (0.96rem) at regular weight — matching the form summary strip text above — not bold and not a smaller menu-size font. The drawer styling inherits theme colors via `--app-form-header-surface` and `--app-central-panel-surface`.
- **Filter Submit Button in Summary Header**: The filter submit button (`#filterSubmitButton`, class `toolbar-action toolbar-action-primary`) lives inside the `<summary>` element in the `.filter-drawer-toolbar-row` div, **not** inside the form body. It uses the standard light toolbar button style (`--app-lookup-surface` background, `--app-lookup-border` border, `--app-lookup-text` color) — identical to every other toolbar action button, with a light background and darker border/icon. It contains only a custom SVG funnel icon and relies on the `data-tooltip="กรอง→แสดงผล"` floating tooltip for its label. `onclick="event.stopPropagation();"` prevents the click from toggling the drawer collapse. The `form="reportFilterForm"` attribute links it to the filter form outside the summary element.
- **Excel Export**: Report Excel downloads generate native, warning-free `.xlsx` files using `ClosedXML` with structured horizontal columns. Column headers are translated to localized Thai names. Numeric fields are right-aligned with commas and decimal places (`#,##0.00`), date fields are center-aligned (`dd/MM/yyyy`), and column widths are auto-adjusted to prevent text clipping. Downloads are triggered via a hidden iframe to prevent page navigation and avoid browser `beforeunload` warnings.
- **Cache Prevention**: The report viewer page must prevent all server-side and client-side caching of report content, previews, exports, and PDF streams (using Cache-Control headers and client-side query string cache busters) to ensure that the exported files and previews contain current, non-stale data.
- **Auto-Growing Grid Rows**: To prevent data truncation in report previews, all row bands (like `DataBand`) and their constituent columns/text objects (`TextObject`) in `.frx` layout templates must have `CanGrow="true"` enabled. This ensures that text wraps normally and the row height dynamically expands to fit the text content.


## 12. Line-Item Grid Specification (The Detail Grid)

Every form with a line-item (detail) grid must conform to the Invoice gold standard (reusing the `.invoice-lines-panel` + `invoice-grid-*` skeleton). The nine required behaviors are:

1. **Named Tab Layout**: Line items live in a named tab pane: `.form-tab-shell` › `ul.form-tab-nav` › `button.nav-link` (e.g. `@L["LineTab.Title"]`).
2. **Add Button**: Add-row-to-bottom button at the top-right (`.invoice-add-row-button`) with a themed `data-tooltip`.
3. **Per-Row Action Buttons**: Action groups (`.invoice-grid-action-group`) on both sides of each row containing exactly: **Insert Below, Insert Above, and Delete** with localized tooltips (`แทรกแถวล่าง`, `แทรกแถวบน`, `ลบรายการนี้`).
4. **Ordered "No." Column**: Resequenced 1-based display column (`field: "itemNo"`, persisted as `item_no`).
5. **Edit-Mode Contrast**: Editable cells use `var(--app-editable)` (whitish) and `invoice-grid-editable-cell`; read-only/calculated cells use `var(--app-readonly)` (`#fffceb`) and `invoice-grid-readonly-cell`. Row selection highlight is disabled in View mode.
6. **LoV and Date-Picker Columns**: Dedicated lookup buttons (e.g., `.invoice-grid-lookup`) and date-picker columns are placed as their own columns, not embedded inside code/description inputs.
7. **Asterisk for Required Fields**: Required columns display `<span class="invoice-grid-requiredStar">*</span>`.
8. **View-Mode Zebra Striping**: Alternating row shades using `var(--app-central-grid-alt-surface)`.
9. **Red-Box Cell Validation**: Invalid cells get `.invoice-grid-cell-invalid` (red border shadow and hover tooltip message).

### Data Binding and Reconciliation
* Serialize rows to hidden inputs `<div id="<entity>LineFieldsHost" hidden>` before submit.
* Reconcile using the hidden `.Id` primary key. The server performs update/insert/delete and resequences `item_no` based on the posted display order.
* Server re-evaluates all calculations (extended price, VAT, grand totals); client-side calculations are verified but never trusted.


## 13. Shared Notes/Attachments & Change Log Specification

Every new form must reuse the central shared Notes / Attachments and Change Log panels rather than rebuilding them.

### Integration Requirements
1. **Toolbar Integration**: Include `<partial name="_FormToolbar" model="Model.Toolbar" />` (renders Note & Change Log buttons).
2. **Javascript Wiring**: Call `sharedForm.wire({...})` in the page scripts to bind the form ID and the base URL.
3. **Page Handlers**: Implement these 7 page handlers verbatim (using `ModelName = nameof(Entity)` and `RecordId`):
   - `OnGetChangeLogsAsync(int id)`
   - `OnGetNotesAsync(int id)`
   - `OnGetNoteAsync(int id, int noteId)`
   - `OnPostSaveNoteAsync([FromForm] SaveNoteRequest? request)`
   - `OnPostToggleNoteClosedAsync([FromBody] ToggleNoteClosedRequest? request)`
   - `OnPostDeleteNoteAsync([FromBody] DeleteNoteRequest? request)`
   - `OnGetDownloadNoteAttachmentAsync(int id, int noteId)`
4. **Auditable Entity**: The C# entity class must implement `IChangeLogTrackedEntity` to trigger automatic history writing in `DbContext.SaveChangesAsync`.
5. **Toolbar Flags**: Set `CanViewNotes` and `CanViewChangeLogs` in `SetToolbar()` (disabled in Create mode, enabled in View/Edit mode based on permissions).



