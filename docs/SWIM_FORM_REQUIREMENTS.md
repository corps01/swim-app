# Swim Form Requirements & Project Context

## 1. Core Purpose & Scope Boundary

A focused form-management platform for independent swim instructors and parents. Its sole purpose is ensuring parents complete and sign required health and safety forms before each swim session, maintaining an immutable history of submissions.

### Included Features

| Area | Capabilities |
|------|--------------|
| **Account & Identity Management** | Instructor accounts, parent accounts, and child profiles |
| **Form Engine** | Dynamic form display, simple/Yes-No questions, required fields, conditional logic, parent digital signatures, submission timestamps |
| **Instructor Form Configuration** | Customization of form questions, required fields, custom instructions, and branding (logo, business name, contact info) |
| **Health & Rules Engine** | Form rule triggers, failure warnings, entry restriction logic, and alert distribution |
| **History & Records Retention** | Read-only submission records, signature capture, and historical form audit trails |
| **Notifications & Reminders** | Scheduled session reminders for parents, missing-form reminders, and flagged health alerts for instructors |
| **Student & Session Association** | Class/session timing details used strictly for triggering pre-class reminders and linking forms to specific sessions |

### Expressly Out of Scope

- Full calendar or general scheduling system
- Complete swim-school management ERP or administrative platform
- Skill tracking, progress graphs, or lesson milestone logs
- In-app payment processing or subscription billing
- Direct messaging, chat tools, or media uploads (photos/videos)
- Advanced/complex form-building tools (e.g., multi-page branching engines, external field integrations)

---

## 2. User Roles & Relationships

### Instructor

- Owns an instructor account and manages their linked students
- Configures instructor-specific forms, rules, and branding
- Invites parents via reusable links or codes
- Views session rosters, student form status, and submitted form history
- Receives alerts for flagged health issues and missing forms

### Parent

- Creates and manages a parent account with support for multiple children
- Associates specific children with instructors via invitation links/codes
- Completes, signs, and submits forms for upcoming sessions
- Views submission history and digital signatures per child

### Child

- Profiles are created and owned by a parent
- A child can be associated with multiple independent instructors

### Data Privacy & Isolation Boundary

The instructor–child relationship is strictly private.

If a child works with **Instructor A** and **Instructor B**:

- Instructor A only sees their own relationship, sessions, and submitted forms for that child
- Instructor B only sees their own relationship, sessions, and submitted forms for that child
- Instructors **cannot** access records or history created under another instructor

---

## 3. Account Creation & Association Flows

### Authentication Methods

- Email / password login and password recovery
- Third-party SSO (Google, Apple)
- Email verification and session management

### Invitation & Association Workflow

Instructors share a **reusable link or code** (similar to Google Classroom behavior).

| Path | Flow |
|------|------|
| **Existing parent** | Access link/code → Login → Select child → Confirm association with instructor |
| **New parent** | Access link/code → Create account → Create child profile → Confirm association with instructor |

### Rules

- Joining an instructor associates **only the selected child** with that instructor; it does not grant access to the parent's other children
- Reusing an invitation link does **not** create duplicate parent or child accounts
- Instructors can **revoke** an invitation link at any time

---

## 4. Pre-Class Form & Health Rules Engine

### Form Requirements

- Presented to parents **prior to** a scheduled session
- Uses simple, parent-friendly language (avoiding overly complex medical terminology)
- Supports required questions and **conditional follow-ups** based on responses
- Captures a **digital parent signature** linked to the specific submission context

### Health Rule Triggers & Action Flow

Answers indicating conditions such as fever, vomiting, skin rashes, or instructor-defined flags execute the following flow:

1. **Parent warning** — Clear explanation of why the child cannot attend
2. **Restriction details** — Applicable return restriction or date/time, if defined by the rule
3. **Acknowledgment** — Require parent signature/acknowledgment on the flagged record
4. **Instructor notification** — Immediate alert to the instructor regarding the health flag
5. **Status recording** — Log the session record as cancelled / not eligible to attend

---

## 5. Submissions, Signatures & Audit Trail

### Signature Bundle

Every submission bundles and stores:

- Form template ID & version answers
- Parent ID & child ID
- Full date and time timestamp
- Rendered digital signature (image/vector)

### Record Retention

- Every submitted record is **read-only** and retained as part of the student's history
- Previous forms and signatures remain accessible to both the parent and the relevant instructor for auditing and dispute resolution

---

## 6. Notifications & Reminders

### Parent Notifications

- Scheduled pre-session reminders to complete the required form (timing configurable)
- Follow-up reminder if the form remains incomplete close to session time

### Instructor Notifications

- Alerts when a submitted form is flagged with a health issue
- Reminders when required forms are missing prior to a session

---

## 7. Operational Views (High-Level Requirements)

### Parent Experience

- Direct access to active children profiles
- Clear indication of upcoming sessions requiring form completion
- Accessible history of past form submissions and signatures per child

### Instructor Experience

- Session rosters displaying student form status (e.g., Completed, Missing, Flagged / Cannot Attend)
- Student directory listing associated children, parent contact info, and submission history
- Ability to view read-only historical forms and signatures per student
