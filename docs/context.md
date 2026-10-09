# Estimate Title — project context

Canonical reference for this project. If this document and the repository disagree, **the
repository wins** — read the file and then fix this document in the same PR.

---

## 0. Standing warnings

1. **The OneZone client script also writes Title.** The margin SS1.0 client script (not in this
   repo — do not add it, do not edit it) has a `fieldChanged` block that, for quote type
   "OneZone", sets Title to `<area>m<sup>2</sup> <fc> OneZone Quote`. That runs in the UI only.
   This script must not compete with it, which is why OneZone is excluded by parameter **and**
   why this script never overwrites a non-blank Title. If the parameter is cleared, API-created
   OneZone quotes will get their Title from the description instead.
2. **A UI-only Title setter already exists somewhere.** Editing and saving an Estimate in the UI
   already fills Title from the description; the source was not found in the five scripts
   reviewed (it may be form-level behaviour). Because this script is fill-blank only, on a UI
   save that setter usually wins and this script logs nothing. See §6, open items.
3. **List fields are compared on raw values.** `custbody_quote_type` is read with `getValue()` —
   the option's internal ID — and compared as a string. Never compare against display text.
4. **`log.warn()` does not exist in SuiteScript.** Use `log.debug()`.

---

## 1. Decisions (confirmed by Steve, 2026-10-09)

| # | Decision | Answer |
|---|---|---|
| 1 | Repo | `stevenjamesnixon-maker/NS-Estimate-Title` |
| 2 | Target field | Native Estimate field **`title`** (Free-Form Text, 40 chars). Not a custom field. |
| 3 | Overwrite or fill-blank | **Fill blank only.** If `title` already has a value, leave it alone — never overwrite. |
| 4 | OneZone quotes | **Skip them**, via the Excluded Quote Types parameter. Steve sets the OneZone type's internal ID on the deployment in each environment. No numeric ID in code. |

### Deliberate decisions — do not silently reverse these

| Decision | Why |
|---|---|
| **beforeSubmit, not afterSubmit** | Same save, no second write, runs before the three existing `afterSubmit` scripts on Estimate. An afterSubmit would trigger the BlueBridge quote-HTML regeneration a second time per save. |
| **Fill blank only** | A Title set by a user, the API payload or the OneZone client script is never overwritten. Once set, changing the description does **not** update the Title. Intended. |
| **OneZone excluded by parameter, not by code** | Keeps the numeric list value out of the repo and lets Steve add other types without a release. |
| **No `search.lookupFields`, no `record.load`** | Everything needed is on `context.newRecord`. Modules are `N/runtime` and `N/log` only. |
| **No execution-context gating** | The whole point is that it runs for Web Services / REST. |
| **Empty description → no write** | Debug log only; this is common. |
| **HTML stripped** | In case `custbody_quote_description` is rich text. A no-op on plain text. HTML entities (`&amp;`) are **not** decoded. |
| **Failures never block the save** | Errors are logged as `QT_TITLE_FAILED` and swallowed. |
| **ES5 style** — `var`, `function`, `'use strict'` | House convention. Do not modernise. |

---

## 2. Components and versions

> Indicative. Read the `VERSION` constant and `@version` header in the file to confirm.

| Component | Version | File | Status |
|---|---|---|---|
| Estimate Title user event | 1.0.0 | `src/FileCabinet/SuiteScripts/EstimateTitle/qt_ue_estimate_title.js` | Not deployed |

---

## 3. Environments

**This repo represents no single environment; files deploy unchanged to Sandbox and Production.**

Field IDs and script IDs are committable. Numeric internal IDs — including quote type list values —
are not; they live on the deployment parameter in each environment.

---

## 4. Fields, script record and parameter

| What | ID | Notes |
|---|---|---|
| Target | `title` | Native Estimate Title. Free-Form Text, 40 chars (`TITLE_MAX_LENGTH`). |
| Source | `custbody_quote_description` | Read and trimmed. |
| Exclusion key | `custbody_quote_type` | Raw value (internal ID) compared as a string. |
| Script record | `customscript_qt_ue_estimate_title` | Type `_qt_ue_estimate_title` in the ID box. |
| Deployment | `customdeploy_qt_ue_estimate_title` | Applies To Estimate. Testing → Released. Log Level Debug. Execute As Administrator. Execution Context filter left empty (all). |

### Script parameter

| Label | Type in the ID box | Stored ID | Type | Value |
|---|---|---|---|---|
| Excluded Quote Types | `_qt_excluded_quote_types` | `custscript_qt_excluded_quote_types` | Free-Form Text | OneZone quote type internal ID, per environment |

