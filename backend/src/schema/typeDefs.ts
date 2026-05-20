export const typeDefs = `#graphql

  enum Role {
    Admin
    Teacher
    Learner
  }

  type User {
    id: ID!
    email: String!
    displayName: String!
    role: Role!
    pointsBalance: Int!
    paidStatus: Boolean!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type RegisterClass {
    id: ID!
    name: String!
    grade: Int!
  }

  type AcademicClass {
    id: ID!
    name: String!
    subject: String!
    totalSteps: Int!
    grade: Int!
    activeTaskId: ID
    activeTaskTitle: String
    activeTaskFormat: String
    activeTaskDueDate: String
  }

  type LearnerProgress {
    id: ID!
    learnerId: ID!
    academicClassId: ID!
    currentStep: Int!
    isLocked: Boolean!
  }

  # Progress record with embedded class metadata (used by learner quest screen)
  type LearnerProgressFull {
    id: ID!
    learnerId: ID!
    academicClassId: ID!
    currentStep: Int!
    isLocked: Boolean!
    className: String!
    subject: String!
    totalSteps: Int!
  }

  # Progress record with learner identity — returned by classProgress for the teacher dashboard
  type TeacherLearnerView {
    learnerId: ID!
    displayName: String!
    email: String!
    currentStep: Int!
    isLocked: Boolean!
    totalSteps: Int!
  }

  # Returned after a learner advances a step
  type StepResult {
    progress: LearnerProgress!
    pointsAwarded: Int!
    pointsBalance: Int!
    questComplete: Boolean!
  }

  # ── Shop ────────────────────────────────────────────────────────────────────

  type ShopItem {
    id: ID!
    name: String!
    itemType: String!
    subtype: String
    themeCompatibility: String!
    cost: Int!
    description: String!
    tag: String!
    scope: String!
    assetPath: String!
    # Ownership fields — resolved relative to the authenticated learner
    owned: Boolean!
    active: Boolean!
  }

  type PurchaseResult {
    item: ShopItem!
    pointsBalance: Int!
  }

  # ── Register Period ──────────────────────────────────────────────────────────

  type RegisterLearnerEntry {
    learnerId: ID!
    displayName: String!
    status: String!
    markedAt: String
  }

  type RegisterClassInfo {
    id: ID!
    name: String!
    grade: Int!
    learners: [RegisterLearnerEntry!]!
  }

  type ClassChatMessage {
    id: ID!
    senderId: ID!
    senderName: String!
    body: String!
    sentAt: String!
    fromMe: Boolean!
  }

  type Notice {
    id: ID!
    body: String!
    pinned: Boolean!
    createdAt: String!
    authorName: String!
  }

  # ── Direct Messaging (Teacher ↔ Learner nudges — teacher dashboard) ──────────

  type DirectMessage {
    id: ID!
    senderId: ID!
    senderName: String!
    body: String!
    sentAt: String!
    fromMe: Boolean!
  }

  # ── Conversations & Messages (Social UI + Learning Task group chat) ───────────

  type Message {
    id: ID!
    conversationId: ID!
    senderId: ID!
    senderName: String!
    body: String!
    time: String!
    contextLink: String
    read: Boolean!
  }

  type Conversation {
    id: ID!
    type: String!
    name: String!
    online: Boolean!
    memberCount: Int
    unread: Int!
    messages: [Message!]!
  }

  # ── Staffroom ────────────────────────────────────────────────────────────────

  type StaffMessage {
    id: ID!
    senderId: ID!
    senderName: String!
    body: String!
    isSpeakerPost: Boolean!
    sentAt: String!
  }

  type Announcement {
    id: ID!
    createdById: ID!
    createdBy: String!
    body: String!
    target: String!
    pinned: Boolean!
    createdAt: String!
  }

  type StaffroomState {
    speakerId: ID
    speakerName: String
  }

  # ── Learning Task Groups (Phase III cooperative learning) ─────────────────────

  type TaskGroupMember {
    learnerId: ID!
    displayName: String!
    role: String!
  }

  type TaskGroup {
    id: ID!
    academicClassId: ID!
    conversationId: ID!
    sessionDate: String!
    members: [TaskGroupMember!]!
  }

  # ── Learner-specific types ────────────────────────────────────────────────────

  # A simplified user record for contact lists and rosters
  type BasicUser {
    id: ID!
    displayName: String!
    role: String!
  }

  # Learner's view of their own register class (attendance + class roster)
  type LearnerRegisterView {
    id: ID!
    name: String!
    grade: Int!
    myStatus: String!
    roster: [RegisterLearnerEntry!]!
  }

  # Single attendance record for history display
  type AttendanceRecord {
    date: String!
    status: String!
    markedAt: String
  }

  # ── Learning Tasks (Phase 5d) ─────────────────────────────────────────────────

  type LearningTask {
    id: ID!
    title: String!
    subject: String!
    grade: String!
    templateType: String!    # 'hql' | 'general'
    totalTimeMin: Int!
    published: Boolean!
    folderPath: String!
    createdAt: String!
    updatedAt: String!
    quizQuestionCount: Int!
    blockCount: Int!
    stepLabels: [String!]!
  }

  input QuizOptionInput {
    letter: String!
    text: String!
    isCorrect: Boolean!
  }

  input QuizQuestionInput {
    number: Int!
    text: String!
    options: [QuizOptionInput!]!
    correctIndex: Int!
  }

  # One content block within an HQL step (VIDEO|DOCUMENT|AUDIO|TEXT|REFLECTION|QUIZ|DISCUSSION|ASSIGNMENT)
  input HqlBlockInput {
    id:           ID!
    stepNumber:   Int!
    blockType:    String!
    position:     Int!
    title:        String
    timeMin:      Int
    textContent:  String     # TEXT body / ASSIGNMENT instructions / DISCUSSION prompt
    filePath:     String     # VIDEO / DOCUMENT / AUDIO
    originalName: String
    data:         String     # JSON: REFLECTION→{questions} QUIZ→{quizRaw,questions} ASSIGNMENT→{allowedFormats}
  }

  # HQL task input — block-based: each step holds any number of blocks
  input HqlTaskInput {
    id:         ID             # pre-generated UUID from frontend
    title:      String!
    subject:    String!
    grade:      String!
    stepLabels: [String!]!
    blocks:     [HqlBlockInput!]!
  }

  input GeneralBlockInput {
    type: String!
    position: Int!
    title: String!
    timeMin: Int!
    data: String!           # JSON-stringified block data (embedUrl, discussionPrompt, etc.)
    filePath: String
    originalName: String
  }

  input GeneralTaskInput {
    id: ID                  # pre-generated UUID from frontend
    title: String!
    subject: String!
    grade: String!
    totalTimeMin: Int!
    blocks: [GeneralBlockInput!]!
    quizQuestions: [QuizQuestionInput!]  # collected from all quiz blocks
  }

  # ── System Config ────────────────────────────────────────────────────────────

  type SystemConfig {
    ltOntimePts:        Int!
    ltLatePts:          Int!
    themeCost:          Int!
    altBgCost:          Int!
    staticSpriteCost:   Int!
    movingSpriteCost:   Int!
    clickableSpriteCost: Int!
  }

  # ── Queries ──────────────────────────────────────────────────────────────────

  type Query {
    # Returns the authenticated user's profile
    me: User

    # Teacher: their assigned classes (Admin sees all)
    teacherClasses: [AcademicClass!]!

    # Teacher: all learners' progress for a given class (includes learner name + email)
    classProgress(academicClassId: ID!): [TeacherLearnerView!]!

    # Learner: their own progress across all enrolled classes
    myProgress: [LearnerProgressFull!]!

    # Full shop catalog with per-learner ownership/active status
    shopItems: [ShopItem!]!

    # Learner: only items they own (for profile/inventory screens)
    myInventory: [ShopItem!]!

    # Learner: their register class view — own status + full class roster
    myRegisterView: LearnerRegisterView

    # Learner: recent attendance history (most recent first)
    myAttendanceHistory(limit: Int): [AttendanceRecord!]!

    # Learner: all users in their enrolled classes (for starting new conversations)
    myClassmates: [BasicUser!]!

    # Teacher: their register class with today's roll call state
    myRegisterClass: RegisterClassInfo

    # Register class group chat (teacher + learners)
    registerChatMessages(registerClassId: ID!, limit: Int): [ClassChatMessage!]!

    # Notice board for a register class
    registerNotices(registerClassId: ID!): [Notice!]!

    # Learner: fetch message thread with their teacher (most recent first)
    myTeacherMessages(limit: Int): [DirectMessage!]!

    # Teacher: fetch message thread with a specific learner (most recent first)
    learnerMessages(learnerId: ID!, limit: Int): [DirectMessage!]!

    # All conversations the current user is a participant in
    myConversations: [Conversation!]!

    # Paginated messages for a single conversation
    conversationMessages(conversationId: ID!, limit: Int, offset: Int): [Message!]!

    # Learner: their task group for a given class today (if one exists)
    myTaskGroup(academicClassId: ID!): TaskGroup

    # Staffroom: all staff and admin (for roster strip + podium assignment)
    allStaff: [BasicUser!]!

    # Staffroom: all chat messages including speaker posts
    staffMessages(limit: Int): [StaffMessage!]!

    # Staffroom: only speaker-channel posts
    speakerMessages(limit: Int): [StaffMessage!]!

    # Staffroom: all announcements (staff view — no grade filter)
    allAnnouncements: [Announcement!]!

    # Learner: grade-filtered announcements (for AttendenceUI TeacherTicker)
    myAnnouncements: [Announcement!]!

    # Staffroom: who currently holds the podium
    staffroomState: StaffroomState!

    # Teacher: all learning tasks created by this teacher (or all if Admin)
    myTasks: [LearningTask!]!

    # Teacher: total task count (replaces hardcoded taskNumber badge)
    taskCount: Int!

    # Teacher: single task by id
    taskById(id: ID!): LearningTask

    # Teacher: raw block rows for an HQL task (JSON string), used to reload the creator
    hqlBlocks(taskId: ID!): String!

    # Teacher: raw block rows for a General task (JSON string), used to reload the creator
    generalBlocks(taskId: ID!): String!

    # ── Admin queries ────────────────────────────────────────────────────────

    adminUsers(role: String): [AdminUser!]!
    adminRegisterClasses: [AdminRegisterClass!]!
    adminAcademicClasses: [AdminAcademicClass!]!
    adminClassEnrollments(academicClassId: ID!): [AdminEnrollment!]!

    # Learner: points history (most recent first)
    myLedger(limit: Int): [LedgerEntry!]!

    # Teacher: xAPI activity summary per learner for a class
    activitySummary(academicClassId: ID!): [LearnerActivitySummary!]!

    # Public: all active custom themes (used by App.tsx to inject CSS variables)
    customThemes: [CustomTheme!]!

    # Admin: all custom themes including drafts
    adminThemes: [CustomTheme!]!

    # System pricing/config — readable by any authenticated user
    systemConfig: SystemConfig!
  }

  type LearnerActivitySummary {
    learnerId: ID!
    displayName: String!
    email: String!
    currentStep: Int!
    totalSteps: Int!
    eventCount: Int!
    lastActive: String
  }

  # ── Mutations ────────────────────────────────────────────────────────────────

  type Mutation {
    # Authenticate and receive a JWT
    login(email: String!, password: String!): AuthPayload!

    # Teacher: unlock a learner's next step
    unlockStep(learnerId: ID!, academicClassId: ID!): LearnerProgress!

    # Learner: advance their own step (only if not locked); awards points
    advanceStep(academicClassId: ID!): StepResult!

    # Learner: purchase a shop item (atomic — deducts points + grants ownership)
    purchaseItem(itemId: ID!): PurchaseResult!

    # Learner: equip an owned item (deactivates all others of the same type)
    equipItem(itemId: ID!): ShopItem!
    unequipItem(itemId: ID!): ShopItem!

    # Learner: send a message to their teacher
    sendToTeacher(body: String!): DirectMessage!

    # Teacher: send a message to a specific learner
    sendToLearner(learnerId: ID!, body: String!): DirectMessage!

    # Teacher: broadcast one message to multiple learners at once; returns send count
    sendBroadcast(learnerIds: [ID!]!, body: String!): Int!

    # Teacher: mark a learner's attendance for today
    markAttendance(registerClassId: ID!, learnerId: ID!, status: String!): RegisterLearnerEntry!

    # Teacher or Learner: send a message to the class group chat
    sendRegisterChat(registerClassId: ID!, body: String!): ClassChatMessage!

    # Teacher: create a notice
    createNotice(registerClassId: ID!, body: String!): Notice!

    # Teacher: pin or unpin a notice
    pinNotice(noticeId: ID!, pinned: Boolean!): Notice!

    # Teacher: delete a notice
    deleteNotice(noticeId: ID!): Boolean!

    # Teacher: dismiss class — posts a farewell group chat message
    dismissClass(registerClassId: ID!): ClassChatMessage!

    # Start a 1:1 conversation with another user (returns existing if already exists)
    createConversation(participantId: ID!): Conversation!

    # Create a named group chat
    createGroupChat(name: String!, participantIds: [ID!]!): Conversation!

    # Send a message into any conversation
    sendMessage(conversationId: ID!, body: String!, contextLink: String): Message!

    # Mark all unread messages in a conversation as read for the current user
    markConversationRead(conversationId: ID!): Boolean!

    # Teacher: create a learning task group for a class and assign roles
    createTaskGroup(academicClassId: ID!, memberRoles: [TaskGroupMemberInput!]!): TaskGroup!

    # Teacher/system: assign or change a member's role within a task group
    assignGroupRole(groupId: ID!, learnerId: ID!, role: String!): TaskGroupMember!

    # Learner: auto-join the active task session for their class (finds or creates a group of up to 4; empty slots are filled by bots on the frontend)
    joinActiveTaskSession(academicClassId: ID!): TaskGroup!

    # Staffroom: send to staff chat (isSpeakerPost only allowed if caller holds the podium)
    sendStaffMessage(body: String!, isSpeakerPost: Boolean): StaffMessage!

    # Staffroom: create a school-wide announcement
    createAnnouncement(body: String!, target: String!): Announcement!

    # Staffroom: pin or unpin an announcement (own = any teacher; others = admin only)
    pinAnnouncement(id: ID!, pinned: Boolean!): Announcement!

    # Staffroom: delete an announcement (own = any teacher; others = admin only)
    deleteAnnouncement(id: ID!): Boolean!

    # Staffroom: assign podium to a user (null = release); admin only
    assignPodium(userId: ID): StaffroomState!

    # Teacher: save or create an HQL learning task as draft
    saveHqlTask(input: HqlTaskInput!, publish: Boolean): LearningTask!

    # Teacher: save or create a General learning task as draft
    saveGeneralTask(input: GeneralTaskInput!, publish: Boolean): LearningTask!

    # Teacher: activate a published task for a class (sets format, enabled steps, due date)
    activateTask(academicClassId: ID!, taskId: ID!, format: String!, enabledSteps: [Int!]!, dueDate: String!): Boolean!

    # Teacher: toggle published flag on an existing task
    publishTask(id: ID!): LearningTask!

    # Teacher: delete a task (and all its steps/resources/questions)
    deleteTask(id: ID!): Boolean!

    # ── Admin mutations ──────────────────────────────────────────────────────

    adminCreateUser(email: String!, displayName: String!, password: String!, role: String!): AdminUser!
    adminUpdateUser(id: ID!, email: String, displayName: String, role: String, paidStatus: Boolean, newPassword: String): AdminUser!
    adminDeleteUser(id: ID!): Boolean!

    adminCreateRegisterClass(name: String!, grade: Int!, teacherId: ID): AdminRegisterClass!
    adminUpdateRegisterClass(id: ID!, name: String, grade: Int, teacherId: ID): AdminRegisterClass!
    adminDeleteRegisterClass(id: ID!): Boolean!

    adminCreateAcademicClass(name: String!, subject: String!, registerClassId: ID!, totalSteps: Int!, teacherId: ID): AdminAcademicClass!
    adminUpdateAcademicClass(id: ID!, name: String, subject: String, totalSteps: Int, teacherId: ID): AdminAcademicClass!
    adminDeleteAcademicClass(id: ID!): Boolean!

    adminEnrollLearner(learnerId: ID!, academicClassId: ID!): Boolean!
    adminUnenrollLearner(learnerId: ID!, academicClassId: ID!): Boolean!

    # Admin: delete a custom theme and its shop item
    adminDeleteTheme(themeName: String!): Boolean!

    # Admin: update system pricing config
    updateSystemConfig(
      ltOntimePts:        Int
      ltLatePts:          Int
      themeCost:          Int
      altBgCost:          Int
      staticSpriteCost:   Int
      movingSpriteCost:   Int
      clickableSpriteCost: Int
    ): SystemConfig!
  }

  input TaskGroupMemberInput {
    learnerId: ID!
    role: String!
  }

  # ── Economy ledger ───────────────────────────────────────────────────────────

  type LedgerEntry {
    id: ID!
    delta: Int!
    reason: String!
    meta: String
    createdAt: String!
  }

  # ── Admin types ──────────────────────────────────────────────────────────────

  type AdminUser {
    id: ID!
    email: String!
    displayName: String!
    role: String!
    paidStatus: Boolean!
  }

  type AdminRegisterClass {
    id: ID!
    name: String!
    grade: Int!
    teacherId: ID
    teacherName: String
    academicClassCount: Int!
  }

  type AdminAcademicClass {
    id: ID!
    name: String!
    subject: String!
    grade: Int!
    totalSteps: Int!
    registerClassId: ID!
    registerClassName: String!
    teacherId: ID
    teacherName: String
    enrolledCount: Int!
  }

  type AdminEnrollment {
    learnerId: ID!
    learnerName: String!
    learnerEmail: String!
  }

  # ── Custom Themes ─────────────────────────────────────────────────────────────

  type CustomTheme {
    id: ID!
    name: String!
    displayName: String!
    colorPrimary: String!
    colorSecondary: String!
    colorAccent: String!
    colorText: String!
    colorBgOverlay: String!
    status: String!
    shopItemId: ID
    createdAt: String!
  }
`;
