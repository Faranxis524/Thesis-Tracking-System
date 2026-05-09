# 🔍 Issues to Fix - Thesis Tracker System

## Summary
Found **10 major issues** that need to be addressed before confirming the system. These include UI improvements, missing features, data inconsistencies, and missing views.

---

## Issues List

### 1. ❌ Leader Dashboard - Settings Not Implemented
**Status**: Missing Feature  
**Severity**: High  
**Location**: `web/src/app/leader/dashboard/page.tsx`

**Current State**:
- Settings button exists in dashboard but doesn't navigate to a dedicated settings page
- All group settings (members, title, adviser) are in DefenseFlow component

**Required Action**:
✅ Create new settings page at `/leader/group-settings` or similar  
✅ Move group member management (edit/remove) to settings  
✅ Move research title editing to settings  
✅ Move research adviser editing to settings  
✅ Make settings accessible from dashboard via Settings button

**Related Code**:
- Dashboard: Line 167 - Settings button exists but goes to `/profile`
- DefenseFlow: Line 641-680 - Has member/title/adviser editing buried in "Unlocks" section

---

### 2. ❌ Edit/Remove Group Members Not Implemented
**Status**: Missing Feature  
**Severity**: High  
**Location**: `web/src/components/DefenseFlow/DefenseFlow.tsx` (Lines 620-680)

**Current State**:
- Can only ADD members after grouping form approval
- NO ability to EDIT member details
- NO ability to REMOVE members from group
- Members display shows only name without action buttons

