## Plan: PNC Thesis Tracker Web App

You don’t have any existing project files in the workspace yet, so this plan assumes we’re starting from scratch. We’ll build a simple web app that tracks each research group through Title Approval → Proposal Defense → Final Defense, using checklist requirements (your PNC forms list), approvals, defense schedules, and revision compliance. For “file storage,” we will store only Google Drive URLs (no uploads), and enforce access via sharing settings + app permissions.

**Steps**
1. Define scope + roles (based on your answers)
   - Roles: Student (by group) and Research Teacher/Coordinator (department).
   - Data scope: multi-year, one program (College of Engineering), but structured so you can add more programs later without rewrites.

2. Choose the free stack (recommended default)
   - Frontend: React (Vite) deployed on Firebase Hosting (free tier).
   - Auth: Firebase Authentication with Google Sign-In.
   - Database: Firebase Firestore (free tier).
   - Storage: none; store Google Drive links as plain URL fields.
   - Decision note: this avoids server hosting costs and keeps deployment “one button” via Firebase CLI.

3. Model the workflow + requirements in the database
   - Collections (suggested):
     - `terms` (AY/Sem, start/end)
     - `groups` (title, section, members, adviserName optional, termId, status)
     - `users` (uid, name, email, role: `student` | `coordinator`, groupId optional)
     - `requirements` (stage: `title` | `proposal` | `final`, code/name, owner: `student` | `teacher`, timing: `before` | `after`, applicable flags like “if needed”)
     - `submissions` (groupId + requirementId, driveUrl, submittedAt, status: `missing` | `submitted` | `approved` | `needs_revision`, remarks)
     - `defenses` (groupId, stage, scheduleDateTime, venue/meetLink, panelNames, status)
     - `revision_items` (groupId, stage, description, dueDate, status, evidenceDriveUrl optional)
   - Seed the `requirements` collection with exactly the items you listed (Title Approval, Proposal Defense, Final Defense; plus “After …” items and teacher-only items).

4. Design the minimum screens (no extra features)
   - Student views:
     - Dashboard: current stage, progress bar (submitted/approved counts), next due items.
     - Stage checklist: requirement list with statuses + “Add Google Drive link” per item.
     - Defense schedule view: read-only schedule for their group.
     - Revision compliance: list of required revisions + evidence link fields (if coordinator requires).
   - Coordinator views:
     - Group list: filter by term, stage, completion (basic table).
     - Group detail: approve/reject submissions, leave remarks, set defense schedule, add revision items, mark compliance.

5. Implement permissions (critical for safety/privacy)
   - Firebase Auth required for all pages.
   - Firestore Security Rules:
     - Students can read/write only their own group’s submissions/links.
     - Coordinator can read/write across all groups in the program/term.
   - Google Drive link policy:
     - Either “Anyone with the link” (simplest) OR restricted to your school domain; whichever matches your privacy requirement.

6. Implement the app structure + configs
   - Proposed project layout:
     - `web/README.md` (setup + deployment steps)
     - `web/src/main.tsx`, `web/src/routes`
     - `web/src/firebase.ts` (Firebase config + init)
     - `web/firestore.rules` (access control)
     - `web/firestore.indexes.json` (if needed for queries)

7. Free deployment (Firebase)
   - Create a Firebase project (Google account).
   - Enable Authentication → Google provider.
   - Create Firestore database (production mode, then apply your rules).
   - Deploy Hosting + rules via Firebase CLI from the `web` folder.
   - Result: a public URL like `https://<project>.web.app` with login required.

**Verification**
- Local checks: log in as Student → can only see/edit own group; cannot read other groups.
- Coordinator account: can view all groups; can approve/reject; can schedule defenses; can add revision items.
- Data correctness: seeded requirements match your PNC list and appear in the correct stage (“before/after”).
- Deployment: open deployed URL, confirm Google Sign-In works and Firestore rules block unauthorized reads/writes.

**Decisions**
- Use Firebase (Auth + Firestore + Hosting) to keep deployment genuinely free and avoid maintaining a backend server.
- Use Google Drive links only (URLs stored in Firestore), not file uploads, per your request.

If you want, I can refine the plan further by locking in the exact statuses and who can change them (e.g., can students mark “submitted” only, while only coordinators can set “approved/needs revision”?).
