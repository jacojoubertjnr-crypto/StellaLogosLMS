import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, gql } from '@apollo/client'
import { usePageBackground } from '@/hooks/usePageBackground'
import { useThemeVocab } from '@/hooks/useThemeVocab'
import { useAuthStore } from '@/stores/authStore'

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const MY_CONVERSATIONS = gql`
  query MyConversations {
    myConversations {
      id type name online memberCount unread
    }
  }
`

const CONVERSATION_MESSAGES = gql`
  query ConversationMessages($conversationId: ID!, $limit: Int) {
    conversationMessages(conversationId: $conversationId, limit: $limit) {
      id conversationId senderId senderName body time contextLink read
    }
  }
`

const MY_CLASSMATES = gql`
  query MyClassmates {
    myClassmates { id displayName role }
  }
`

const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: ID!, $body: String!) {
    sendMessage(conversationId: $conversationId, body: $body) {
      id conversationId senderId senderName body time contextLink read
    }
  }
`

const CREATE_CONVERSATION = gql`
  mutation CreateConversation($participantId: ID!) {
    createConversation(participantId: $participantId) {
      id type name online memberCount unread
    }
  }
`

const CREATE_GROUP_CHAT = gql`
  mutation CreateGroupChat($name: String!, $participantIds: [ID!]!) {
    createGroupChat(name: $name, participantIds: $participantIds) {
      id type name online memberCount unread
    }
  }
`

const MARK_CONVERSATION_READ = gql`
  mutation MarkConversationRead($conversationId: ID!) {
    markConversationRead(conversationId: $conversationId)
  }
