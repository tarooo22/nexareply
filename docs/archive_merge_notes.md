# Archive and Remote Merge Notes

The user-provided archive introduced a stable worker trigger path and a bearer-secret callback proposal. The current project keeps only the stable path, `/api/internal/worker/process-conversations`, because its HMAC timestamp/body verification is the stronger boundary. The archive's older queue implementation must not replace the current retrying, lease-recovery, dead-letter, owner redrive, and safe monitoring lifecycle.

During the GitHub merge, the remote branch replaces Amadeo-specific workspace screen imports with generalized `Workspace*` screens and a `MetaConnectionWizard`. The resolution must retain that remote workspace structure while mounting the local owner-only `QueueOwnerPanel` above the remote Inbox screen. The server bootstrap must retain both the remote integrations and local raw-body HMAC worker callback registration.

Inspection confirmed that the remote router did not conflict with local `operations` procedures; the local owner-scoped queue status, safe failure DTO, and dead-letter redrive methods remain intact. The bootstrap conflict is limited to choosing a callback registration: the local `registerWorkerCallbackRoutes` supersedes the archive/remote bearer-based `registerWorkerTriggerRoutes` because the HMAC callback already uses the same stable external process path.
