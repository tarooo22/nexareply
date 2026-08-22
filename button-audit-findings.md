# NexaReply button audit findings

## Initial browser smoke check

The public Home page was opened in the current preview. The header controls for „შესაძლებლობები“, „როგორ მუშაობს“, and „ფასები“ are interactive buttons and the click test on „შესაძლებლობები“ scrolled to the corresponding feature section. The public CTA links for login, registration, and Demo are exposed as real links in the page content.

The preview displayed the sandbox Preview Mode banner saying the page is not live and cannot be shared directly; this is preview chrome, not an application button failure.

## Initial source audit

The client contains interactive controls across the public Home, authentication, Meta connection, Demo Mode, authenticated workspace, and shared layout components. Most controls are wired to navigation, React state, tRPC mutations, form submission, Radix triggers, or clipboard actions. The first source-level risk is the account dropdown trigger in `client/src/components/DashboardLayout.tsx`, which is a Radix `DropdownMenuTrigger` and works through composition but lacks an explicit `type="button"` and accessible label. The manual Meta save button is a valid form submit control. The audit must continue across Demo Mode and authenticated screens, with special attention to controls that are visual-only, missing feedback, or intentionally external/owner-dependent.

## Status

Inventory is in progress. No production code has been changed for the button audit yet.
EOF

## Demo Settings smoke check

Demo Mode Settings rendered successfully. The three onboarding buttons, tone and length selects, fallback textarea, debounce range input, notification checkboxes, Setup instructions button, and plan action button are all exposed as interactive controls. The Setup and plan buttons now have explicit Demo-only feedback handlers instead of silent no-op behavior. The Preview Mode banner remains expected sandbox chrome.

## First repairs completed

- Added explicit `type="button"` and a Georgian accessible label to the shared DashboardLayout account dropdown trigger.
- Replaced Demo Settings `Upgrade placeholder` with `გეგმის განახლების ნახვა` and an explicit notice that billing/checkout is not enabled in Demo Mode.
- Added an explicit Setup instruction notice explaining that real Meta connection is available only in an authenticated workspace.

QA after these changes: TypeScript passed, 115 Vitest tests passed with 2 managed-secret tests skipped, and production build passed. The existing large frontend chunk advisory remains.

## Follow-up regression

During browser smoke testing, the Setup button remained visible but its feedback text was not present in the extracted page after the click. This is tracked as a follow-up interaction regression: verify whether the preview is serving the latest source, then confirm the state update renders at the top of the Settings card. Do not mark the Setup button fully verified until this is resolved.

## Latest preview smoke

After restarting the dev server, the updated Settings labels are present in the preview. A browser click on `Setup ინსტრუქციის ნახვა` did not expose the expected `role="status"` feedback in extracted content, so this control remains unresolved until a DOM-level click confirms whether the handler fires or the state is being hidden by layout/preview behavior.

## DOM-level confirmation

The Setup button handler is functional. Direct DOM click found the button; after a 50 ms render delay, `role="status"` contained the expected Georgian Demo-only Meta setup guidance. The earlier extracted page did not wait for the React state update, so no code correction is needed for this control.
