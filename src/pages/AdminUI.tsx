import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { usePageBackground } from '@/hooks/usePageBackground'

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }
const GOLD = '#FFD700'

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const ADMIN_USERS = gql`
  query AdminUsers($role: String) {
    adminUsers(role: $role) { id email displayName role paidStatus }
  }
`
const ADMIN_REGISTER_CLASSES = gql`
  query AdminRegisterClasses {
    adminRegisterClasses { id name grade teacherId teacherName academicClassCount }
  }
`
const ADMIN_ACADEMIC_CLASSES = gql`
  query AdminAcademicClasses {
    adminAcademicClasses { id name subject grade totalSteps registerClassId registerClassName teacherId teacherName enrolledCount }
  }
`
const ADMIN_CLASS_ENROLLMENTS = gql`
  query AdminClassEnrollments($academicClassId: ID!) {
    adminClassEnrollments(academicClassId: $academicClassId) { learnerId learnerName learnerEmail }
  }
`

const ADMIN_CREATE_USER = gql`
  mutation AdminCreateUser($email: String!, $displayName: String!, $password: String!, $role: String!) {
    adminCreateUser(email: $email, displayName: $displayName, password: $password, role: $role) { id }
  }
`
const ADMIN_UPDATE_USER = gql`
  mutation AdminUpdateUser($id: ID!, $email: String, $displayName: String, $role: String, $paidStatus: Boolean, $newPassword: String) {
    adminUpdateUser(id: $id, email: $email, displayName: $displayName, role: $role, paidStatus: $paidStatus, newPassword: $newPassword) { id }
  }
`
const ADMIN_DELETE_USER = gql`
  mutation AdminDeleteUser($id: ID!) { adminDeleteUser(id: $id) }
`

const ADMIN_CREATE_REG_CLASS = gql`
  mutation AdminCreateRegisterClass($name: String!, $grade: Int!, $teacherId: ID) {
    adminCreateRegisterClass(name: $name, grade: $grade, teacherId: $teacherId) { id }
  }
`
const ADMIN_UPDATE_REG_CLASS = gql`
  mutation AdminUpdateRegisterClass($id: ID!, $name: String, $grade: Int, $teacherId: ID) {
    adminUpdateRegisterClass(id: $id, name: $name, grade: $grade, teacherId: $teacherId) { id }
  }
`
const ADMIN_DELETE_REG_CLASS = gql`
  mutation AdminDeleteRegisterClass($id: ID!) { adminDeleteRegisterClass(id: $id) }
`

const ADMIN_CREATE_AC_CLASS = gql`
  mutation AdminCreateAcademicClass($name: String!, $subject: String!, $registerClassId: ID!, $totalSteps: Int!, $teacherId: ID) {
    adminCreateAcademicClass(name: $name, subject: $subject, registerClassId: $registerClassId, totalSteps: $totalSteps, teacherId: $teacherId) { id }
  }
`
const ADMIN_UPDATE_AC_CLASS = gql`
  mutation AdminUpdateAcademicClass($id: ID!, $name: String, $subject: String, $totalSteps: Int, $teacherId: ID) {
    adminUpdateAcademicClass(id: $id, name: $name, subject: $subject, totalSteps: $totalSteps, teacherId: $teacherId) { id }
  }
`
const ADMIN_DELETE_AC_CLASS = gql`
  mutation AdminDeleteAcademicClass($id: ID!) { adminDeleteAcademicClass(id: $id) }
`

const ADMIN_ENROLL = gql`
  mutation AdminEnrollLearner($learnerId: ID!, $academicClassId: ID!) {
    adminEnrollLearner(learnerId: $learnerId, academicClassId: $academicClassId)
  }
`

const SYSTEM_CONFIG_QUERY = gql`
  query SystemConfig {
    systemConfig {
      ltOntimePts ltLatePts themeCost altBgCost
      staticSpriteCost movingSpriteCost clickableSpriteCost
    }
  }
`

