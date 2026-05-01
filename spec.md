Take-home Exercise: Service Scheduling
&amp; Notification System

Timeframe
Please spend approximately 3–5 hours on this exercise.
We are not expecting a production-ready system.
If you run out of time, please document what you would have done next.

Challenge
Build an end-to-end system that allows multiple managers to assign Quotes to a
Technician’s schedule, with conflict prevention and notifications.

Core Requirements (Must Have)

1. Data Modeling

- Managers
- Technicians
- Quotes
- Jobs
- Notifications (can be simple)
  A Job must belong to a Technician, Quote, and Manager.

2. Assignment Flow

- View unscheduled quotes
- Assign quote to technician
- Select a 2-hour time window

3. Conflict Prevention
   Ensure no overlapping jobs for a technician. Must be enforced on backend.
4. Job Lifecycle

- scheduled
- completed
  Technician can mark job as completed.

5. Notifications

When job is assigned or updated → notify technician
When job is completed → notify manager
Can be simulated (DB or logs)

Optional Extensions

- Technician schedule UI (calendar or list)
- Concurrency handling
- Improved UX
- Event-driven notification design

Submission Instructions
Submit via GitHub or GitLab.
Include README with setup, decisions, trade-offs.

Use of AI Tools
AI tools are allowed.
You must explain your implementation, conflict handling, and trade-offs.