Comma-separated `custbody_quote_type` internal IDs. Split on `,`, each entry trimmed, empties
dropped, compared as strings. **Empty means exclude none.**

### Behaviour (beforeSubmit)

1. Return on `delete` / `xedit`. Act only on `create`, `edit`, `copy`.
2. Title non-blank after trim → return (debug). **Checked before the description is read.**
3. Description blank after trim → return (debug).
4. Quote type in the excluded list → return, `QT_TITLE_SKIPPED` (audit).
5. Strip tags, collapse whitespace (`\r`, `\n`, `\t`, runs of spaces) to one space, trim, truncate
   to 40, trim trailing space left by the cut.
6. Empty result → return (debug). Otherwise set `title` and log `QT_TITLE_SET` (audit).

---

## 5. Audit log keys

Every `log.audit` and `log.error` title begins `QT_`.

| Key | Level | Meaning | Action |
|---|---|---|---|
| `QT_TITLE_SET` | audit | Title written. JSON `{ id, type, quoteType, after }`. `id` is null on create. | Nothing. |
| `QT_TITLE_SKIPPED` | audit | Quote type is in Excluded Quote Types. Logs raw `quoteType`. | Nothing, unless the type should not be excluded — then fix the parameter. |
| `QT_TITLE_FAILED` | error | The script threw. The Estimate still saved, without a Title from this script. | Read the logged error. |

---

## 6. Deployment sequence

Manual. **Steve deploys. Neither Claude deploys.**

1. Upload `qt_ue_estimate_title.js` to `SuiteScripts/EstimateTitle/` in the File Cabinet.
2. Create the script record `customscript_qt_ue_estimate_title`.
3. Add the parameter `custscript_qt_excluded_quote_types` (Free-Form Text) on the script record.
4. Create the deployment `customdeploy_qt_ue_estimate_title` on Estimate, Status **Testing**.
5. Set the parameter value on the deployment to the OneZone quote type's internal ID.
6. Test (§7).
7. Set Status to **Released**.

---

## 7. Test pass (Sandbox, deployment at Testing, parameter = OneZone's ID)

Grep the execution log for `QT_` after every scenario.

| # | Scenario | Expected |
|---|---|---|
| 1 | API create, title blank, description "Smith – 3 bed, solid floor, 85m2" | Title = that string. One `QT_TITLE_SET`, `type: create`. System Notes shows Title set. |
| 2 | API create, title blank, description 60+ chars | Title = first 40 chars; no save error. |
| 3 | API create, title blank, empty description | Title blank; no `QT_` line; debug only. |
| 4 | API create, title in payload, description filled | Title = payload value. No `QT_TITLE_SET`. |
| 5 | UI create, description filled, save | Title set; at most **one** `QT_TITLE_SET`. See open item 1 — zero is expected if the UI setter filled it first. |
| 6 | UI edit, title already set, change description, save | Title unchanged. No `QT_TITLE_SET`. |
| 7 | UI edit, title blank, description filled, save | Title set; one `QT_TITLE_SET` `type: edit` — or zero, per open item 1. |
| 8 | Inline edit (xedit) from a list view | Returns immediately; no error, no audit line. |
| 9 | Description containing a line break | Title is one line, break replaced by a space. |
| 10 | OneZone quote, title blank, description filled — **via API** | Title blank from this script. `QT_TITLE_SKIPPED` with raw quote type. In the UI the client script sets Title before save, so this script sees a non-blank Title and logs nothing. |
| 11 | As 10 with the parameter **cleared** | Title = description. Re-set the parameter afterwards. |
| 12 | Quote converted to Sales Order | No effect on the SO; no errors. |
| 13 | Grep execution log for `QT_` | No `QT_TITLE_FAILED`. |

---

## 8. Open items

1. **UI saves may never reach this script's write.** Something UI-side already fills Title from
   the description before submit. With fill-blank, a UI save then arrives with a non-blank Title
   and this script logs only a debug line. Scenarios 5 and 7 may therefore show zero
   `QT_TITLE_SET` rather than one. Not a defect — but it means the UI path does not prove this
   script works; scenarios 1, 2 and 9 (API) do.
2. **Copy carries the source Title.** A copied Estimate arrives with the original's Title, so
   fill-blank leaves it alone even if the description is changed on the copy.
3. **40-character limit unverified in code.** Taken from the brief. If the account's Title field
   is longer, raise `TITLE_MAX_LENGTH`.
4. **Backfill** of existing Estimates with blank Titles is a separate Mass Update, not part of this
   repo's first release.