const UPDATE_SYSTEM_CONFIG = gql`
  mutation UpdateSystemConfig(
    $ltOntimePts: Int $ltLatePts: Int $themeCost: Int $altBgCost: Int
    $staticSpriteCost: Int $movingSpriteCost: Int $clickableSpriteCost: Int
  ) {
    updateSystemConfig(
      ltOntimePts: $ltOntimePts ltLatePts: $ltLatePts themeCost: $themeCost
      altBgCost: $altBgCost staticSpriteCost: $staticSpriteCost
      movingSpriteCost: $movingSpriteCost clickableSpriteCost: $clickableSpriteCost
    ) {
      ltOntimePts ltLatePts themeCost altBgCost
      staticSpriteCost movingSpriteCost clickableSpriteCost
    }
  }
`
const ADMIN_UNENROLL = gql`
  mutation AdminUnenrollLearner($learnerId: ID!, $academicClassId: ID!) {
    adminUnenrollLearner(learnerId: $learnerId, academicClassId: $academicClassId)
  }
`

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminUser { id: string; email: string; displayName: string; role: string; paidStatus: boolean }
interface SystemConfig { ltOntimePts: number; ltLatePts: number; themeCost: number; altBgCost: number; staticSpriteCost: number; movingSpriteCost: number; clickableSpriteCost: number }
interface AdminRegisterClass { id: string; name: string; grade: number; teacherId: string | null; teacherName: string | null; academicClassCount: number }
interface AdminAcademicClass { id: string; name: string; subject: string; grade: number; totalSteps: number; registerClassId: string; registerClassName: string; teacherId: string | null; teacherName: string | null; enrolledCount: number }
interface AdminEnrollment { learnerId: string; learnerName: string; learnerEmail: string }

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  ...VT,
  width: '100%',
  background: 'var(--color-pane-bg, rgba(0,0,0,0.6))',
  border: '1px solid rgba(255,215,0,0.3)',
  color: GOLD,
  fontSize: '1.05rem',
  padding: '0.35rem 0.6rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  ...VT,
  fontSize: '0.85rem',
  letterSpacing: '2px',
  color: 'rgba(255,215,0,0.5)',
  display: 'block',
  marginBottom: '2px',
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

function GoldBtn({ onClick, children, danger, dim }: { onClick: () => void; children: React.ReactNode; danger?: boolean; dim?: boolean }) {
  const color = danger ? 'rgba(255,80,60,0.8)' : dim ? 'rgba(255,215,0,0.35)' : 'rgba(255,215,0,0.75)'
  const border = danger ? 'rgba(255,80,60,0.5)' : dim ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.4)'
  return (
    <button
      onClick={onClick}
      style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', padding: '2px 10px', background: 'var(--color-pane-bg, rgba(0,0,0,0.4))', border: `1px solid ${border}`, color, cursor: 'pointer' }}
    >
      {children}
    </button>
  )
}

// ─── ExpandingCard ────────────────────────────────────────────────────────────

