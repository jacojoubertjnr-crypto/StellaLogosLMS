## Stella Logos: Full Learner UI Specification

1. Structural PhilosophyStella Logos utilizes a Themed Design System to separate functionality from aesthetics. The primary objective is Low Cognitive Load, guiding the learner through a state-driven environment without traditional complex menu systems.  Convention Note: Standard Framework components are in Bold. Bracketed names [e.g., The Great Portal] indicate the Medieval Theme mapping.  2. UI Hierarchy & NavigationLevel 0: LoginPortal [The Mystic Gate]  Level 1: HomeCrossroads [The Town Square]  Level 2: CurriculumGrid [The Royal Library]  Level 3: LearningTaskEngine [The Quest Path]  Level 2: ShopUI [The Merchant's Stall]  Level 2: SocialUI [The Messenger Bird]  Direct Path: PrimaryAction → LearningTaskEngine (Bypasses Level 2).  3. Detailed UI Definitions3.1 HomeCrossroads (Level 1)
The "Decision Hub" limited to five high-impact choices:  PrimaryAction [The Great Portal]: A "Smart Button" that queries the timetable and user state to immediately teleport the learner to their next scheduled learning task.  AttendanceModule [The Town Square]: Handles daily register/check-in.  CurriculumNavigator [The Royal Library]: Grid view of all subjects and general progress.  MarketplaceEntry [The Merchant Stall]: Shop for UI skins and rewards.  SocialHub [The Messenger Bird]: Tiled messaging and social feedback.  3.2 LearningTaskEngine (Level 3)
The guided quest interface:  LinearProgressRibbon [Path of Stones]: A visual timeline of task steps.  StepMarker [Waypoint Crystals]: Status indicator (Done/Active/Locked).  ContentViewport [The Magic Tome]: Interactive content area.  NavControl_Prev [The Step Back]: Allows revision of unlocked steps.  NavControl_Next [The Advance]: Saves state, awards points, and moves marker.  4. Intelligence & State LogicTimetable-Driven PrimaryAction: The system identifies the current period and student's progress marker. If a lesson is scheduled, the Home Page button dynamically updates (e.g., "Continue: IT Grade 12") and opens the specific current step.  Identity Injection: Themes change CSS variables globally across all levels.  State Persistence: Progress is saved instantly via Socket.io to the Data Vault.  

## AI Agent instructions
That’s great progress. Since the authentication is already functional, we can now build the HomeCrossroads [The Town Square] as the first post-login experience.  Because we are focusing on the screens and visuals first, the following instructions for your AI agent focus on creating a high-fidelity UI shell that uses hardcoded "Mock States" for everything except the authenticated user session.  Prompt 1: Visual Layout & Frontend Components (Hardcoded Logic)"Build the React component for the HomeCrossroads [The Town Square]. For now, assume the user is already authenticated but use a local mockData object for all progress and point values.Standard Framework Elements to build:Persistent Header: A top bar displaying the UserIdentity [The Knight’s Crest] (displaying the logged-in username) and a CurrencyCounter [The Gold Pouch] set to a static '1500 Gold'.  PrimaryAction [The Great Portal]: A large, high-visibility central button. Hardcode the label to 'CONTINUE QUEST: INTRO TO JAVA'.  UtilityGrid: A row of four interactive tiles: AttendanceModule [The Town Square], CurriculumNavigator [The Royal Library], SocialHub [The Messenger Bird], and MarketplaceEntry [The Merchant Stall].  Visual Requirements: Use a 16-bit pixel-art style. Apply 9-slice scaling to all frames to ensure stone textures remain crisp and sharp on all screen sizes."  Prompt 2: Theme-Driven Styling (CSS Variables)"Configure the CSS for the Stella Logos Medieval Theme. The goal is a 'State-Driven UI' where the visuals are controlled by variables.  Define the following variables in a global CSS file:--ui-frame-texture: A 16-bit stone border asset.  --button-plank: A weathered wood texture for buttons.  --primary-glow-effect: An animated blue pulse for the PrimaryAction.  Interactive States: Create pixel-art 'pressed' states. When a user clicks a button, it should visually shift downward by 2 pixels to simulate a mechanical press. The background should be a dark, seamless dungeon-floor tile."  Prompt 3: Navigation Mockup (Bypassing the Backend)"Set up the routing for the learner interface using react-router-dom. Use 'dummy' routes since the content backend isn't live yet.  Navigation Logic:PrimaryAction [The Great Portal]: Clicking this must bypass all menus and link directly to a placeholder LearningTaskEngine [The Quest Path].  CurriculumNavigator [The Royal Library]: This must link to a grid showing three static subjects: 'Java Development', 'Web Design', and 'Database Systems'.  The Home Loop: Ensure there is a way to navigate back to the HomeCrossroads from every placeholder screen."  Instruction for the AI AgentAdd this note to your agent's instructions:
"The current priority is to perfect the 'Identity Injection' look—meaning if I change the CSS variables manually, the entire home screen should change its theme without breaking the layout. Do not attempt to connect to the database for point totals or curriculum data yet; use a static mockState.js file for all learner data." 


## The attendance UI page
2. AI Agent Implementation Prompts
Prompt 1: State Management (Zustand)
"Create a Zustand store useEntryStore to manage expansion states. Include booleans: isTickerOpen, isTimetableOpen, isRosterOpen, and isChatOpen. Add a function toggleSection(sectionName) that ensures only one section is expanded at a time (accordion style) or allows multiple, depending on the UX preference."

Prompt 3: Click-to-Expand Components (Framer Motion)
"Develop a 'Smart Container' component. It should:

Wrap the Timetable and User Roster.

Use framer-motion to animate between a collapsed height (e.g., 40px) and an expanded height (e.g., 300px).

Listen for an onClick event on the entire div to trigger the expansion state.

Change the cursor to pointer and add a hover effect to indicate interactivity."

Prompt 3: Responsive Ticker Interaction
"Build a 'Teacher Alert Ticker.' Use a continuous CSS marquee for the collapsed state. When clicked, the component should transition into a centered modal using a scale-in animation, displaying the full message with a 'Click to Close' background overlay."

Prompt 4: Component Logic for Roster & Chat
"Implement the User Roster so that in its collapsed state, it renders a flex-row with overflow-hidden. Upon clicking, it should transition to a grid-cols-4 layout. Apply similar logic to the Class Chat, where clicking the latest message reveals the full Socket.io message history and the message input field."

## The messaging UI
Concept Strategy: The Integrated Learning Messenger
The core philosophy behind this messaging system is Contextual Continuity. In a standard LMS, communication is often fragmented (emails, forum posts, or external apps like WhatsApp/Teams). By embedding a high-quality, "Teams-style" chat directly into the LMS, we reduce "context switching"—the mental tax of moving between different platforms.

Key Strategic Pillars:
Learning Context: Messages aren't just text; they are tied to specific tasks. A teacher shouldn't ask "Which lesson are you on?" because the chat interface should already tell them.

Frictionless Initiation: Starting a 1-on-1 or a Group chat must be as fast as it is in a dedicated social app.

Accountability: Read receipts and history logging ensure that support requests from students don't "disappear," providing a safety net for both parties.

Detailed Technical Report: Chat System Architecture
1. The Interface (Front-End)
Dual-Pane Layout: A fixed-width left sidebar for navigation and a fluid right pane for the active conversation.

Dynamic Search: A real-time filter that searches both contact names and group titles.

Visual Indicators: * Online Status: Simple green/grey dots on avatars.

Read Receipts: Blue double-ticks for "Read," grey for "Delivered."

Context Tags: Small, non-intrusive labels at the top of message bubbles (e.g., Ref: Quiz 2) that link back to the specific LMS module being discussed.

2. The Data Model (PostgreSQL Back-End)
To support groups, history, and read receipts, the database uses a relational structure:

users: ID, Name, Role (Teacher/Student), AvatarURL.

conversations: ID, Type (Individual/Group), CreatedAt.

conversation_members: ConversationID, UserID, JoinedAt, LastReadMessageID (Crucial for read receipts).

messages: ID, ConversationID, SenderID, Content, ContextRef (LMS Task Link), Timestamp.

3. Real-Time Layer
WebSockets (Socket.io): To ensure messages appear instantly without refreshing the page.

Push Notifications: Integration for when users are in other parts of the LMS or offline.

AI Agent Blueprint: Implementation Instructions
You can copy and paste the block below into any advanced AI coding assistant (like Gemini, Cursor, or GPT-4) to generate the production-ready code.

Markdown
# TASK: Build a Real-Time Chat System for an LMS

## 1. Technical Stack
- Frontend: React.js with Tailwind CSS (Lucide-react for icons).
- Backend: Node.js/Express with PostgreSQL (Prisma or Sequelize ORM).
- Real-time: WebSockets (Socket.io).

## 2. Database Schema (SQL)
Create the following tables in PostgreSQL:
- Table 'users': id (uuid), name (text), role (enum), avatar_url (text).
- Table 'conversations': id (uuid), is_group (boolean), name (text, nullable).
- Table 'members': id (uuid), conversation_id (fkey), user_id (fkey), last_read_id (uuid).
- Table 'messages': id (uuid), conversation_id (fkey), sender_id (fkey), body (text), context_link (text, nullable), created_at (timestamp).

## 3. UI Requirements (React Component)
Build a layout consisting of:
- Sidebar: 
    - Top: Search bar + 'New Chat' (Select one user) + 'New Group' (Select multiple users).
    - List: Chat history showing last message and read-receipt checkmarks.
- Main Chat Pane:
    - Header: Recipient name/Group name + Online status.
    - Body: Scrollable message list. Differentiate 'Me' (Right, Blue) vs 'Them' (Left, Grey).
    - Context Tags: Render a small badge above messages if 'context_link' is present.
    - Footer: Input field with attachment icon and 'Send' button.

## 4. Feature Logic
- When a user clicks 'New Group', show a multi-select list of users.
- Implement 'Read Receipts': Update the 'last_read_id' in the 'members' table whenever a user opens a conversation or receives a new message while the chat is open.
- History: Load the last 50 messages by default, with 'load more' on scroll up.

## 5. Style Guidelines
- Use a 'Microsoft Teams' minimalist aesthetic. 
- Colors: Primary #005fb8 (Blue), Background #f5f5f5, Text #242424.
- Padding: Use generous white space (p-4 or p-6) to maintain a 'clean' look.
