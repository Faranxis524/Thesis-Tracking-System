# Thesis Tracker System - User Manual

## Introduction

Welcome to the Thesis Tracker System, a cloud-based application designed to streamline the thesis defense process for students and faculty advisors. This system provides role-based access for Leaders (student researchers) and Teachers (faculty advisors) to manage research groups, track defense progress, and facilitate communication throughout the thesis journey.

## Getting Started

### Accessing the System
1. Open your web browser and navigate to the system URL (provided by your institution)
2. Click "Sign In" on the landing page
3. Enter your institutional email address and password
4. Click "Sign In" to access your dashboard

### Dashboard Overview
Upon logging in, you will see a role-specific dashboard:
- **Leader Dashboard**: Shows your research group, defense progress, and pending actions
- **Teacher Dashboard**: Displays all groups under your supervision, submission statuses, and scheduling tools

Navigation is available via the sidebar menu, which adapts based on your role.

## Leader Guide (Student Researcher)

### Creating a Research Group
1. From your dashboard, click "Create New Group" in the Groups section
2. Enter:
   - Group Title
   - Adviser (select from dropdown)
   - College and Section (auto-populated from your profile)
3. Click "Create Group"
4. Share the group code with up to 3 additional members to join

### Managing Group Members
1. Navigate to "Group Management" in the sidebar
2. To add members:
   - Click "Add Member"
   - Enter member's email address
   - Click "Invite"
   - Members must accept the invitation via email
3. To remove members:
   - Click the "..." menu next to a member's name
   - Select "Remove from Group"
   - Confirm the action

### Defense Flow Process
The thesis defense consists of three stages:

