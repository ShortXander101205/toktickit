# Style Contract

This is the mandatory UI compliance gate for new development and reviews.

Use this document before implementing or approving any form, list, lookup, report, dialog, toolbar, or grid change. `docs/spec-core.md` remains the full product source of truth; this file is the short enforcement checklist to prevent recurring style drift.

## 1. Buttons

- Form toolbar buttons must use the shared toolbar classes:
  - primary actions: `toolbar-action toolbar-action-primary`
  - neutral actions: `toolbar-action toolbar-action-neutral`
  - support actions: `toolbar-action toolbar-action-support`
  - danger actions: `toolbar-action toolbar-action-danger`
- Lookup, date, report filter, and compact search buttons must use `lookup-action-button` or the approved toolbar-action family.
- Do not use generic Bootstrap button classes such as `btn-primary`, `btn-secondary`, or `btn-outline-*` for custom ERP actions unless the existing shared component already wraps them intentionally.
- Buttons should use shared icons/SVG patterns already present in the template. Do not introduce page-local button color, padding, or border styles.

## 2. Tooltips

- Interactive controls must use `data-tooltip`.
- Do not use the native HTML `title` attribute on buttons, lookup triggers, date triggers, row actions, toolbar actions, or dialog actions.
- Tooltips must be rendered through the shared tooltip engine (`window.appTooltips`) and theme tokens (`--app-tooltip-surface`, `--app-tooltip-text`).
- Tooltip text should be concise Thai text matching the shared caption/resource wording.

## 3. Theme Tokens

- Use theme CSS variables for UI color and borders. Do not hardcode green, blue, gray gradients, or one-off RGB/RGBA colors for reusable UI pieces.
- Important tokens include:
  - `--app-form-header-surface`
  - `--app-label-shaded-surface`
  - `--app-central-grid-alt-surface`
  - `--app-lookup-surface`
  - `--app-lookup-border`
  - `--app-lookup-text`
  - `--app-input-focus-border`
  - `--app-tooltip-surface`
  - `--app-tooltip-text`

## 4. Toolbars and Top Button Strips

- Form, list, report, and dialog button strips must use the shared shaded strip treatment based on `var(--app-form-header-surface)`.
- The separating line between the title strip and button strip must be present.
- Toolbar strip vertical padding must remain compact and uniform: `2px` top and bottom for standard form/list/dialog toolbars.
- Standalone top control strips inside central dialogs, such as the Notes editor panel, must use the form-header surface and exactly `3px` top/bottom padding.

## 5. Dialogs

- OK-only alerts and yes/no confirmations must use the central dialog engine:
  - `window.appDialogs.info`
  - `window.appDialogs.confirm`
- Do not use native `alert`, native `confirm`, or custom one-off modal components for standard alerts/confirmations.
- Dialog headers must use `var(--app-form-header-surface)`, compact padding `0.38rem 1rem`, and `--app-font-size-summary` at regular weight.
- Dialog headers must not contain toolbar/action rows. Inner actions belong in the dialog body or footer.

## 6. Header Textboxes and Controls

- Use only the three approved header textbox styles:
  - Simple textbox
  - Shaded simple textbox
  - Tabular textbox
- Lookup and date inputs must be wrapped in `.lookup-editor` or `.date-entry` and welded to their trigger buttons with zero gap.
- Dropdowns must use `.form-select`, not `.form-control`.
- Header checkboxes must be wrapped in `.field-control-panel field-control-panel-checkbox`.
- Header validation errors must show only the red validation label below the field; do not turn header input borders or text red.

## 7. Tabulator and Dialog Tables

- Tabulator line-item grids and central dialog tables must use:
  - header background: `var(--app-label-shaded-surface)`
  - header font size: `0.825rem`
  - header font weight: `var(--app-font-weight-bold)`
  - data cell font size: `0.9rem`
  - alternate row background: `var(--app-central-grid-alt-surface)`
- Do not use default gray Tabulator headers, hardcoded gradients, or page-local table header colors.
- Grid panels must have complete rounded borders on all four sides, including the right edge.
- Horizontal scrolling must stay inside the grid panel, not the full page.

## 8. View/Edit Mode Color Rules

- View mode: header inputs, select controls, totals, and grid cells should use the uniform whitish view surface. Clicking grid rows must not introduce active/edit colors.
- Edit mode: editable fields use the whitish editable surface; read-only/calculated fields may use the cream read-only surface.
- Tabulator row selection highlighting must be disabled in view mode (`selectableRows: false` or equivalent guard).

## 9. Blur Validation

- Invalid date, time, or number input during normal data entry must blank on blur with no immediate validation message.
- Validation messages appear only on explicit save/submit/filter actions.

## 10. Conformance Auditing

Before completing any UI work, the implementation must be audited against this contract. For step-by-step audit guidelines, review tools, and reporting checklists, refer to the QA playbook in [skill-form-engineering.md](file:///{WORKSPACE_ROOT}/docs/skills/skill-form-engineering.md).
