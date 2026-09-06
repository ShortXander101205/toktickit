# new_form_prompt v2 — Form Spec Template (tightened)

Upgrade of the app's `new_form_prompt.md`. Same intent — a fill-in contract the Spec Agent (Claude) produces and the Coding Agent (Codex) consumes — with the sections the prior template under-specified now made **mandatory**: tab-section assignment, legacy field order, simple/tabular classification, line-item columns, LoV popup columns, parameter-driven variants, programmable-object usage, and a business-logic test list with manual-test tagging.

> Sources of truth (order): **(1)** the legacy `.frm`/`.frx`/`.bas`/`.obj` for behavior, control inventory, and layout order; **(2)** the live **schema** (tables + views + procs + functions + triggers) for exact names/types. If a form-analysis summary exists, treat its field names as **unverified** — reconcile against the `.frm` `EditFieldNames` map + schema. (Established in this project: the form-analysis md hallucinated field names; the `.frm` and schema agreed.)

---

## 0. Form identity  *(required)*
- `form_name_english`, `form_name_thai`
- `purpose`
- `how_user_opens_it` (menu path / launched from which form/action)
- `parameter_variants` — **NEW, required.** If one form serves multiple behaviors by launch parameter (e.g. `FormName`), list each variant, its parameter value, and what changes (tables, required fields, visible tabs/fields, validation). *(e.g. PO/WO form: regular PO vs Work Order; garment / material / accessories / spare-part types.)*
- `related_popups_or_child_forms`
- `tables_used` — header, line(s), and lookups
- `programmable_objects_used` — **NEW.** views / stored procs / functions / triggers the form reads or depends on (e.g. `viewItemCode`, `viewManufacturingOrder`, `fn_GetRunningNumber`, `sp_RunningNumber_GetNextRunningNumber`).
- `shared_components` — **NEW, required.** State whether **Change Log** and **Notes / Attachments** are enabled (default **yes** for any persisted entity). They are **central shared components and must be REUSED, not rebuilt** — the spec must not describe a custom notes/log UI. The build wires them per the requirements in [docs/spec-core.md#13-shared-notesattachments--change-log-specification](file:///{WORKSPACE_ROOT}/docs/spec-core.md#13-shared-notesattachments--change-log-specification) (entity implements `IChangeLogTrackedEntity`; `ModelName = nameof(Entity)`, `RecordId = id`; the seven shared handlers; toolbar flags). If an entity should NOT have them, say so explicitly with a reason.

## 1. Control inventory  *(required — one row per control)*
| control_name | type (label/textbox/checkbox/dropdown/button/grid…) | thai_label | english_label | visible? | editable? | required? | calculated? | saved? | saved_table.field | default/behavior | notes (formula, special handling) |

Rule: `saved_table.field` comes from the `.frm` `EditFieldNames`/`Putfield`/`GetField` map reconciled to the schema — **never** inferred from the on-screen label.

## 2. Layout  *(required — this is the section the old template was weakest on)*

### 2a. Tab sections  *(NEW, required)*
List tabs **in legacy order**, with the legacy caption and the controls/region each contains. Match the legacy `SSTab`.
```
Tab 0 "<caption>": <header fields / grid / region>
Tab 1 "<caption>": ...
```

### 2b. Field order + format per region  *(required)*
Within the header and each tab, list fields **in the same visual order as the legacy form** (top-to-bottom, left-to-right), each classified:
- **Simple textbox** — give fields-per-row (usually 4). Label above input.
- **Tabular textbox** — give an **approx character width** per field; no per-row limit. Use for dense related bands (totals: goods/discount/net/vat%/vat amt/amount due; or contact strips: code/name/email/phone/mobile/city/country).
- (Shaded simple / date / LoV / dropdown / checkbox as needed.) **Checkboxes and Enum dropdowns use the same label-above cell format as textboxes and sit inline within simple OR tabular rows — place them in their legacy position alongside textboxes; do NOT segregate them onto a separate row.**
Format per row:
```
Row N [simple, 4/row]:  F1 | F2 | F3 | F4
Row M [tabular]:        Fa (≈9ch) | Fb (≈18ch) | Fc (≈22ch)
```
Width conversion from legacy: `chars ≈ twips ÷ 110`.

### 2c. Line-item grid columns  *(NEW, required, per grid)*
For each line grid (there may be several — one per tab), list **columns in display order** with: header label, bound `table.field`, type, editable/computed, required, lookup (if any), width hint. Match legacy column order.

### 2d. LoV (lookup) popup columns  *(NEW, required, per lookup)*
For each lookup control, specify: the **source** (table/view), the **columns shown in the popup** (in order), the search/filter columns, the dependent-filter (parent scoping) if any, and which form fields each selected row **populates**.

### 2e. Line-item conformance  *(NEW, required when the form has a line grid)*
State that each line-item grid **conforms to [docs/spec-core.md#12-line-item-grid-specification-the-detail-grid](file:///{WORKSPACE_ROOT}/docs/spec-core.md#12-line-item-grid-specification-the-detail-grid)** (the Invoice gold standard) and reuses the `invoice-grid-*` / `.invoice-lines-panel` skeleton. **Do not redefine line-item styling here** — §2c lists only the columns; the contract owns the nine behaviors (named tab; add-row-to-bottom; per-row insert-above/below + delete on both sides; ordered `No.`; whitish-editable vs cream-readonly; LoV/date columns; required red asterisk; view-mode alternating shades; red-box cell validation). For each line column note only the **per-column** specifics: editable vs computed, cell type (text/checkbox/dropdown), LoV source, required flag.

## 3. Business logic & edge cases  *(required)*
- Numbering rule (cite the proc/fn, e.g. `sp_RunningNumber_GetNextRunningNumber`).
- Server-recomputed values (totals, amounts) — formula + the rule that posted values are ignored.
- Validation rules (required fields, conditional-required, ranges), and **per-variant** differences from §0.
- Concurrency, ACID scope, idempotency.
- Edge cases enumerated explicitly (empty line skip, all-empty reject, over-allocation, duplicate, stale edit, etc.) — do not leave to the coder's imagination.

## 4. List view  *(required)* — default columns (order), paging, search filters.

## 5. Security & menu  *(required)*
Authorization in the Razor app is its **own** role-based system (users → roles → permission resources) — **NOT** a port of the legacy privilege model. **Do not migrate or infer any legacy user permissions.**
- **Register** the form's permission resources into the app's authorization system — in the app: `Security/AppPermissions.cs` + `AppPermissionCatalog.cs`, the module/app-object catalog, and the permission-seed migration, following the Invoice pattern. Registration just makes the resources available for later assignment.
- **Default access = admin only.** The built-in `admin` role automatically gets full rights to every form (provisioning grants all resources to Administrators); every other role starts with **no** access. Role names, per-role authorization, and user→role assignment are configured **later with the customer — not during form coding**.
- **Granularity:** the system authorizes form access level, report view / not-view, and press / not-press on specific controls and tabs — register resources at that granularity where the form needs it.
- **Per-variant:** when a form has parameter variants (e.g., PO vs WO), register **separate** permission resources per variant.
- Also specify: parent menu, route, and menu visibility rule (item hidden unless the user holds the form's view resource).

## 6. Test plan  *(required — tightened)*
Reference the shared contracts, then add form-specific tests:
- **Common CRUD tests** → cite `docs/testing-contract.md` IDs (CRUD-001…).
- **Common UI/style tests** → cite the style section (CRUD-049…058).
- **Shared-component reuse tests** → **NEW, required when Notes/Change Log are enabled.** Cite `CRUD-059…063` (proves the shared subforms are reused, not rebuilt).
- **Line-item conformance tests** → **NEW, required when the form has a line grid.** Cite `LINE-001…009` (the nine line-item rules).
- **Business-logic UI tests** → **NEW, required.** One row per business rule: `TC id | what it proves (BR id) | steps | expected`. Cover every rule and variant in §0/§3.
- **Manual-test tagging** → **NEW.** Any test too elaborate to automate reliably is tagged `MANUAL (developer)` with a one-line reason, so the developer can prune automated tests to save tokens.

## 7. OPEN QUESTIONS  *(required — tagged)*
Every gap tagged `[CONTEXT]` (resolve from `.frm`/schema/programmable objects before freeze — must never reach the human) or `[DECISION]` (genuine business choice — human answers at the gate). Spec cannot freeze until both queues are empty.

---

### What changed vs the old template (the gaps we closed)
1. **Tab-section assignment** (§2a) — was absent; now required so the Razor app mirrors the legacy tabs.
2. **Legacy field order** (§2b) — now mandatory, not just "Row 1/Row 2".
3. **Line-item columns** (§2c) and **LoV popup columns** (§2d) — now explicit per grid/lookup.
4. **Parameter variants** (§0) — first-class section for PO-vs-WO-style forms.
5. **Programmable objects used** (§0) — views/procs/functions/triggers named.
6. **Business-logic test list + manual tagging** (§6) — beyond generic CRUD/style.
7. **Context/Decision tagging** on open questions (§7) — keeps the human gate small.
8. **Shared-component reuse** (§0 `shared_components`) and **line-item conformance** (§2e) — declared in the spec and enforced by `CRUD-059…063` / `LINE-001…009`, so Codex wires the shared Notes/Change Log and matches the invoice grid instead of rebuilding them.