`

// ─── Types ────────────────────────────────────────────────────────────────────

interface GQLConversation {
  id: string
  type: string
  name: string
  online: boolean
  memberCount?: number | null
  unread: number
}

interface GQLMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  time: string
  contextLink?: string | null
  read: boolean
}

interface GQLContact {
  id: string
  displayName: string
  role: string
}

// ── OnlineDot ─────────────────────────────────────────────────────────────────

const OnlineDot: React.FC<{ online: boolean }> = ({ online }) => (
  <span style={{
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
    background: online ? 'rgba(100,220,100,0.85)' : 'rgba(255,255,255,0.18)',
  }} />
)

// ── ConvRow ───────────────────────────────────────────────────────────────────

const ConvRow: React.FC<{ conv: GQLConversation; active: boolean; onClick: () => void }> = ({ conv, active, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '0.35rem 0.85rem',
      background: active ? 'rgba(255,215,0,0.07)' : 'transparent',
      borderLeft: `2px solid ${active ? 'rgba(255,215,0,0.55)' : 'transparent'}`,
      cursor: 'pointer', transition: 'background 0.12s',
      display: 'flex', flexDirection: 'column', gap: '0.15rem',
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,215,0,0.03)' }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
        <OnlineDot online={conv.online} />
        <span style={{ ...VT, fontSize: '0.95rem', letterSpacing: '1px', color: active ? 'rgba(255,215,0,1)' : 'rgba(255,215,0,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {conv.name}
        </span>
        {conv.type === 'group' && conv.memberCount != null && (
          <span style={{ ...VT, fontSize: '0.75rem', color: 'rgba(255,215,0,0.25)', flexShrink: 0 }}>
            {conv.memberCount}
          </span>
        )}
      </div>
      {conv.unread > 0 && (
        <span style={{ ...VT, fontSize: '0.75rem', minWidth: '18px', textAlign: 'center', padding: '0 4px', background: 'rgba(255,215,0,0.18)', color: 'rgba(255,215,0,0.9)', border: '1px solid rgba(255,215,0,0.35)', flexShrink: 0 }}>
          {conv.unread}
        </span>
      )}
    </div>
  </div>
)

// ── ContextTag ────────────────────────────────────────────────────────────────

const ContextTag: React.FC<{ label: string }> = ({ label }) => (
  <span style={{
    ...VT, fontSize: '0.75rem', letterSpacing: '1px',
    padding: '0 6px', border: '1px solid rgba(255,175,0,0.38)',
    color: 'rgba(255,175,0,0.8)', background: 'rgba(255,175,0,0.05)',
    alignSelf: 'flex-start', marginBottom: '2px',
  }}>
    ◈ {label}
  </span>
)

// ── MessageBubble ─────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ msg: GQLMessage; isGroup: boolean; myId: string }> = ({ msg, isGroup, myId }) => {
  const isMe = msg.senderId === myId
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
      alignSelf: isMe ? 'flex-end' : 'flex-start',
      maxWidth: '68%', gap: '2px',
    }}>
      {isGroup && !isMe && (
        <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.58)', paddingLeft: '2px' }}>
          {msg.senderName}
        </span>
      )}
      {msg.contextLink && <ContextTag label={msg.contextLink} />}
      <div style={{
        padding: '0.4rem 0.75rem',
        background: isMe ? 'rgba(60,160,190,0.18)' : 'rgba(255,215,0,0.10)',
        border: isMe ? '2px solid rgba(80,190,220,0.65)' : '2px solid rgba(255,215,0,0.55)',
      }}>
        <p style={{ ...VT, margin: 0, fontSize: '1.05rem', letterSpacing: '0.5px', color: isMe ? 'rgba(180,235,248,0.95)' : 'rgba(255,215,0,0.92)', lineHeight: 1.45 }}>
          {msg.body}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingRight: isMe ? '2px' : 0, paddingLeft: isMe ? 0 : '2px' }}>
        <span style={{ ...VT, fontSize: '0.75rem', color: 'rgba(255,215,0,0.42)' }}>{msg.time}</span>
        {isMe && (
          <span style={{ ...VT, fontSize: '0.8rem', color: 'rgba(100,200,255,0.75)' }}>✓✓</span>
        )}
      </div>
    </div>
  )
}

// ── Shared modal shell ────────────────────────────────────────────────────────

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
    style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={(e) => e.stopPropagation()}
      style={{ background: 'var(--color-modal-bg)', border: '1px solid rgba(255,215,0,0.3)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,215,0,0.1)', flexShrink: 0 }}>
        <span style={{ ...VT, fontSize: '1.4rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.9)' }}>{title}</span>
        <button
          onClick={onClose}
          style={{ ...VT, fontSize: '1rem', background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.6)', cursor: 'pointer', padding: '0.15rem 0.7rem', transition: 'border-color 0.12s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.8)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)' }}
        >✕</button>
      </div>
      {children}
    </motion.div>
  </motion.div>
)

// ── NewChatModal (single select) ──────────────────────────────────────────────

const NewChatModal: React.FC<{
  contacts: GQLContact[]
  loading: boolean
  onClose: () => void
  onSelect: (id: string) => void
}> = ({ contacts, loading, onClose, onSelect }) => (
  <ModalShell title="NEW CHAT" onClose={onClose}>
    <div style={{ overflowY: 'auto', padding: '0.4rem 0' }}>
      {loading ? (
        <p style={{ ...VT, textAlign: 'center', color: 'rgba(255,215,0,0.3)', fontSize: '1rem', padding: '1.5rem 1rem' }}>LOADING...</p>
      ) : contacts.length === 0 ? (
        <p style={{ ...VT, textAlign: 'center', color: 'rgba(255,215,0,0.22)', fontSize: '1rem', padding: '1.5rem 1rem' }}>NO CONTACTS FOUND</p>
      ) : (
        contacts.map(c => (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 1rem', cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,215,0,0.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <OnlineDot online={false} />
            <div>
              <p style={{ ...VT, margin: 0, fontSize: '1.15rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.85)' }}>{c.displayName}</p>
              <p style={{ ...VT, margin: 0, fontSize: '0.85rem', color: 'rgba(255,215,0,0.32)' }}>{c.role}</p>
            </div>
          </div>
        ))
      )}
    </div>
  </ModalShell>
)

// ── SocialUI [The Messenger Bird] ─────────────────────────────────────────────

export const SocialUI: React.FC = () => {
  const vocab = useThemeVocab()
  const { user } = useAuthStore()
  const myId = user?.id ?? ''

  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [input, setInput] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [groupMode, setGroupMode] = useState(false)
  const [groupSelected, setGroupSelected] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  usePageBackground('messages')

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: convsData } = useQuery(MY_CONVERSATIONS, { pollInterval: 5000 })
  const conversations: GQLConversation[] = convsData?.myConversations ?? []

  const { data: msgsData } = useQuery(CONVERSATION_MESSAGES, {
    variables: { conversationId: activeId, limit: 100 },
    skip: !activeId,
    pollInterval: 3000,
  })
  const messages: GQLMessage[] = msgsData?.conversationMessages ?? []

  const showContactsModal = showNewChat || groupMode
  const { data: contactsData, loading: contactsLoading } = useQuery(MY_CLASSMATES, {
    skip: !showContactsModal,
  })
  const contacts: GQLContact[] = contactsData?.myClassmates ?? []

  // ── Mutations ─────────────────────────────────────────────────────────────

  const [sendMessage] = useMutation(SEND_MESSAGE)
  const [createConversation] = useMutation(CREATE_CONVERSATION)
  const [createGroupChat] = useMutation(CREATE_GROUP_CHAT)
  const [markConversationRead] = useMutation(MARK_CONVERSATION_READ)

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [activeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const activeConv = conversations.find(c => c.id === activeId) ?? null
  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (id: string) => {
    setActiveId(id)
    markConversationRead({
      variables: { conversationId: id },
      refetchQueries: ['MyConversations'],
    })
  }

  const handleSend = async () => {
    if (!input.trim() || !activeId) return
    const body = input.trim()
    setInput('')
    await sendMessage({
      variables: { conversationId: activeId, body },
      refetchQueries: [
        { query: CONVERSATION_MESSAGES, variables: { conversationId: activeId, limit: 100 } },
        'MyConversations',
      ],
    })
  }

  const handleNewChat = async (participantId: string) => {
    setShowNewChat(false)
    try {
      const { data } = await createConversation({
        variables: { participantId },
        refetchQueries: ['MyConversations'],
      })
      if (data?.createConversation) {
        setActiveId(data.createConversation.id)
      }
    } catch {
      // conversation may already exist — it'll appear in the refreshed list
    }
  }

  const toggleGroupContact = (id: string) => setGroupSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const cancelGroupMode = () => { setGroupMode(false); setGroupSelected(new Set()) }

  const createGroupFromSelected = async () => {
    if (groupSelected.size < 1) return
    const members = contacts.filter(c => groupSelected.has(c.id))
    const autoName = members.length <= 2
      ? members.map(m => m.displayName.split(' ').pop()!).join(' & ')
      : `${members[0].displayName.split(' ').pop()} & ${members.length - 1} OTHERS`
    try {
      const { data } = await createGroupChat({
        variables: { name: autoName, participantIds: Array.from(groupSelected) },
        refetchQueries: ['MyConversations'],
      })
      if (data?.createGroupChat) {
        setActiveId(data.createGroupChat.id)
      }
    } catch {
      // silently fail — user can retry
    }
    cancelGroupMode()
  }

  return (
    <div className="theatrical-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      {/* Dual-pane — fills viewport below the 52px fixed header */}
      <div style={{
        display: 'flex', flexDirection: 'row',
        marginTop: '52px', height: 'calc(100vh - 52px)',
        maxWidth: '980px', width: '100%', alignSelf: 'center',
        borderStyle: 'solid',
        borderWidth: '0 2px 2px',
        borderImage: 'linear-gradient(to bottom, transparent, rgba(255,215,0,0.55)) 1',
      }}>

        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <div style={{
          width: '295px', flexShrink: 0,
          borderRight: 'none',
          display: 'flex', flexDirection: 'column', height: '100%',
          background: 'var(--color-pane-bg)',
        }}>

          {/* Sidebar header */}
          <div style={{ padding: '0.85rem 1rem 0.6rem', borderBottom: '1px solid rgba(255,215,0,0.1)', flexShrink: 0 }}>
            <div style={{ marginBottom: '0.6rem' }}>
              <p style={{ ...VT, margin: '0 0 0.1rem', fontSize: '0.75rem', letterSpacing: '4px', color: 'rgba(255,215,0,0.3)' }}>✦ ─── ✦</p>
              <span style={{ ...VT, fontSize: '1.5rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.88)' }}>{vocab.messagesPageTitle}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
              {([
                { label: '+ NEW CHAT',  action: () => setShowNewChat(true)  },
                { label: '+ NEW GROUP', action: () => setGroupMode(true) },
              ] as { label: string; action: () => void }[]).map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  style={{ flex: 1, ...VT, fontSize: '0.85rem', letterSpacing: '1px', background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.28)', color: 'rgba(255,215,0,0.7)', cursor: 'pointer', padding: '0.25rem 0', transition: 'border-color 0.12s, background 0.12s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.7)'; e.currentTarget.style.background = 'rgba(255,215,0,0.14)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.28)'; e.currentTarget.style.background = 'rgba(255,215,0,0.07)' }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH CONVERSATIONS..."
              style={{ width: '100%', ...VT, fontSize: '0.95rem', letterSpacing: '1px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,215,0,0.8)', padding: '0.25rem 0.6rem', outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)' }}
            />
          </div>

          {/* Conversation list / Group select mode */}
          {groupMode ? (
            <>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexShrink: 0 }}>
                <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.5)' }}>
                  {groupSelected.size} SELECTED
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={createGroupFromSelected}
                    disabled={groupSelected.size < 1}
                    style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', padding: '0.2rem 0.6rem', background: groupSelected.size > 0 ? 'rgba(255,215,0,0.12)' : 'transparent', border: `1px solid ${groupSelected.size > 0 ? 'rgba(255,215,0,0.45)' : 'rgba(255,215,0,0.15)'}`, color: groupSelected.size > 0 ? 'rgba(255,215,0,0.9)' : 'rgba(255,215,0,0.25)', cursor: groupSelected.size > 0 ? 'pointer' : 'default', transition: 'background 0.12s' }}
                    onMouseEnter={(e) => { if (groupSelected.size > 0) e.currentTarget.style.background = 'rgba(255,215,0,0.22)' }}
                    onMouseLeave={(e) => { if (groupSelected.size > 0) e.currentTarget.style.background = 'rgba(255,215,0,0.12)' }}
                  >CREATE</button>
                  <button
                    onClick={cancelGroupMode}
                    style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', padding: '0.2rem 0.6rem', background: 'transparent', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,215,0,0.45)', cursor: 'pointer', transition: 'border-color 0.12s, color 0.12s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)'; e.currentTarget.style.color = 'rgba(255,215,0,0.8)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)'; e.currentTarget.style.color = 'rgba(255,215,0,0.45)' }}
                  >CANCEL</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {contactsLoading ? (
                  <p style={{ ...VT, textAlign: 'center', color: 'rgba(255,215,0,0.3)', fontSize: '1rem', padding: '1.5rem 1rem' }}>LOADING...</p>
                ) : (
                  contacts.map(c => {
                    const isSelected = groupSelected.has(c.id)
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleGroupContact(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.85rem', cursor: 'pointer', background: isSelected ? 'rgba(255,215,0,0.07)' : 'transparent', borderLeft: `2px solid ${isSelected ? 'rgba(255,215,0,0.55)' : 'transparent'}`, transition: 'background 0.1s' }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,215,0,0.03)' }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ width: 14, height: 14, flexShrink: 0, border: `1px solid ${isSelected ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.25)'}`, background: isSelected ? 'rgba(255,215,0,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.1s, background 0.1s' }}>
                          {isSelected && <span style={{ ...VT, fontSize: '0.8rem', color: 'rgba(255,215,0,0.9)', lineHeight: 1 }}>✓</span>}
                        </div>
                        <OnlineDot online={false} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ ...VT, margin: 0, fontSize: '1.1rem', letterSpacing: '1px', color: isSelected ? 'rgba(255,215,0,1)' : 'rgba(255,215,0,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.displayName}</p>
                          <p style={{ ...VT, margin: 0, fontSize: '0.82rem', color: 'rgba(255,215,0,0.3)' }}>{c.role}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <p style={{ ...VT, textAlign: 'center', color: 'rgba(255,215,0,0.22)', fontSize: '1rem', padding: '1.5rem 1rem' }}>
                  {conversations.length === 0 ? 'NO CONVERSATIONS YET' : 'NO RESULTS'}
                </p>
              ) : (
                filtered.map(conv => (
                  <ConvRow key={conv.id} conv={conv} active={conv.id === activeId} onClick={() => handleSelect(conv.id)} />
                ))
              )}
            </div>
          )}

        </div>

        {/* ── Gradient divider ─────────────────────────────────────────────── */}
        <div style={{ width: '2px', flexShrink: 0, background: 'linear-gradient(to bottom, transparent, rgba(255,215,0,0.55))' }} />

        {/* ── Right chat pane ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: 'var(--color-pane-bg)' }}>
          {activeConv ? (
            <>
              {/* Chat header */}
              <div style={{ flexShrink: 0, padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <OnlineDot online={activeConv.online} />
                <div>
                  <span style={{ ...VT, fontSize: '1.5rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.92)' }}>
                    {activeConv.name}
                  </span>
                  <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.32)', marginLeft: '0.75rem' }}>
                    {activeConv.type === 'group'
                      ? `${activeConv.memberCount ?? ''} MEMBERS`
                      : activeConv.online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              {/* Message list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {messages.length === 0 && (
                  <p style={{ ...VT, textAlign: 'center', color: 'rgba(255,215,0,0.18)', fontSize: '1rem', marginTop: '2rem' }}>
                    NO MESSAGES YET — SAY HELLO!
                  </p>
                )}
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} isGroup={activeConv.type === 'group'} myId={myId} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input footer */}
              <div style={{ flexShrink: 0, padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,215,0,0.1)', display: 'flex', gap: '0.5rem' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="TYPE A MESSAGE..."
                  style={{ flex: 1, ...VT, fontSize: '1rem', letterSpacing: '1px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,215,0,0.85)', padding: '0.35rem 0.75rem', outline: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)' }}
                />
                <button
                  onClick={handleSend}
                  style={{ ...VT, fontSize: '1.1rem', letterSpacing: '2px', padding: '0.35rem 1.25rem', background: 'rgba(255,215,0,0.09)', border: '1px solid rgba(255,215,0,0.32)', color: 'rgba(255,215,0,0.88)', cursor: 'pointer', transition: 'background 0.12s', flexShrink: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,215,0,0.18)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,215,0,0.09)' }}
                >
                  SEND ▶
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ ...VT, fontSize: '1.2rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.18)' }}>
                SELECT A CONVERSATION
              </span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showNewChat && (
          <NewChatModal
            contacts={contacts}
            loading={contactsLoading}
            onClose={() => setShowNewChat(false)}
            onSelect={handleNewChat}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