#### Stage 1: Title Approval
1. Navigate to "Defense Flow" → "Title Approval"
2. Click "Submit Title" to enter your proposed thesis title
3. Add a brief description (optional)
4. Click "Submit for Approval"
5. Your adviser will review and either:
   - Approve (moves to Proposal Defense stage)
   - Request revisions (you'll receive notification to resubmit)

#### Stage 2: Proposal Defense
1. Once Title Approval is complete, navigate to "Proposal Defense"
2. Upload your proposal document (PDF format)
3. Schedule your defense date/time using the calendar picker
4. Click "Schedule Defense"
5. Attend the scheduled defense session (conducted via video conferencing)
6. After defense, your adviser will:
   - Approve (moves to Final Defense stage)
   - Request revisions (upload revised proposal)

#### Stage 3: Final Defense
1. After Proposal Defense approval, navigate to "Final Defense"
2. Upload your complete thesis document (PDF format)
3. Schedule your final defense date/time
4. Click "Schedule Defense"
5. Attend the scheduled defense session
6. After defense, your adviser will:
   - Approve (marks thesis as completed)
   - Request revisions (upload revised thesis)

### Submitting Documents
1. Navigate to the relevant defense stage (Title, Proposal, or Final)
2. Click "Upload Document"
3. Select your PDF file (max size: 10MB)
4. Add any notes for your adviser (optional)
5. Click "Submit"
6. You can view submission history and download previously submitted documents

### Viewing Requirements
1. Navigate to "Requirements" in the sidebar
2. Select the requirement category:
   - Title Approval Requirements
   - Proposal Defense Requirements
   - Final Defense Requirements
3. Each requirement shows:
   - Description
   - Status (Completed/Pending)
   - Deadline (if applicable)
4. Click on any requirement for detailed guidelines

## Teacher Guide (Faculty Advisor)

### Viewing All Groups
1. From your dashboard, navigate to "All Groups"
2. Use filters to narrow down by:
   - College
   - Section
   - Term
   - Defense Stage
3. Click on any group to view:
   - Member list
   - Current defense stage
   - Submission history
   - Activity timeline

### Reviewing Submissions
1. Navigate to "Submissions Review" or click on a specific group's submission
2. For each submission, you can:
   - View the uploaded document
   - Read any accompanying notes
   - Check submission timestamp
3. To provide feedback:
   - Click "Approve" to move to next stage
   - Click "Request Revisions" to send back for changes
   - Add revision notes in the provided text box
4. All actions are logged in the audit trail

### Scheduling Defenses
1. Navigate to "Defense Scheduling"
2. Select a group from the dropdown
3. Choose defense type (Title, Proposal, or Final)
4. Select date and time from the calendar
5. Add meeting link or room details (optional)
6. Click "Schedule Defense"
7. The system automatically notifies all group members

### Managing Academic Data
*Note: This feature may be restricted to senior faculty or administrators*

#### Managing Terms
1. Navigate to "Academic Settings" → "Terms"
2. Click "Add Term" to create a new academic term
3. Enter term name and dates
4. Click "Save"

#### Managing Colleges and Sections
1. Navigate to "Academic Settings" → "Colleges/Sections"
2. To add a college:
   - Click "Add College"
   - Enter college name
   - Click "Save"
3. To add sections under a college:
   - Select the college
   - Click "Add Section"
   - Enter section name
   - Click "Save"

## Security and Privacy

### Data Protection
- All data is encrypted in transit and at rest
- Role-based access controls ensure users only see authorized information
- Audit logs track all system activities for accountability

### Password Security
- Use a strong, unique password for your account
- The system will prompt you to change your password periodically
- Never share your login credentials

### Session Management
- Sessions automatically expire after 30 minutes of inactivity
- You can manually log out from the user menu in the top-right corner

## Troubleshooting

### Common Issues

#### Login Problems
- **Forgot Password**: Click "Forgot Password" on the login page and follow the reset instructions sent to your email
- **Account Locked**: Contact system administrator after 5 failed login attempts
- **Invalid Credentials**: Double-check your email and password (case-sensitive)

#### Document Upload Issues
- **File Too Large**: Compress your PDF or split into smaller files (max 10MB per upload)
- **Unsupported Format**: Only PDF files are accepted for thesis documents
- **Upload Failed**: Check your internet connection and try again

#### Notification Problems
- **Not Receiving Emails**: Check your spam folder and ensure notifications@thesistracker.edu is whitelisted
- **In-App Notifications Not Showing**: Ensure browser notifications are enabled for the site

### Getting Help
1. Click the "Help" icon (?) in the top-right corner for context-sensitive help
2. Visit the FAQ section in the user menu
3. Contact technical support at support@thesistracker.edu
4. Include your user ID and a detailed description of the issue when requesting support

## Frequently Asked Questions (FAQ)

### General Questions
**Q: Can I access the system from mobile devices?**  
A: Yes, the system is responsive and works on smartphones and tablets through any modern web browser.

**Q: Is my data backed up?**  
A: Yes, all data is automatically backed up by Firebase with geographic redundancy.

**Q: How long is my data retained?**  
A: Data is retained for 5 years after graduation or as per institutional policy.

### Leader-Specific Questions
**Q: What if my group member leaves the program?**  
A: As group leader, you can remove the member from Group Management. Their access will be revoked immediately.

**Q: Can I change my thesis title after approval?**  
A: Title changes after approval require adviser consent. Use the "Request Revision" feature in the Title Approval stage.

### Teacher-Specific Questions
**Q: How many groups can I advise at once?**  
A: There is no system-imposed limit, but please consult your department guidelines for recommended advisory loads.

**Q: Can I delegate review responsibilities to another faculty member?**  
A: Yes, you can add co-advisers to a group through the Group Management interface.

## System Features Overview

### Real-Time Updates
The system provides real-time updates:
- When a group member joins or leaves
- When submissions are uploaded or reviewed
- When defense schedules are created or modified
- When requirement statuses change

### Notification System
You will receive notifications for:
- New group invitations
- Submission deadlines (24 hours before)
- Adviser feedback on submissions
- Defense schedule reminders
- System announcements

### Audit Trail
All actions in the system are logged and available for review:
- Leaders can view their own audit trail
- Teachers can view audit trails for groups they supervise
- Audit logs include: who performed the action, what was changed, and when

## Contact Information

For technical support:
- Email: support@thesistracker.edu
- Phone: (555) 123-4567 (Available 8AM-6PM, Monday-Friday)

For academic inquiries:
- Contact your department's thesis coordinator
- Refer to your institution's thesis guidelines

---

*Version 1.0 - May 2026*  
*Thesis Tracker System - Powered by Firebase*  
*© 2026 Your Institution Name. All rights reserved.*