const ExpandingCard: React.FC<{ title: string; badge?: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, badge, isOpen, onToggle, children }) => (
  <div style={{ width: '100%', border: '1px solid rgba(255,215,0,0.2)', background: 'var(--color-pane-bg, rgba(0,0,0,0.45))' }}>
    <div
      onClick={onToggle}
      style={{ ...VT, height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.05)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.3rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)' }}>{title}</span>
        {badge && <span style={{ fontSize: '0.9rem', color: 'rgba(255,215,0,0.35)' }}>{badge}</span>}
      </div>
      <span style={{ fontSize: '1.1rem', color: 'rgba(255,215,0,0.45)', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
    </div>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ padding: '0.75rem 1.25rem 1.25rem', borderTop: '1px solid rgba(255,215,0,0.08)' }}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

const ConfirmDialog: React.FC<{ name: string; onConfirm: () => void; onCancel: () => void }> = ({ name, onConfirm, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: 'var(--color-modal-bg)', border: '1px solid rgba(255,80,60,0.4)', padding: '1.5rem', width: 'min(380px, 90vw)', ...VT }}>
      <p style={{ fontSize: '1.1rem', color: 'rgba(255,215,0,0.85)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
        DELETE <span style={{ color: 'rgba(255,80,60,0.9)' }}>{name}</span>?<br />
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,215,0,0.4)' }}>This cannot be undone.</span>
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <GoldBtn onClick={onCancel} dim>CANCEL</GoldBtn>
        <GoldBtn onClick={onConfirm} danger>DELETE</GoldBtn>
      </div>
    </div>
  </div>
)

// ─── UserModal ────────────────────────────────────────────────────────────────

interface UserModalState { displayName: string; email: string; password: string; paidStatus: boolean }

const UserModal: React.FC<{
  mode: 'create' | 'edit'
  forRole: 'Teacher' | 'Learner'
  initial?: AdminUser
  onSave: (v: UserModalState) => void
  onClose: () => void
}> = ({ mode, forRole, initial, onSave, onClose }) => {
  const [form, setForm] = useState<UserModalState>({
    displayName: initial?.displayName ?? '',
    email: initial?.email ?? '',
    password: '',
    paidStatus: initial?.paidStatus ?? false,
  })
  const set = (k: keyof UserModalState, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-modal-bg)', border: '1px solid rgba(255,215,0,0.3)', padding: '1.5rem', width: 'min(420px, 90vw)', ...VT }}>
        <p style={{ fontSize: '1.4rem', letterSpacing: '2px', color: GOLD, marginBottom: '1rem' }}>
          {mode === 'create' ? `ADD ${forRole.toUpperCase()}` : `EDIT ${forRole.toUpperCase()}`}
        </p>
        <FormField label="DISPLAY NAME">
          <input style={inputStyle} value={form.displayName} onChange={e => set('displayName', e.target.value)} />
        </FormField>
        <FormField label="EMAIL">
          <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </FormField>
        <FormField label={mode === 'create' ? 'PASSWORD' : 'NEW PASSWORD (leave blank to keep)'}>
          <input style={inputStyle} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder={mode === 'edit' ? '••••••••' : ''} />
        </FormField>
        <FormField label="PAID STATUS">
          <select style={inputStyle} value={form.paidStatus ? 'true' : 'false'} onChange={e => set('paidStatus', e.target.value === 'true')}>
            <option value="true">Paid</option>
            <option value="false">Unpaid</option>
          </select>
        </FormField>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <GoldBtn onClick={onClose} dim>CANCEL</GoldBtn>
          <GoldBtn onClick={() => onSave(form)}>SAVE</GoldBtn>
        </div>
      </div>
    </div>
  )
}

// ─── RegisterClassModal ───────────────────────────────────────────────────────

interface RegClassModalState { name: string; grade: string; teacherId: string }

const RegisterClassModal: React.FC<{
  mode: 'create' | 'edit'
  initial?: AdminRegisterClass
  teachers: AdminUser[]
  onSave: (v: RegClassModalState) => void
  onClose: () => void
}> = ({ mode, initial, teachers, onSave, onClose }) => {
  const [form, setForm] = useState<RegClassModalState>({
    name: initial?.name ?? '',
    grade: String(initial?.grade ?? '10'),
    teacherId: initial?.teacherId ?? '',
  })
  const set = (k: keyof RegClassModalState, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-modal-bg)', border: '1px solid rgba(255,215,0,0.3)', padding: '1.5rem', width: 'min(420px, 90vw)', ...VT }}>
        <p style={{ fontSize: '1.4rem', letterSpacing: '2px', color: GOLD, marginBottom: '1rem' }}>
          {mode === 'create' ? 'ADD REGISTER CLASS' : 'EDIT REGISTER CLASS'}
        </p>
        <FormField label="CLASS NAME">
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
        </FormField>
        <FormField label="GRADE">
          <input style={inputStyle} type="number" min="1" max="12" value={form.grade} onChange={e => set('grade', e.target.value)} />
        </FormField>
        <FormField label="TEACHER (optional)">
          <select style={inputStyle} value={form.teacherId} onChange={e => set('teacherId', e.target.value)}>
            <option value="">— None —</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}
          </select>
        </FormField>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <GoldBtn onClick={onClose} dim>CANCEL</GoldBtn>
          <GoldBtn onClick={() => onSave(form)}>SAVE</GoldBtn>
        </div>
      </div>
    </div>
  )
}

// ─── AcademicClassModal ───────────────────────────────────────────────────────

interface AcClassModalState { name: string; subject: string; registerClassId: string; totalSteps: string; teacherId: string }

