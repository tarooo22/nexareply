# Archive Five-Detail Audit

The two user-supplied archives were inspected without executing archive code. The Windows-style source archive was normalized for path and line-ending comparison. Its five recently changed UI/design files are listed below.

| Detail | Source file | Current status | Merge decision |
| --- | --- | --- | --- |
| Public navigation refinement | `client/src/components/MarketingHeader.tsx` | Matches current source after line-ending normalization. | Already integrated. |
| Protected workspace shell refinement | `client/src/pages/AuthenticatedWorkspace.tsx` | Contains the source update plus the newer owner-only QueueOwnerPanel. | Keep both; no overwrite. |
| Marketing/home-page refinement | `client/src/pages/Home.tsx` | Matches current source after line-ending normalization. | Already integrated. |
| Workspace screen refinement | `client/src/pages/workspace/AmadeoWorkspaceScreens.tsx` | Matches current source. | Already integrated. |
| Design-system detail update | `design-system/nexareply/MASTER.md` | Matches current source after line-ending normalization. | Already integrated. |

The `nexareply-improved` archive is an earlier baseline for several server-side contracts. Its older bearer-based worker trigger and simpler queue lifecycle must not replace the current HMAC callback, encrypted Meta vault, retry/backoff, lease recovery, dead-letter state, or owner-safe monitoring. The current project already contains the five source-archive refinements through the previously merged remote update; no destructive file replacement is needed.
