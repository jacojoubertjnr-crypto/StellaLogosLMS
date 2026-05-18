# Messaging System — Implementation Guide (Phase 9)

> **Status (as of 2026-05-10):** All steps **complete**. The database schema, GraphQL types, resolvers, seed data, and frontend wiring are all live. `SocialUI.tsx` is fully wired — zero mock data remaining.

This document gives a new AI agent everything needed to implement real database-backed messaging for `SocialUI`. Read it top to bottom before touching any file.

---

## Current State (as of Phase 9 — complete)

`SocialUI` (`src/pages/SocialUI.tsx`) is **fully wired to the real API**:

- `mockConversations`, `MockConversation`, and `MockMessage` have been removed from `src/mockState.ts`
- `useQuery(MY_CONVERSATIONS)` polls every 5 s for the sidebar list; `useQuery(CONVERSATION_MESSAGES)` polls every 3 s for the active chat pane
- `useQuery(MY_CLASSMATES)` lazily fetches contacts only when a new-chat or new-group modal is open
- `useMutation(SEND_MESSAGE)` sends and immediately refetches the active conversation
- `useMutation(CREATE_CONVERSATION)` / `useMutation(CREATE_GROUP_CHAT)` create real DB conversations
- `useMutation(MARK_CONVERSATION_READ)` fires on conversation select and clears the unread badge
- `isMe` is determined by comparing `msg.senderId` with `useAuthStore().user.id` — no hardcoded strings

---

## Reference Pattern — Follow the Shop

The Shop (Phase 6) is the canonical example of a fully wired feature in this project. Before writing anything, read:

- `backend/src/schema/typeDefs.ts` — how types, queries, and mutations are declared
- `backend/src/schema/resolvers.ts` — how resolvers authenticate via JWT context, query PostgreSQL, and return data
- `src/pages/ShopUI.tsx` — how `useQuery` and `useMutation` are used with Apollo Client
- `src/lib/apolloClient.ts` — the shared Apollo client (already configured, do not change it)

The JWT token is in `sessionStorage` under key `sl_token`. The Apollo `authLink` in `apolloClient.ts` attaches it automatically as a `Bearer` header. Resolvers receive it via `context.user` (see existing resolver pattern).

---

## Step 1 — Database Schema

File to edit: `backend/src/db/schema.sql`