const AcademicClassModal: React.FC<{
  mode: 'create' | 'edit'
  initial?: AdminAcademicClass
  teachers: AdminUser[]
  registerClasses: AdminRegisterClass[]
  onSave: (v: AcClassModalState) => void
  onClose: () => void
}> = ({ mode, initial, teachers, registerClasses, onSave, onClose }) => {
  const [form, setForm] = useState<AcClassModalState>({
    name: initial?.name ?? '',
    subject: initial?.subject ?? '',
    registerClassId: initial?.registerClassId ?? '',
    totalSteps: String(initial?.totalSteps ?? '6'),
    teacherId: initial?.teacherId ?? '',
  })
  const set = (k: keyof AcClassModalState, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-modal-bg)', border: '1px solid rgba(255,215,0,0.3)', padding: '1.5rem', width: 'min(420px, 90vw)', ...VT }}>
        <p style={{ fontSize: '1.4rem', letterSpacing: '2px', color: GOLD, marginBottom: '1rem' }}>
          {mode === 'create' ? 'ADD ACADEMIC CLASS' : 'EDIT ACADEMIC CLASS'}
        </p>
        <FormField label="CLASS NAME">
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
        </FormField>
        <FormField label="SUBJECT">
          <input style={inputStyle} value={form.subject} onChange={e => set('subject', e.target.value)} />
        </FormField>
        {mode === 'create' && (
          <FormField label="REGISTER CLASS (sets grade)">
            <select style={inputStyle} value={form.registerClassId} onChange={e => set('registerClassId', e.target.value)}>
              <option value="">— Select —</option>
              {registerClasses.map(rc => <option key={rc.id} value={rc.id}>{rc.name} (Gr.{rc.grade})</option>)}
            </select>
          </FormField>
        )}
        <FormField label="TOTAL STEPS">
          <input style={inputStyle} type="number" min="1" max="20" value={form.totalSteps} onChange={e => set('totalSteps', e.target.value)} />
        </FormField>
        <FormField label="TEACHER (optional)">
          <select style={inputStyle} value={form.teacherId} onChange={e => set('teacherId', e.target.value)}>
            <option value="">— None —</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}
          </select>
        </FormField>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <GoldBtn onClick={onClose} dim>CANCEL</GoldBtn>
          <GoldBtn onClick={() => onSave(form)}>SAVE</GoldBtn>
        </div>
      </div>
    </div>
  )
}

// ─── EnrollModal ──────────────────────────────────────────────────────────────

const EnrollModal: React.FC<{
  cls: AdminAcademicClass
  allLearners: AdminUser[]
  onClose: () => void
}> = ({ cls, allLearners, onClose }) => {
  const { data, refetch } = useQuery(ADMIN_CLASS_ENROLLMENTS, { variables: { academicClassId: cls.id }, fetchPolicy: 'network-only' })
  const [enrollLearner] = useMutation(ADMIN_ENROLL, { onCompleted: () => refetch() })
  const [unenrollLearner] = useMutation(ADMIN_UNENROLL, { onCompleted: () => refetch() })
  const [selectedLearner, setSelectedLearner] = useState('')

  const enrolled: AdminEnrollment[] = data?.adminClassEnrollments ?? []
  const enrolledIds = new Set(enrolled.map(e => e.learnerId))
  const available = allLearners.filter(l => !enrolledIds.has(l.id))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-modal-bg)', border: '1px solid rgba(255,215,0,0.3)', padding: '1.5rem', width: 'min(480px, 94vw)', maxHeight: '80vh', overflowY: 'auto', ...VT }}>
        <p style={{ fontSize: '1.4rem', letterSpacing: '2px', color: GOLD, marginBottom: '0.25rem' }}>ENROLLMENTS</p>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,215,0,0.4)', letterSpacing: '1px', marginBottom: '1rem' }}>{cls.name}</p>

        {enrolled.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,215,0,0.35)', marginBottom: '1rem' }}>No learners enrolled</p>
        ) : (
          <div style={{ marginBottom: '1rem' }}>
            {enrolled.map(e => (
              <div key={e.learnerId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,215,0,0.08)' }}>
                <div>
                  <span style={{ fontSize: '1rem', color: 'rgba(255,215,0,0.85)' }}>{e.learnerName}</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,215,0,0.35)', marginLeft: '0.5rem' }}>{e.learnerEmail}</span>
                </div>
                <GoldBtn danger onClick={() => unenrollLearner({ variables: { learnerId: e.learnerId, academicClassId: cls.id } })}>REMOVE</GoldBtn>
              </div>
            ))}
          </div>
        )}

        {available.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,215,0,0.15)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,215,0,0.45)', letterSpacing: '1px', marginBottom: '0.5rem' }}>ENROLL LEARNER</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                style={{ ...inputStyle, flex: 1 }}
                value={selectedLearner}
                onChange={e => setSelectedLearner(e.target.value)}
              >
                <option value="">— Select learner —</option>
                {available.map(l => <option key={l.id} value={l.id}>{l.displayName}</option>)}
              </select>
              <GoldBtn onClick={() => {
                if (!selectedLearner) return
                enrollLearner({ variables: { learnerId: selectedLearner, academicClassId: cls.id } })
                setSelectedLearner('')
              }}>
                ENROLL
              </GoldBtn>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <GoldBtn onClick={onClose} dim>CLOSE</GoldBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Row components ───────────────────────────────────────────────────────────

const RowWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,215,0,0.07)' }}>
    {children}
  </div>
)

const RowInfo: React.FC<{ main: string; sub?: string }> = ({ main, sub }) => (
  <div style={{ flex: 1, overflow: 'hidden' }}>
    <span style={{ ...VT, fontSize: '1rem', color: 'rgba(255,215,0,0.85)' }}>{main}</span>
    {sub && <span style={{ ...VT, fontSize: '0.75rem', color: 'rgba(255,215,0,0.35)', marginLeft: '0.6rem' }}>{sub}</span>}
  </div>
)

const RowActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, marginLeft: '0.5rem' }}>{children}</div>
)

const AddBar: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    style={{ ...VT, width: '100%', padding: '0.5rem', marginBottom: '0.75rem', background: 'rgba(255,215,0,0.04)', border: '1px dashed rgba(255,215,0,0.25)', color: 'rgba(255,215,0,0.55)', fontSize: '0.95rem', letterSpacing: '2px', cursor: 'pointer' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.09)'; e.currentTarget.style.color = 'rgba(255,215,0,0.85)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.04)'; e.currentTarget.style.color = 'rgba(255,215,0,0.55)' }}
  >
    + {label}
  </button>
)

// ─── AdminUI ──────────────────────────────────────────────────────────────────

type OpenSection = 'teachers' | 'learners' | 'registerClasses' | 'academicClasses' | 'settings'