**Required Action**:
✅ Add edit button next to each member (edit displayName)  
✅ Add remove/delete button next to each member  
✅ Implement delete member from database  
✅ Add confirmation dialog before removing  
✅ Move to dedicated settings page (see Issue #1)

**Affected Fields**:
- groupMembers collection - need delete functionality
- UI needs member action buttons

---

### 3. ❌ Edit/Update Research Title Not Fully Implemented
**Status**: Partial  
**Severity**: Medium  
**Location**: `web/src/components/DefenseFlow/DefenseFlow.tsx` (Lines 641-665)

**Current State**:
- Title CAN be edited in DefenseFlow unlocks section
- Unlocks only after Title Defense is marked done
- No way to EDIT title from leader dashboard
- No easy access from settings

**Required Action**:
✅ Move title editing to settings page  
✅ Allow edit/update from dedicated settings page  
✅ Keep same unlock logic (after title defense done)  
✅ Add confirmation when saving

---

### 4. ❌ Edit/Update Research Adviser Not Fully Implemented
**Status**: Partial  
**Severity**: Medium  
**Location**: `web/src/components/DefenseFlow/DefenseFlow.tsx` (Lines 670-680)

**Current State**:
- Adviser CAN be edited in DefenseFlow unlocks section
- Unlocks only after PNC:PRE-FO-59 form is approved
- No way to EDIT adviser from leader dashboard
- No easy access from settings

**Required Action**:
✅ Move adviser editing to settings page  
✅ Allow edit/update from dedicated settings page  
✅ Keep same unlock logic (after adviser form approved)  
✅ Add confirmation when saving

---

### 5. ❌ Defense Schedule Can't Be Marked as Done + No Edit
**Status**: Critical  
**Severity**: Critical  
**Location**: `web/src/components/DefenseFlow/DefenseFlow.tsx` (Lines 684-740)

**Current State**:
- Defense timeline shows scheduled defenses
- NO button to mark defense as DONE
- NO button to EDIT defense details (date, link, notes)
- Teachers can mark done in requirements page, but leaders cannot
- Defense status stuck at 'scheduled'

**Required Action**:
✅ Add "Mark as Done" button in defense timeline  
✅ Add "Edit Defense" button to modify date/time/link/notes  
✅ Only show buttons if defense is NOT cancelled  
✅ Update UI to reflect changes in real-time  
✅ Consider: Should only defense creator/adviser can mark done?

**Affected Code**:
- DefenseFlow Timeline section (line 684-740)
- Defense type should have `updatedBy` field

---

### 6. ❌ Group Name Not Visible in Leader Dashboard
**Status**: Missing Display  
**Severity**: Medium  
**Location**: `web/src/app/leader/dashboard/page.tsx`

**Current State**:
- Dashboard shows generic "Group 1" label hardcoded (Line 30)
- Actual group title from `groups[0].title` is NOT displayed
- No way to see group name without going into DefenseFlow

**Required Action**:
✅ Display actual group name/title in dashboard header  
✅ If no title set, show "Group 1" as default  
✅ Update when group title changes  
✅ Example: "Leader Dashboard - Group Name: Research on AI"

**Code Location**:
```tsx
// Line 30: Current
const groupLabel = groups.length > 0 ? `Group 1` : null;

// Should be:
const groupLabel = groups.length > 0 ? `${groups[0].title || 'Group 1'}` : null;
```

---

### 7. ❌ Active Openings Missing Filter by Section/Group
**Status**: Missing Feature  
**Severity**: Medium  
**Location**: `web/src/app/teacher/requirements/page.tsx` (Lines 334-375)

**Current State**:
- "Active Openings" section shows ALL openings without filters
- No way to filter by section
- No way to filter by specific group
- Hard to find relevant openings when many exist

**Required Action**:
✅ Add filter dropdown/buttons for SECTION  
✅ Add filter dropdown/buttons for GROUP  
✅ Show "All" option as default  
✅ Filter openings.scopeType === 'section' OR 'group'  
✅ Apply filters dynamically

**UI Suggestion**:
```
Filter: [Term ▼] [Department ▼] [Section ▼] [Group ▼] [Clear Filters]
```

---

### 8. ❌ Teacher Cannot View Individual Group Details
**Status**: Missing Feature  
**Severity**: High  
**Location**: Teacher dashboard

**Current State**:
- Teacher dashboard shows stats and approved groups
- NO view to click on a group and see details
- Cannot see:
  - Group name/title
  - Group members (all of them)
  - Research adviser
  - Research title
  - Document approval status
  - Defense progress

**Required Action**:
✅ Create new page: `/teacher/group/[groupId]`  
✅ Show group information:
  - ✅ Group name/title
  - ✅ All group members
  - ✅ Research adviser
  - ✅ Research title
  - ✅ Leader name
  - ✅ Current stage (title/proposal/final)
  - ✅ Submission status (approved/needs revision/submitted)
  - ✅ Document links
✅ Make group names clickable in dashboard  
✅ Add breadcrumb navigation

**Data Needed**:
- Group info from `groups` collection
- Members from `groups/{groupId}/members`
- Submissions from `submissions` collection
- Requirements for context

---

### 9. ❌ Total Groups Count Discrepancy (5 vs 4)
**Status**: Bug  
**Severity**: High  
**Location**: `web/src/app/teacher/dashboard/page.tsx` (Line 258)

**Current State**:
- Dashboard header shows: "Total Groups: 5"
- But "Approved Group Naming" section shows only 4 groups
- This is a data consistency issue

**Root Cause**:
- "Total Groups" counts ALL groups in the system
- "Approved Groups" filters by those with approved grouping form (PNC:PRE-FO-64/65)

**Required Action**:
✅ Investigate which group is missing approval  
✅ Either:
  - Option A: Fix counting logic to match
  - Option B: Show different counts with explanations
  - Option C: Filter total groups to only "active" ones
✅ Add clarifying text explaining the difference

**Code**:
```tsx
// Line 258 - shows groups.length (ALL groups)
// Should clarify: "Total Groups", "Active Groups", "Approved Groups"
```

---

### 10. ❌ Recent Activity Missing Detail Information
**Status**: Missing Information  
**Severity**: Low  
**Location**: `web/src/app/teacher/dashboard/page.tsx` (Lines 419-442)

**Current State**:
- Shows submission status badge + group name
- Shows "Leader: [name]"
- Shows reviewed date
- MISSING what the actual activity is

**Current Display**:
```
[Approved] Group 1 | Leader: John | Oct 20
```

**Required Change** - Add detail about WHAT happened:
```
[Approved] Group 1 - Title Approval Submitted | Leader: John | Oct 20
[Approved] Group 1 - Proposal Document Approved | Leader: John | Oct 21
[Needs Revision] Group 1 - Final Defense Revision Needed | Leader: John | Oct 22
```

**Required Action**:
✅ Join submission data with requirement info  
✅ Show requirement name or code  
✅ Show action type (Submitted/Approved/Revision)  
✅ Format: `[Status] Group - Action | Leader | Date`

**Data Needed**:
- Requirement lookup to show what submission is for
- Submission status details

---

## Additional Issues to Consider

### 11. 🟡 Member Addition Validation
**Status**: Potential Issue  
**Severity**: Low

Should prevent:
- Adding duplicate members
- Leader adding themselves
- Adding members with invalid data

---

### 12. 🟡 Group Member Limit Enforcement
**Status**: Implemented (Cloud Function)  
**Severity**: Low

Already enforced in Firebase functions (max 4 members + 1 leader = 5 total)

---

### 13. 🟡 Settings Page Routing
**Status**: Not Implemented  
**Severity**: Medium

Currently Settings button goes to `/profile`  
Should create new page: `/leader/settings` or `/leader/group-settings`

---

## Implementation Priority

### 🔴 CRITICAL (Must Fix)
1. Defense schedule mark done + edit (Issue #5)
2. Teacher group view page (Issue #8)

### 🟠 HIGH (Important)
1. Move settings to dedicated page (Issue #1)
2. Edit/remove group members (Issue #2)
3. Fix total groups count (Issue #9)

### 🟡 MEDIUM (Should Fix)
1. Display group name in dashboard (Issue #6)
2. Add filters to active openings (Issue #7)
3. Edit title/adviser UI (Issues #3, #4)

### 🟢 LOW (Nice to Have)
1. Add detail to recent activity (Issue #10)
2. Member validation (Issue #11)

---

## Testing Checklist

After fixes, verify:
- [ ] Settings page loads and saves changes
- [ ] Members can be added, edited, removed
- [ ] Group name displays in all places
- [ ] Defense can be marked done by leader
- [ ] Teacher can click group name and see details
- [ ] Filters work in active openings
- [ ] Count discrepancy resolved
- [ ] Recent activity shows descriptive text
- [ ] No orphaned data after member removal
- [ ] Proper role-based access control

---

*Document Created: May 9, 2026*
*Last Updated: May 9, 2026*