### 1a. Add the `conversations` table (before the `messages` table)

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL CHECK (type IN ('individual', 'group')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1b. Add the `conversation_participants` table

```sql
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
```

### 1c. Add the `group_chat_metadata` table

```sql
CREATE TABLE IF NOT EXISTS group_chat_metadata (
  conversation_id UUID NOT NULL PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES users(id)
);
```

### 1d. Add the `message_read_status` table

```sql
CREATE TABLE IF NOT EXISTS message_read_status (
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
```

### 1e. Alter the existing `messages` table

The current `messages` table has an orphaned `thread_id UUID` with no FK and an irrelevant `receiver_id`. Replace it entirely:

```sql
-- Drop the old table and recreate cleanly (only safe because it has no real data yet)
DROP TABLE IF EXISTS messages;

CREATE TABLE IF NOT EXISTS messages (
  id              BIGSERIAL   PRIMARY KEY,
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  context_link    TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sent_at ASC);
```

> **Why drop and recreate?** The old `thread_id` has no FK, no data worth preserving, and the index name conflicts. Safer than ALTER TABLE for this stage.

---

## Step 2 — GraphQL Types

File to edit: `backend/src/schema/typeDefs.ts`

Add the following block **after the Shop types and before the `type Query` block**:

```graphql
# ── Messaging ────────────────────────────────────────────────────────────────

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
  type: String!        # "individual" or "group"
  name: String!
  online: Boolean!     # true if any other participant was active in the last 5 minutes
  memberCount: Int     # only populated for group conversations
  unread: Int!
  messages: [Message!]!
}
```

Add to `type Query`:

```graphql
# Fetch all conversations the current user is part of (latest message included)
myConversations: [Conversation!]!

# Fetch paginated messages for a single conversation
conversationMessages(conversationId: ID!, limit: Int, offset: Int): [Message!]!
```

Add to `type Mutation`:

```graphql
# Start a 1:1 conversation with another user (returns existing one if it already exists)
createConversation(participantId: ID!): Conversation!

# Create a group chat
createGroupChat(name: String!, participantIds: [ID!]!): Conversation!

# Send a message into a conversation
sendMessage(conversationId: ID!, body: String!, contextLink: String): Message!

# Mark all messages in a conversation as read for the current user
markConversationRead(conversationId: ID!): Boolean!
```

---

## Step 3 — Resolvers

File to edit: `backend/src/schema/resolvers.ts`

Follow the exact same authentication pattern used by every existing resolver:

```typescript
// At the top of every resolver that requires auth:
if (!context.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
const userId = context.user.id  // UUID string
```

### Query: `myConversations`

```typescript
myConversations: async (_: unknown, __: unknown, context: Context) => {
  if (!context.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
  const userId = context.user.id

  const { rows } = await pool.query(`
    SELECT
      c.id,
      c.type,
      COALESCE(g.name, u.display_name) AS name,
      -- latest message
      m.id          AS last_msg_id,
      m.content     AS last_msg_body,
      m.sender_id   AS last_msg_sender,
      m.sent_at     AS last_msg_time,
      -- unread count
      (
        SELECT COUNT(*)::int FROM messages msg
        LEFT JOIN message_read_status mrs ON mrs.message_id = msg.id AND mrs.user_id = $1
        WHERE msg.conversation_id = c.id AND msg.sender_id != $1 AND mrs.message_id IS NULL
      ) AS unread
    FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
    LEFT JOIN group_chat_metadata g ON g.conversation_id = c.id
    -- for individual chats, get the other participant's name
    LEFT JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != $1
    LEFT JOIN users u ON u.id = cp2.user_id
    LEFT JOIN LATERAL (
      SELECT * FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1
    ) m ON true
    ORDER BY m.sent_at DESC NULLS LAST
  `, [userId])

  return rows.map(r => ({
    id: r.id,
    type: r.type,
    name: r.name,
    online: false,        // implement with last_seen in a later pass
    memberCount: r.type === 'group' ? null : undefined,
    unread: r.unread,
    messages: [],         // populated separately by conversationMessages resolver
  }))
},
```

### Query: `conversationMessages`

```typescript
conversationMessages: async (_: unknown, { conversationId, limit = 50, offset = 0 }: { conversationId: string; limit?: number; offset?: number }, context: Context) => {
  if (!context.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
  const userId = context.user.id

  const { rows } = await pool.query(`
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      u.display_name AS sender_name,
      m.content,
      m.context_link,
      m.sent_at,
      EXISTS (
        SELECT 1 FROM message_read_status mrs WHERE mrs.message_id = m.id AND mrs.user_id = $2
      ) AS read
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1
    ORDER BY m.sent_at ASC
    LIMIT $3 OFFSET $4
  `, [conversationId, userId, limit, offset])

  return rows.map(r => ({
    id: String(r.id),
    conversationId: r.conversation_id,
    senderId: r.sender_id === userId ? 'me' : r.sender_id,
    senderName: r.sender_name,
    body: r.content,
    time: new Date(r.sent_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }),
    contextLink: r.context_link ?? null,
    read: r.read,
  }))
},
```

### Mutation: `createConversation`

```typescript
createConversation: async (_: unknown, { participantId }: { participantId: string }, context: Context) => {
  if (!context.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
  const userId = context.user.id

  // Return existing 1:1 conversation if it already exists
  const existing = await pool.query(`
    SELECT c.id FROM conversations c
    JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
    JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
    WHERE c.type = 'individual'
    LIMIT 1
  `, [userId, participantId])

  if (existing.rows.length > 0) {
    // Return the existing conversation (caller should then call conversationMessages)
    const id = existing.rows[0].id
    return { id, type: 'individual', name: '', online: false, unread: 0, messages: [] }
  }

  const { rows } = await pool.query(`INSERT INTO conversations (type) VALUES ('individual') RETURNING id`)
  const convId = rows[0].id
  await pool.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`, [convId, userId, participantId])

  const { rows: uRows } = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [participantId])
  return { id: convId, type: 'individual', name: uRows[0]?.display_name ?? '', online: false, unread: 0, messages: [] }
},
```

### Mutation: `createGroupChat`

```typescript
createGroupChat: async (_: unknown, { name, participantIds }: { name: string; participantIds: string[] }, context: Context) => {
  if (!context.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
  const userId = context.user.id
  const allParticipants = [userId, ...participantIds]

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`INSERT INTO conversations (type) VALUES ('group') RETURNING id`)
    const convId = rows[0].id
    await client.query(`INSERT INTO group_chat_metadata (conversation_id, name, created_by) VALUES ($1,$2,$3)`, [convId, name, userId])
    for (const pid of allParticipants) {
      await client.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2)`, [convId, pid])
    }
    await client.query('COMMIT')
    return { id: convId, type: 'group', name, online: false, memberCount: allParticipants.length, unread: 0, messages: [] }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
},
```

### Mutation: `sendMessage`

```typescript
sendMessage: async (_: unknown, { conversationId, body, contextLink }: { conversationId: string; body: string; contextLink?: string }, context: Context) => {
  if (!context.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
  const userId = context.user.id

  const { rows } = await pool.query(`
    INSERT INTO messages (conversation_id, sender_id, content, context_link)
    VALUES ($1, $2, $3, $4)
    RETURNING id, sent_at
  `, [conversationId, userId, body, contextLink ?? null])

  const time = new Date(rows[0].sent_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
  return {
    id: String(rows[0].id),
    conversationId,
    senderId: 'me',
    senderName: context.user.displayName,
    body,
    time,
    contextLink: contextLink ?? null,
    read: false,
  }
},
```

### Mutation: `markConversationRead`

```typescript
markConversationRead: async (_: unknown, { conversationId }: { conversationId: string }, context: Context) => {
  if (!context.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
  const userId = context.user.id

  await pool.query(`
    INSERT INTO message_read_status (message_id, user_id)
    SELECT m.id, $2 FROM messages m
    WHERE m.conversation_id = $1
      AND m.sender_id != $2
      AND NOT EXISTS (
        SELECT 1 FROM message_read_status mrs WHERE mrs.message_id = m.id AND mrs.user_id = $2
      )
    ON CONFLICT DO NOTHING
  `, [conversationId, userId])

  return true
},
```

---

## Step 4 — Frontend Integration ✅ DONE

File: `src/pages/SocialUI.tsx` — fully rewritten. The implementation below is the reference for what was built.

### 4a. GraphQL operations defined in `SocialUI.tsx`

```typescript
import { useQuery, useMutation, gql } from '@apollo/client'

const MY_CONVERSATIONS = gql`
  query MyConversations {
    myConversations {
      id type name online memberCount unread
      messages { id conversationId senderId senderName body time contextLink read }
    }
  }
`
const CONVERSATION_MESSAGES = gql`
  query ConversationMessages($conversationId: ID!, $limit: Int, $offset: Int) {
    conversationMessages(conversationId: $conversationId, limit: $limit, offset: $offset) {
      id conversationId senderId senderName body time contextLink read
    }
  }
`
const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: ID!, $body: String!, $contextLink: String) {
    sendMessage(conversationId: $conversationId, body: $body, contextLink: $contextLink) {
      id conversationId senderId senderName body time contextLink read
    }
  }
`
const CREATE_CONVERSATION = gql`
  mutation CreateConversation($participantId: ID!) {
    createConversation(participantId: $participantId) {
      id type name online unread messages { id body }
    }
  }
`
const CREATE_GROUP_CHAT = gql`
  mutation CreateGroupChat($name: String!, $participantIds: [ID!]!) {
    createGroupChat(name: $name, participantIds: $participantIds) {
      id type name online memberCount unread messages { id body }
    }
  }
`
const MARK_READ = gql`
  mutation MarkConversationRead($conversationId: ID!) {
    markConversationRead(conversationId: $conversationId)
  }
`
```

### 4b. Replace state and handlers inside `SocialUI`

Remove:
```typescript
// DELETE these two lines:
import { mockConversations, type MockConversation, type MockMessage } from '@/mockState'
const [conversations, setConversations] = useState<MockConversation[]>(mockConversations)
```

Replace with:
```typescript
const { data, refetch } = useQuery(MY_CONVERSATIONS, { pollInterval: 5000 })
const conversations = data?.myConversations ?? []
```

Replace `handleSend`:
```typescript
const [sendMessageMutation] = useMutation(SEND_MESSAGE, { onCompleted: () => refetch() })

const handleSend = () => {
  if (!input.trim() || !activeId) return
  sendMessageMutation({ variables: { conversationId: activeId, body: input.trim() } })
  setInput('')
}
```

Replace `handleNewChat`:
```typescript
const [createConvMutation] = useMutation(CREATE_CONVERSATION, { onCompleted: (d) => { setActiveId(d.createConversation.id); refetch() } })

const handleNewChat = (id: string, _name: string) => {
  setShowNewChat(false)
  createConvMutation({ variables: { participantId: id } })
}
```

Replace `createGroupFromSelected`:
```typescript
const [createGroupMutation] = useMutation(CREATE_GROUP_CHAT, { onCompleted: (d) => { setActiveId(d.createGroupChat.id); refetch() } })

const createGroupFromSelected = () => {
  if (groupSelected.size < 1) return
  const members = ALL_CONTACTS.filter(c => groupSelected.has(c.id))
  const autoName = members.length <= 2
    ? members.map(m => m.name.split(' ').pop()!).join(' & ')
    : `${members[0].name.split(' ').pop()} & ${members.length - 1} OTHERS`
  createGroupMutation({ variables: { name: autoName, participantIds: [...groupSelected] } })
  cancelGroupMode()
}
```

Wire `markConversationRead` in `handleSelect`:
```typescript
const [markRead] = useMutation(MARK_READ)

const handleSelect = (id: string) => {
  setActiveId(id)
  markRead({ variables: { conversationId: id } })
  refetch()
}
```

### 4c. Update `activeConv` and `filtered` derivations

```typescript
// These still work if conversations shape matches — verify field names match GraphQL return
const activeConv = conversations.find((c: any) => c.id === activeId) ?? null
const filtered = conversations.filter((c: any) =>
  c.name.toLowerCase().includes(search.toLowerCase())
)
```

### 4d. Clean up mock types from `mockState.ts`

Once the above is working, delete from `src/mockState.ts`:
- The `MockMessage` interface
- The `MockConversation` interface
- The `mockConversations` array and its comment block

---

## Step 5 — Seed Data

File to edit: `backend/src/db/seed.ts`

After the test users are inserted, add seed conversations so the test learner account has real data to view:

1. Create one individual conversation between learner and teacher
2. Insert 2–3 messages into it
3. Create one group conversation ("10B Study Group")
4. Add learner + teacher as participants
5. Insert 2–3 messages

Follow the existing seed pattern: use `ON CONFLICT DO NOTHING` so the seed is safe to re-run.

---

## Step 6 — Apply and Test ✅ DONE

Run in order:

```powershell
# 1. Apply schema changes
cmd /c 'psql postgresql://postgres:1234@localhost:5432/stella_logos -f backend/src/db/schema.sql'

# 2. Re-run seed
cmd /c 'cd /d "...\backend" && npm run db:seed'

# 3. Restart backend
# (use Start-Process cmd pattern from CLAUDE.md)

# 4. Open http://localhost:5173 and navigate to Messages
```

**Verify:**
- Conversations list loads from DB (not mock)
- Sending a message persists after page reload
- Creating a new group chat appears in the list immediately
- Unread count clears when a conversation is opened

---

## Additional queries added beyond Phase 9 spec

The following learner-specific queries were added alongside the messaging system (all live, all seeded):

| Query | Purpose |
|---|---|
| `myRegisterView` | Learner's own register class — their attendance status + full class roster |
| `myAttendanceHistory(limit)` | Past attendance records, `YYYY-MM-DD` formatted |
| `myInventory` | Owned shop items only (not full catalog) |
| `myClassmates` | Other learners in the same class + their teacher — ready for the `SocialUI` contact list |

Migration files created:
- `backend/src/db/migrate_messages.sql` — conversation system
- `backend/src/db/migrate_register.sql` — register period tables (were missing from live DB)

---

## What Is NOT in Scope for Phase 9

- Real-time delivery via Socket.io (deferred to Phase 5 — Teacher Dashboard)
- Online presence indicators (requires `last_seen` timestamp on users table)
- Message pagination UI (the resolver supports `limit`/`offset` but the frontend loads all messages)
- File/image attachments
- Push notifications
