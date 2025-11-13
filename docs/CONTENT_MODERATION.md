# Content Moderation & Safety Workflow

GigLink includes a multi-layered safety system to comply with App Store Guideline 1.2 for apps that host user-generated content.

## 1. Automated Filtering

- All text inputs that are shared with other users (post bodies, comments, replies, gig titles/descriptions/requirements, gig application messages, and direct messages) are passed through `backend/utils/moderation.js`.
- The filter normalises text (strips diacritics, homoglyph substitutions, and leetspeak) and scans for profanity, hate speech, CSAE terms, threats, explicit sexual solicitation, and self-harm phrases.
- Violations raise a `CONTENT_MODERATION_BLOCKED` error so the offending payload never reaches the database or other clients.

## 2. In-App Reporting

- Every gig and community post exposes a “Report” action in the UI. Reports are stored in `GigReport` and `PostReport`.
- Allowed reasons: spam, harassment, hate speech, inappropriate, misinformation, self-harm, other.
- When a report is filed the backend:
  - Captures a snapshot of the offending content.
  - Marks the item as `moderationStatus = 'needs_review'` (or `'blocked'` for critical reasons).
  - Automatically suspends the creator if the reason is high severity (hate speech, CSAE/self-harm) or if multiple users report harassment.
  - Sends a moderation alert email (to `MODERATION_ALERT_EMAILS`/`SAFETY_EMAIL`) and appends the event to `logs/moderation-alerts.log`.
  - Ensures overdue tickets surface via the admin API until resolved.

## 3. 24-Hour Response SLA

- Reports contain a `dueAt` timestamp set to 24 hours after submission to enforce the SLA.
- Content is hidden for end users immediately for high-severity reasons, preventing further exposure before moderation review.
- Administrators can review and action reports via the authenticated API:

```
GET    /api/moderation/reports?type=posts|gigs|all&status=pending
PUT    /api/moderation/reports/:type/:reportId/action
        body: { action: "mark_safe" | "remove_content" | "suspend_user", notes?: string }
```

- Actions update both the report and the associated content (`moderationStatus`, `moderationReason`, `flaggedAt`). The `suspend_user` action sets the creator’s `accountStatus` to `suspended` and records `suspendedAt`.

## 4. Environment Variables

Set these in `backend/.env` (or deployment secrets):

| Variable | Purpose |
| --- | --- |
| `MODERATION_ALERT_EMAILS` | Comma-separated list of inboxes that receive real-time alert emails whenever a report is submitted. |
| `SAFETY_EMAIL` / `ADMIN_EMAIL` | Fallback recipient if `MODERATION_ALERT_EMAILS` is not provided. |
| `EMAIL_FROM`, `SMTP_*` | Used by `emailService` when sending moderation alerts and other transactional mail. |

## 5. Communicating With App Review

When replying to App Review for Guideline 1.2, highlight:

1. **Automated Filtering** – explain that every post, gig, application, and message runs through the profanity/CSAE/hate-speech filter and is rejected server-side if it violates policy.
2. **User Reporting** – point reviewers to the in-app “Report” buttons on gigs and community posts; mention that users can add details to their report.
3. **Timely Enforcement** – note that severe reports auto-hide the content, notify the safety team via email/log, and can suspend accounts immediately. Moderators have a dedicated `/api/moderation` endpoint to resolve or remove content within 24 hours.

Including screenshots of the report dialog and referencing this document in your App Review response usually satisfies Apple’s follow-up questions.
