## 1. Design Philosophy

The core objective of this dashboard is "Preservation of Spatial
Awareness." In a synchronous digital classroom, a teacher needs the
equivalent of looking across a physical room to see who is working, who is
stuck, and who is distracted.
The design prioritizes Immediacy of Intervention. By using visual flags
and integrated communication, we reduce the "click-distance" between
identifying a problem and addressing it. The aesthetic is 16-bit Pixel Art,
humanizing the digital experience through gamification while maintaining a
professional, data-driven backbone.

2. Core Functionalities

Real-Time Learner Telemetry
The dashboard tracks every learner’s status (Online/Offline) and their
current pedagogical step (Reflect, Engage with Content, Quiz, or
Assignment). This data must update live as the learner progresses.

Externalized Unresponsiveness Logic
The dashboard does not calculate unresponsiveness; it acts as a listener.
When a learner's UI detects inactivity based on local rules (e.g., no clicks for
X minutes), it sends a signal. The dashboard must immediately flag that
specific card with a high-visibility "Unresponsive" state.
Teacher Command Dashboard: Synchronous Learning Enhancement

Integrated Bi-Directional Communication
A communication channel exists on every learner screen and the teacher's
dashboard. Teachers can send "Nudges" (pre-set or custom). Learners can
reply directly. The interaction must be persistent across UI phases.

Comparative Quiz Tracking
Teachers must see quiz results in real-time. Crucially, the system must
support "Iterative Learning"—tracking initial quiz scores and comparing
them to scores updated after group discussions.

Dynamic Synchronous Grouping
A dual-mode grouping system:
Auto-Divide: Randomly allocates online learners into groups.
Custom-Divide: A drag-and-drop interface for precise manual
adjustment.

3. Technical & Design Implementation

Theme: 16-bit Pixel Art Icons & Gamified UI

The Priority Grid System
The main dashboard consists of a scrollable grid of pixel-art learner cards. To
prevent critical issues from being "buried" in large classes, the grid implements
a Priority Top Row. Any learner flagged as "Unresponsive" or "Needs Help" is
automatically floated to the top of the grid, ensuring visibility regardless of
scroll position.
The Accordion Expansion Interaction
Clicking a learner card must trigger an in-situ expansion. The card expands
vertically (roughly 2x-3x height), shifting subsequent rows downward. This
expanded state reveals:
◦
◦

- Detailed conversation history (chat thread).
- Specific question-by-question quiz performance.
- Quick-action "Nudge" buttons (Presets: "Are you still there?", "Need
help?").
- Direct custom text input.

The Sticky Group Management Sidebar
The Group Management Sidebar is pinned to the right. While the main learner
grid scrolls vertically, the sidebar remains sticky. This allows the teacher to scroll
through a large list of 40+ learners while dragging their cards into group
"buckets" on the right. Once "Custom Divide" is toggled, this sidebar slides into
view.

4. Implementation Notes for the Agent

Constraint: This dashboard is an enhancement to an existing project. Do
not overwrite existing data schemas. Integrate these UI/UX patterns as
modular additions.
State Management: Ensure that the "Expanded Card" state and "Group
Sidebar" visibility are managed without refreshing the page, maintaining
the synchronous flow.
Persistence: Group assignments and chat histories must be saved to the
primary database (PostgreSQL/Supabase) for post-session review.

## Project Brief: Teacher Command Dashboard (Project Stella Logos)

Key Sections of the Brief:
Design Philosophy: Focuses on "Spatial Awareness" and "Immediacy of Intervention." It explains how the dashboard acts as a digital version of looking across a physical classroom to instantly spot learners who are struggling or disengaged.

The Priority Grid System: Outlines the requirement to float "Unresponsive" or "Needs Help" learners to the top row, ensuring they are never lost when scrolling through a large class.

Accordion Expansion Interaction: Details the specific "in-situ" expansion logic, where clicking a card reveals the chat history and quiz details by shifting the grid rather than opening a distracting pop-up.

Synchronous Grouping Mechanics: Defines the dual-mode system (Random Auto-Divide vs. Sticky Sidebar Custom Divide) with drag-and-drop functionality.

Aesthetic Guidelines: Formalizes the 16-bit Pixel Art theme to ensure a consistent, gamified, and engaging interface for both teachers and learners.
1. Core Philosophy: "Digital Spatial Awareness"
The objective is to provide the teacher with a synchronous, bird’s-eye view of the digital classroom. The interface must mimic the feeling of looking across a physical room to instantly identify which learners are progressing, who is stuck, and who has become disengaged. The aesthetic is 16-bit Pixel Art, intended to humanize and gamify the data-rich environment.

2. Integration Protocol (Critical)
Context: This design was developed as a modular enhancement. The developer did not have access to the current project's specific tech stack or code during the design phase.

Requirement: Do not restructure the existing project to fit this brief. Incorporate these features into the existing architecture. Bridge the technical gaps (e.g., state management, database updates, real-time protocols) using the established stack (Node.js, SQL/Supabase, etc.).

3. Functional Requirements
Real-Time Telemetry: Display live status (Online/Offline) and the specific pedagogical phase for every learner (Reflect → Content → Quiz → Assignment).

Unresponsiveness Listener: The dashboard must listen for "inactivity flags" sent from the learner's UI and immediately update the learner's card with a high-visibility state.

Bi-Directional Nudge System: A communication area on the dashboard and all learner screens. Teachers must have access to:

Preset Buttons: Quick pixel-art buttons (e.g., "Are you still there?", "Need help?").

Custom Messaging: A text input for personalized messages.

Iterative Quiz Tracking: Display initial quiz results and dynamically update them if a learner changes their answers during or after group discussions.

Dynamic Grouping:

Auto-Divide: A button to randomly assign online learners to groups.

Custom Divide: A toggle that opens a sidebar for manual drag-and-drop adjustments.

4. UI/UX Implementation Details
The Priority Grid: Implement a "Floating Top Row." Any learner flagged as "Unresponsive" or "Needs Help" must automatically move to the top of the grid so they remain visible regardless of vertical scroll.

The Accordion Expansion: Clicking a learner card must trigger an in-situ vertical expansion (shifting other cards down). This "Zoom" state reveals the full chat history, granular quiz data, and the communication interface.

Sticky Group Sidebar: When the "Custom Divide" sidebar is open, it must remain sticky on the right. This allows the teacher to scroll through a large grid of learners while dragging their avatars into group "buckets."

Visual Language: Maintain a clean, intuitive, and consistent pixel-art theme for all icons, avatars, and status indicators.

5. Technical Expectations for the Agent
State Persistence: Group assignments and chat logs must be stored in the primary database for post-session analytics.

Concurrency: Ensure the dashboard remains performant and "live" for classes of 30+ concurrent learners without requiring manual page refreshes.