export const AdminUI: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  usePageBackground('home')

  const [openSection, setOpenSection] = useState<OpenSection | null>('teachers')
  const toggle = (s: OpenSection) => setOpenSection(o => o === s ? null : s)

  // Queries
  const refetchOpts = { fetchPolicy: 'network-only' as const }
  const { data: usersData, refetch: refetchUsers } = useQuery(ADMIN_USERS, refetchOpts)
  const { data: regData, refetch: refetchReg } = useQuery(ADMIN_REGISTER_CLASSES, refetchOpts)
  const { data: acData, refetch: refetchAc } = useQuery(ADMIN_ACADEMIC_CLASSES, refetchOpts)
  const { data: configData } = useQuery(SYSTEM_CONFIG_QUERY, refetchOpts)
  const serverConfig: SystemConfig = configData?.systemConfig ?? { ltOntimePts: 250, ltLatePts: 200, themeCost: 1000, altBgCost: 250, staticSpriteCost: 250, movingSpriteCost: 300, clickableSpriteCost: 350 }

  const [cfgForm, setCfgForm] = useState<SystemConfig | null>(null)
  const activeCfg: SystemConfig = cfgForm ?? serverConfig
  const [cfgSaved, setCfgSaved] = useState(false)
  const [updateConfig] = useMutation(UPDATE_SYSTEM_CONFIG, {
    onCompleted: () => { setCfgForm(null); setCfgSaved(true); setTimeout(() => setCfgSaved(false), 2000) },
  })

  const allUsers: AdminUser[] = usersData?.adminUsers ?? []
  const teachers = allUsers.filter(u => u.role === 'Teacher')
  const learners = allUsers.filter(u => u.role === 'Learner')
  const regClasses: AdminRegisterClass[] = regData?.adminRegisterClasses ?? []
  const acClasses: AdminAcademicClass[] = acData?.adminAcademicClasses ?? []

  // Mutations
  const [createUser] = useMutation(ADMIN_CREATE_USER, { onCompleted: () => refetchUsers() })
  const [updateUser] = useMutation(ADMIN_UPDATE_USER, { onCompleted: () => refetchUsers() })
  const [deleteUser] = useMutation(ADMIN_DELETE_USER, { onCompleted: () => { refetchUsers(); refetchAc() } })
  const [createReg] = useMutation(ADMIN_CREATE_REG_CLASS, { onCompleted: () => refetchReg() })
  const [updateReg] = useMutation(ADMIN_UPDATE_REG_CLASS, { onCompleted: () => refetchReg() })
  const [deleteReg] = useMutation(ADMIN_DELETE_REG_CLASS, { onCompleted: () => { refetchReg(); refetchAc() } })
  const [createAc] = useMutation(ADMIN_CREATE_AC_CLASS, { onCompleted: () => { refetchAc(); refetchReg() } })
  const [updateAc] = useMutation(ADMIN_UPDATE_AC_CLASS, { onCompleted: () => refetchAc() })
  const [deleteAc] = useMutation(ADMIN_DELETE_AC_CLASS, { onCompleted: () => { refetchAc(); refetchReg() } })

  // Modal state
  const [userModal, setUserModal] = useState<{ mode: 'create' | 'edit'; forRole: 'Teacher' | 'Learner'; user?: AdminUser } | null>(null)
  const [regModal, setRegModal] = useState<{ mode: 'create' | 'edit'; cls?: AdminRegisterClass } | null>(null)
  const [acModal, setAcModal] = useState<{ mode: 'create' | 'edit'; cls?: AdminAcademicClass } | null>(null)
  const [enrollModal, setEnrollModal] = useState<AdminAcademicClass | null>(null)
  const [confirm, setConfirm] = useState<{ type: 'user' | 'reg' | 'ac'; id: string; name: string } | null>(null)

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSaveUser(v: UserModalState) {
    if (!userModal) return
    if (userModal.mode === 'create') {
      if (!v.displayName.trim() || !v.email.trim() || !v.password.trim()) return
      createUser({ variables: { displayName: v.displayName, email: v.email, password: v.password, role: userModal.forRole } })
    } else if (userModal.user) {
      const vars: Record<string, unknown> = { id: userModal.user.id, displayName: v.displayName, email: v.email, paidStatus: v.paidStatus }
      if (v.password.trim()) vars.newPassword = v.password
      updateUser({ variables: vars })
    }
    setUserModal(null)
  }

  function handleSaveReg(v: RegClassModalState) {
    if (!regModal) return
    const grade = parseInt(v.grade, 10)
    if (!v.name.trim() || isNaN(grade)) return
    const teacherId = v.teacherId || null
    if (regModal.mode === 'create') {
      createReg({ variables: { name: v.name, grade, teacherId } })
    } else if (regModal.cls) {
      updateReg({ variables: { id: regModal.cls.id, name: v.name, grade, teacherId } })
    }
    setRegModal(null)
  }

  function handleSaveAc(v: AcClassModalState) {
    if (!acModal) return
    const totalSteps = parseInt(v.totalSteps, 10)
    if (!v.name.trim() || !v.subject.trim() || isNaN(totalSteps)) return
    const teacherId = v.teacherId || null
    if (acModal.mode === 'create') {
      if (!v.registerClassId) return
      createAc({ variables: { name: v.name, subject: v.subject, registerClassId: v.registerClassId, totalSteps, teacherId } })
    } else if (acModal.cls) {
      updateAc({ variables: { id: acModal.cls.id, name: v.name, subject: v.subject, totalSteps, teacherId } })
    }
    setAcModal(null)
  }

  function handleConfirmDelete() {
    if (!confirm) return
    if (confirm.type === 'user') deleteUser({ variables: { id: confirm.id } })
    if (confirm.type === 'reg') deleteReg({ variables: { id: confirm.id } })
    if (confirm.type === 'ac') deleteAc({ variables: { id: confirm.id } })
    setConfirm(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: 'calc(100vh - 52px)', marginTop: '52px', overflowY: 'auto', padding: '1.25rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <span style={{ ...VT, fontSize: '1.5rem', letterSpacing: '3px', color: GOLD }}>ADMIN PANEL</span>
          <span style={{ ...VT, fontSize: '0.8rem', color: 'rgba(255,215,0,0.3)', letterSpacing: '2px' }}>{user?.displayName?.toUpperCase()}</span>
        </div>

        {/* TEACHERS */}
        <ExpandingCard title="TEACHERS" badge={`${teachers.length} accounts`} isOpen={openSection === 'teachers'} onToggle={() => toggle('teachers')}>
          <AddBar label="ADD TEACHER" onClick={() => setUserModal({ mode: 'create', forRole: 'Teacher' })} />
          {teachers.map(t => (
            <RowWrap key={t.id}>
              <RowInfo main={t.displayName} sub={t.email} />
              <RowActions>
                <GoldBtn onClick={() => setUserModal({ mode: 'edit', forRole: 'Teacher', user: t })}>EDIT</GoldBtn>
                <GoldBtn danger onClick={() => setConfirm({ type: 'user', id: t.id, name: t.displayName })}>DEL</GoldBtn>
              </RowActions>
            </RowWrap>
          ))}
          {teachers.length === 0 && <p style={{ ...VT, fontSize: '0.85rem', color: 'rgba(255,215,0,0.3)' }}>No teachers found.</p>}
        </ExpandingCard>

        {/* LEARNERS */}
        <ExpandingCard title="LEARNERS" badge={`${learners.length} accounts`} isOpen={openSection === 'learners'} onToggle={() => toggle('learners')}>
          <AddBar label="ADD LEARNER" onClick={() => setUserModal({ mode: 'create', forRole: 'Learner' })} />
          {learners.map(l => (
            <RowWrap key={l.id}>
              <RowInfo main={l.displayName} sub={l.email} />
              <RowActions>
                <GoldBtn onClick={() => setUserModal({ mode: 'edit', forRole: 'Learner', user: l })}>EDIT</GoldBtn>
                <GoldBtn danger onClick={() => setConfirm({ type: 'user', id: l.id, name: l.displayName })}>DEL</GoldBtn>
              </RowActions>
            </RowWrap>
          ))}
          {learners.length === 0 && <p style={{ ...VT, fontSize: '0.85rem', color: 'rgba(255,215,0,0.3)' }}>No learners found.</p>}
        </ExpandingCard>

        {/* REGISTER CLASSES */}
        <ExpandingCard title="REGISTER CLASSES" badge={`${regClasses.length} classes`} isOpen={openSection === 'registerClasses'} onToggle={() => toggle('registerClasses')}>
          <AddBar label="ADD REGISTER CLASS" onClick={() => setRegModal({ mode: 'create' })} />
          {regClasses.map(rc => (
            <RowWrap key={rc.id}>
              <RowInfo
                main={rc.name}
                sub={`Gr.${rc.grade} · ${rc.teacherName ?? 'No teacher'} · ${rc.academicClassCount} subject class${rc.academicClassCount !== 1 ? 'es' : ''}`}
              />
              <RowActions>
                <GoldBtn onClick={() => setRegModal({ mode: 'edit', cls: rc })}>EDIT</GoldBtn>
                <GoldBtn danger onClick={() => setConfirm({ type: 'reg', id: rc.id, name: rc.name })}>DEL</GoldBtn>
              </RowActions>
            </RowWrap>
          ))}
          {regClasses.length === 0 && <p style={{ ...VT, fontSize: '0.85rem', color: 'rgba(255,215,0,0.3)' }}>No register classes found.</p>}
        </ExpandingCard>

        {/* ACADEMIC CLASSES */}
        <ExpandingCard title="ACADEMIC CLASSES" badge={`${acClasses.length} classes`} isOpen={openSection === 'academicClasses'} onToggle={() => toggle('academicClasses')}>
          <AddBar label="ADD ACADEMIC CLASS" onClick={() => setAcModal({ mode: 'create' })} />
          {acClasses.map(ac => (
            <RowWrap key={ac.id}>
              <RowInfo
                main={`${ac.name}`}
                sub={`${ac.subject} · Gr.${ac.grade} · ${ac.teacherName ?? 'No teacher'} · ${ac.enrolledCount} enrolled`}
              />
              <RowActions>
                <GoldBtn onClick={() => setEnrollModal(ac)}>LEARNERS</GoldBtn>
                <GoldBtn onClick={() => setAcModal({ mode: 'edit', cls: ac })}>EDIT</GoldBtn>
                <GoldBtn danger onClick={() => setConfirm({ type: 'ac', id: ac.id, name: ac.name })}>DEL</GoldBtn>
              </RowActions>
            </RowWrap>
          ))}
          {acClasses.length === 0 && <p style={{ ...VT, fontSize: '0.85rem', color: 'rgba(255,215,0,0.3)' }}>No academic classes found.</p>}
        </ExpandingCard>

        {/* SYSTEM SETTINGS */}
        <ExpandingCard title="SYSTEM SETTINGS" isOpen={openSection === 'settings'} onToggle={() => toggle('settings')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' }}>
            {([
              ['ltOntimePts',        'LT POINTS — ON TIME'],
              ['ltLatePts',          'LT POINTS — LATE'],
              ['themeCost',          'THEME COST'],
              ['altBgCost',          'ALT BACKGROUND COST'],
              ['staticSpriteCost',   'STATIC SPRITE COST'],
              ['movingSpriteCost',   'MOVING SPRITE COST'],
              ['clickableSpriteCost','CLICKABLE SPRITE COST'],
            ] as [keyof SystemConfig, string][]).map(([key, label]) => (
              <FormField key={key} label={label}>
                <input
                  style={{ ...inputStyle, maxWidth: '140px' }}
                  type="number"
                  min={0}
                  value={activeCfg[key]}
                  onChange={e => setCfgForm(f => ({ ...(f ?? serverConfig), [key]: parseInt(e.target.value, 10) || 0 }))}
                />
              </FormField>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <GoldBtn onClick={() => {
              updateConfig({ variables: { ...activeCfg } })
            }}>SAVE SETTINGS</GoldBtn>
            {cfgSaved && <span style={{ ...VT, fontSize: '0.9rem', color: 'rgba(80,255,120,0.7)', letterSpacing: '1px' }}>SAVED</span>}
            {cfgForm && <GoldBtn dim onClick={() => setCfgForm(null)}>RESET</GoldBtn>}
          </div>
        </ExpandingCard>

        {/* THEME ADDER */}
        <div style={{ border: `1px solid ${GOLD}44`, background: '#0e0e0e', padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ ...VT, color: GOLD, fontSize: '1.2rem', letterSpacing: '0.05em' }}>THEME ADDER</div>
            <div style={{ ...VT, color: 'rgba(255,215,0,0.4)', fontSize: '0.9rem' }}>Add a new visual theme — guided upload wizard, auto-registers in shop.</div>
          </div>
          <GoldBtn onClick={() => navigate('/theme-adder')}>OPEN WIZARD →</GoldBtn>
        </div>
      </motion.div>

      {/* Modals */}
      {userModal && (
        <UserModal
          mode={userModal.mode}
          forRole={userModal.forRole}
          initial={userModal.user}
          onSave={handleSaveUser}
          onClose={() => setUserModal(null)}
        />
      )}
      {regModal && (
        <RegisterClassModal
          mode={regModal.mode}
          initial={regModal.cls}
          teachers={teachers}
          onSave={handleSaveReg}
          onClose={() => setRegModal(null)}
        />
      )}
      {acModal && (
        <AcademicClassModal
          mode={acModal.mode}
          initial={acModal.cls}
          teachers={teachers}
          registerClasses={regClasses}
          onSave={handleSaveAc}
          onClose={() => setAcModal(null)}
        />
      )}
      {enrollModal && (
        <EnrollModal
          cls={enrollModal}
          allLearners={learners}
          onClose={() => setEnrollModal(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          name={confirm.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
