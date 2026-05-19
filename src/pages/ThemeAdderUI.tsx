import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, gql } from '@apollo/client'

// ── Style constants ───────────────────────────────────────────────────────────
const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }
const GOLD = '#FFD700'
const DIM  = '#9A7D0A'
const BG   = '#0a0a0a'

const labelStyle: React.CSSProperties = { ...VT, color: GOLD, fontSize: '1.1rem', letterSpacing: '0.05em' }
const inputStyle: React.CSSProperties = {
  ...VT, background: '#111', border: `1px solid ${GOLD}44`, color: GOLD,
  padding: '0.4rem 0.75rem', fontSize: '1.15rem', outline: 'none', width: '100%', borderRadius: 2,
}
const dimText: React.CSSProperties = { ...VT, color: DIM, fontSize: '0.95rem' }

// ── Asset manifest ─────────────────────────────────────────────────────────────
interface AssetDef {
  key: string
  label: string
  dims: string
  description: string
  group: number
}

interface AssetGroup {
  title: string
  tabLabel: string
  description: string
  assets: AssetDef[]
  placementKey?: string
  placementBgKey?: string
  placementSpriteKey?: string
  defaultPosition?: { x: number; y: number }
}

const ASSET_GROUPS: AssetGroup[] = [
  {
    title: 'BRANDING',
    tabLabel: 'BRANDING',
    description: 'Global assets shown on every page: the decorative banner strip, action buttons, and background music track.',
    assets: [
      { key: 'banner_top',     label: 'Top Banner Strip',               dims: '1920 × 96 px',      group: 0, description: 'Full-width decorative strip pinned to the very top of every page.' },
      { key: 'btn_primary',    label: 'Primary Action Button (Long)',   dims: '384 × 96 px',       group: 0, description: '9-slice button for wide action buttons. Centre stretches horizontally.' },
      { key: 'btn_primary_sq', label: 'Primary Action Button (Square)', dims: '128 × 128 px',      group: 0, description: 'Square variant for home-page tiles. Falls back to long button if skipped.' },
      { key: 'music_theme',    label: 'Background Music',               dims: 'WAV — seamless loop',group: 0, description: 'Looping WAV file. 1–3 minutes, clean loop point, under 10 MB.' },
    ],
  },
  {
    title: 'HOME PAGE',
    tabLabel: 'HOME',
    description: 'Background, purchasable alternative background, drifting sprite, and clickable sprite for the home hub.',
    assets: [
      { key: 'bg_home',        label: 'Background — Default',        dims: '1920 × 1080 px', group: 1, description: 'Hub scene. Warm and safe. Leave the bottom ~200 px clear for the mascot.' },
      { key: 'bg_home_alt',    label: 'Background — Alternative',    dims: '1920 × 1080 px', group: 1, description: 'Purchasable alternate home scene. Different weather, season, or time of day.' },
      { key: 'cloud_drift',    label: 'Moving Sprite',               dims: '320 × 80 px',    group: 1, description: 'Drifts continuously across the page. Transparent background.' },
      { key: 'rabbit_1',       label: 'Clickable Sprite — Frame 1',  dims: '96 × 96 px',     group: 1, description: 'First movement frame. Faces RIGHT. Transparent background.' },
      { key: 'rabbit_2',       label: 'Clickable Sprite — Frame 2',  dims: '96 × 96 px',     group: 1, description: 'Second movement frame.' },
      { key: 'rabbit_3',       label: 'Clickable Sprite — Frame 3',  dims: '96 × 96 px',     group: 1, description: 'Third movement frame. Loops back to frame 1.' },
      { key: 'rabbit_clicked', label: 'Clickable Sprite — Clicked',  dims: '96 × 96 px',     group: 1, description: 'Reaction frame when clicked.' },
    ],
  },
  {
    title: 'LEARNING TASK PAGE',
    tabLabel: 'STUDY',
    description: 'Background and purchasable alternative background for the learning task screen.',
    assets: [
      { key: 'bg_learningTask',     label: 'Background — Default',     dims: '1920 × 1080 px', group: 2, description: 'Focused work environment. Slightly cooler or more purposeful than home.' },
      { key: 'bg_learningTask_alt', label: 'Background — Alternative', dims: '1920 × 1080 px', group: 2, description: 'Purchasable alternate study environment.' },
    ],
  },
  {
    title: 'MY SUBJECTS PAGE',
    tabLabel: 'SUBJECTS',
    description: 'Background, purchasable alternative background, and the subject detail frame.',
    assets: [
      { key: 'bg_mySubjects',     label: 'Background — Default',     dims: '1920 × 1080 px', group: 3, description: 'Library, archive, or data vault. Rows of books / scrolls in the mid-ground.' },
      { key: 'bg_mySubjects_alt', label: 'Background — Alternative', dims: '1920 × 1080 px', group: 3, description: 'Purchasable alternate subjects scene.' },
      { key: 'subject_detail',    label: 'Subject Detail Frame',     dims: '900 × 700 px',   group: 3, description: 'Scroll, parchment, or chart behind the subject popup. Leave the centre area empty.' },
    ],
  },
  {
    title: 'ATTENDANCE PAGE',
    tabLabel: 'ATTENDANCE',
    description: 'Background, purchasable alternative background, and static sprite. After uploading the sprite frames, click the background to place it.',
    assets: [
      { key: 'bg_attendence',     label: 'Background — Default',     dims: '1920 × 1080 px', group: 4, description: 'Morning register / administrative space. Formal but warm.' },
      { key: 'bg_attendence_alt', label: 'Background — Alternative', dims: '1920 × 1080 px', group: 4, description: 'Purchasable alternate attendance scene.' },
      { key: 'fireplace_1',       label: 'Static Sprite — Frame 1',  dims: '128 × 160 px',   group: 4, description: 'First animation frame. Transparent background. Structure identical across all frames.' },
      { key: 'fireplace_2',       label: 'Static Sprite — Frame 2',  dims: '128 × 160 px',   group: 4, description: 'Second frame.' },
      { key: 'fireplace_3',       label: 'Static Sprite — Frame 3',  dims: '128 × 160 px',   group: 4, description: 'Third frame.' },
      { key: 'fireplace_4',       label: 'Static Sprite — Frame 4',  dims: '128 × 160 px',   group: 4, description: 'Fourth frame. Transitions seamlessly back to frame 1.' },
    ],
    placementKey:       'attendence_static',
    placementBgKey:     'bg_attendence',
    placementSpriteKey: 'fireplace_1',
    defaultPosition:    { x: 12, y: 72 },
  },
  {
    title: 'MESSAGES PAGE',
    tabLabel: 'MESSAGES',
    description: 'Background and purchasable alternative background for the messages screen.',
    assets: [
      { key: 'bg_messages',     label: 'Background — Default',     dims: '1920 × 1080 px', group: 5, description: 'Social space — tavern common room, plaza, network lounge.' },
      { key: 'bg_messages_alt', label: 'Background — Alternative', dims: '1920 × 1080 px', group: 5, description: 'Purchasable alternate messages scene.' },
    ],
  },
  {
    title: 'SHOP PAGE',
    tabLabel: 'SHOP',
    description: 'Background and purchasable alternative background for the shop screen.',
    assets: [
      { key: 'bg_shop',     label: 'Background — Default',     dims: '1920 × 1080 px', group: 6, description: 'Market hall, vendor stalls, item gallery. Richest visual detail of all pages.' },
      { key: 'bg_shop_alt', label: 'Background — Alternative', dims: '1920 × 1080 px', group: 6, description: 'Purchasable alternate shop scene.' },
    ],
  },
]

const SECTION_TABS: { label: string; step: number }[] = [
  { label: 'COLOURS', step: 1 },
  ...ASSET_GROUPS.map((g, i) => ({ label: g.tabLabel, step: 2 + i })),
  { label: 'REVIEW', step: 2 + ASSET_GROUPS.length },
]

// ── Color palette definition ───────────────────────────────────────────────────
const COLOR_FIELDS: { key: string; label: string; description: string; default: string }[] = [
  { key: 'colorPrimary',   label: 'PRIMARY COLOR',   default: '#FFD700',           description: 'Main brand color — buttons, headings, active states.' },
  { key: 'colorSecondary', label: 'SECONDARY COLOR', default: '#C0A840',           description: 'Dimmer variant — borders, secondary text, hover states.' },
  { key: 'colorAccent',    label: 'ACCENT COLOR',    default: '#FF8C00',           description: 'Highlight pop — badges, notifications, call-to-action.' },
  { key: 'colorText',      label: 'TEXT COLOR',      default: '#FFFFFF',           description: 'Main readable text on dark backgrounds.' },
  { key: 'colorBgOverlay', label: 'OVERLAY COLOR',   default: 'rgba(0,0,0,0.55)', description: 'Tint applied over backgrounds behind UI. Use rgba(r,g,b,a) format.' },
]

// ── Asset → served path mapping ────────────────────────────────────────────────
const ASSET_REL_PATH: Record<string, string> = {
  banner_top:      'banner_top.png',
  btn_primary:     'btn_primary.png',
  btn_primary_sq:  'btn_primary_sq.png',
  music_theme:     'music/theme.wav',
  bg_home:             'home/background.png',
  bg_home_alt:         'home/background_alt.png',
  bg_learningTask:     'learningTask/background.png',
  bg_learningTask_alt: 'learningTask/background_alt.png',
  bg_attendence:       'attendence/background.png',
  bg_attendence_alt:   'attendence/background_alt.png',
  bg_mySubjects:       'mySubjects/background.png',
  bg_mySubjects_alt:   'mySubjects/background_alt.png',
  bg_messages:         'messages/background.png',
  bg_messages_alt:     'messages/background_alt.png',
  bg_shop:             'shop/background.png',
  bg_shop_alt:         'shop/background_alt.png',
  rabbit_1:        'home/rabbit/frame_1.png',
  rabbit_2:        'home/rabbit/frame_2.png',
  rabbit_3:        'home/rabbit/frame_3.png',
  rabbit_clicked:  'home/rabbit/clicked.png',
  cloud_drift:     'home/cloud_drift.png',
  fireplace_1:     'attendence/fireplace/frame_1.png',
  fireplace_2:     'attendence/fireplace/frame_2.png',
  fireplace_3:     'attendence/fireplace/frame_3.png',
  fireplace_4:     'attendence/fireplace/frame_4.png',
  subject_detail:  'mySubjects/subject.png',
}

// ── GraphQL ───────────────────────────────────────────────────────────────────
const ADMIN_THEMES_QUERY = gql`
  query ThemeDesignerAdminThemes {
    adminThemes {
      id name displayName
      colorPrimary colorSecondary colorAccent colorText colorBgOverlay
      status
    }
  }
`

interface AdminTheme {
  id: string
  name: string
  displayName: string
  colorPrimary: string
  colorSecondary: string
  colorAccent: string
  colorText: string
  colorBgOverlay: string
  status: string
}

type WizardMode = 'pick' | 'edit-pick' | 'create' | 'edit'
type AssetStatus = 'pending' | 'uploaded' | 'skipped'

// ── Component ─────────────────────────────────────────────────────────────────
export function ThemeAdderUI() {
  const navigate = useNavigate()

  const [mode, setMode] = useState<WizardMode>('pick')
  const [step, setStep] = useState(0)

  const [themeName,   setThemeName]   = useState('')
  const [displayName, setDisplayName] = useState('')
  const [nameError,   setNameError]   = useState('')

  const [colors, setColors] = useState<Record<string, string>>(
    Object.fromEntries(COLOR_FIELDS.map(f => [f.key, f.default]))
  )

  const [assetStatus,   setAssetStatus]   = useState<Record<string, AssetStatus>>(
    () => Object.fromEntries(ASSET_GROUPS.flatMap(g => g.assets).map(a => [a.key, 'pending']))
  )
  const [uploading,     setUploading]     = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({})
  const [previewUrls,   setPreviewUrls]   = useState<Record<string, string>>({})
  const [spritePositions, setSpritePositions] = useState<Record<string, { x: number; y: number }>>({})

  const [initDone,   setInitDone]   = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const { data: adminData, loading: adminLoading } = useQuery(ADMIN_THEMES_QUERY, {
    skip: mode !== 'edit-pick',
    fetchPolicy: 'network-only',
  })
  const existingThemes: AdminTheme[] = adminData?.adminThemes ?? []

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const token    = () => sessionStorage.getItem('sl_token') ?? ''
  const authHdrs = () => ({ Authorization: `Bearer ${token()}` })

  function resetState() {
    setStep(0)
    setThemeName('')
    setDisplayName('')
    setNameError('')
    setColors(Object.fromEntries(COLOR_FIELDS.map(f => [f.key, f.default])))
    setAssetStatus(Object.fromEntries(ASSET_GROUPS.flatMap(g => g.assets).map(a => [a.key, 'pending'])))
    setSelectedFiles({})
    Object.values(previewUrls).forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url) })
    setPreviewUrls({})
    setSpritePositions({})
    setInitDone(false)
    setFinalizing(false)
    setError('')
    setDone(false)
  }

  async function loadThemeForEdit(theme: AdminTheme) {
    resetState()
    setThemeName(theme.name)
    setDisplayName(theme.displayName)
    setColors({
      colorPrimary:   theme.colorPrimary,
      colorSecondary: theme.colorSecondary,
      colorAccent:    theme.colorAccent,
      colorText:      theme.colorText,
      colorBgOverlay: theme.colorBgOverlay,
    })
    setInitDone(true)

    try {
      const res = await fetch(`/theme/asset-status/${encodeURIComponent(theme.name)}`, { headers: authHdrs() })
      if (res.ok) {
        const status = await res.json() as Record<string, AssetStatus>
        setAssetStatus(status)
        const previews: Record<string, string> = {}
        for (const [key, st] of Object.entries(status)) {
          const rel = ASSET_REL_PATH[key]
          if (st === 'uploaded' && rel && !rel.endsWith('.wav')) {
            previews[key] = `/assets/themes/${theme.name}/${rel}?v=${Date.now()}`
          }
        }
        setPreviewUrls(previews)
      }
    } catch { /* ignore */ }

    setMode('edit')
    setStep(1)
  }

  function handleFileSelect(assetKey: string, file: File | null) {
    const old = previewUrls[assetKey]
    if (old?.startsWith('blob:')) URL.revokeObjectURL(old)
    setSelectedFiles(s => ({ ...s, [assetKey]: file }))
    if (file && file.type.startsWith('image/')) {
      setPreviewUrls(s => ({ ...s, [assetKey]: URL.createObjectURL(file) }))
    } else {
      setPreviewUrls(s => { const next = { ...s }; delete next[assetKey]; return next })
    }
  }

  function handleNameNext() {
    setNameError('')
    const slug = themeName.trim()
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(slug)) {
      setNameError('Use letters, digits, _ or - only. Must start with a letter.')
      return
    }
    if (!displayName.trim()) { setNameError('Display name is required.'); return }
    setStep(1)
  }

  async function handleColorsNext() {
    setError('')
    try {
      const res = await fetch('/theme/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdrs() },
        body: JSON.stringify({
          name:           themeName.trim(),
          displayName:    displayName.trim(),
          colorPrimary:   colors.colorPrimary,
          colorSecondary: colors.colorSecondary,
          colorAccent:    colors.colorAccent,
          colorText:      colors.colorText,
          colorBgOverlay: colors.colorBgOverlay,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Init failed'); return }
      setInitDone(true)
      setStep(2)
    } catch {
      setError('Network error — is the backend running?')
    }
  }

  async function handleUpload(assetKey: string) {
    const file = selectedFiles[assetKey]
    if (!file) return
    setUploading(assetKey)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(
        `/upload/theme-asset?themeName=${encodeURIComponent(themeName.trim())}&assetKey=${encodeURIComponent(assetKey)}`,
        { method: 'POST', headers: authHdrs(), body: fd },
      )
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Upload failed'); setUploading(null); return }

      setAssetStatus(s => ({ ...s, [assetKey]: 'uploaded' }))
      setSelectedFiles(s => ({ ...s, [assetKey]: null }))

      const old = previewUrls[assetKey]
      if (old?.startsWith('blob:')) URL.revokeObjectURL(old)
      const rel = ASSET_REL_PATH[assetKey]
      if (rel && !rel.endsWith('.wav')) {
        setPreviewUrls(s => ({ ...s, [assetKey]: `/assets/themes/${themeName.trim()}/${rel}?v=${Date.now()}` }))
      }
    } catch {
      setError('Upload failed — check your connection.')
    } finally {
      setUploading(null)
    }
  }

  async function handleSkip(assetKey: string) {
    setError('')
    try {
      const res = await fetch('/theme/skip-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdrs() },
        body: JSON.stringify({ themeName: themeName.trim(), assetKey }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Skip failed'); return }
      setAssetStatus(s => ({ ...s, [assetKey]: 'skipped' }))
    } catch {
      setError('Network error.')
    }
  }

  async function handleFinalize() {
    setFinalizing(true)
    setError('')
    try {
      const res = await fetch('/theme/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdrs() },
        body: JSON.stringify({ themeName: themeName.trim(), spritePositions }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Finalize failed'); setFinalizing(false); return }
      setDone(true)
    } catch {
      setError('Network error.')
      setFinalizing(false)
    }
  }

  // ── Step calculations ─────────────────────────────────────────────────────
  const groupIndex    = step - 2
  const currentGroup  = ASSET_GROUPS[groupIndex]
  const totalSteps    = 2 + ASSET_GROUPS.length + 1
  const lastGroupStep = 2 + ASSET_GROUPS.length - 1
  const finalizeStep  = 2 + ASSET_GROUPS.length

  const allAssetsResolved = currentGroup
    ? currentGroup.assets.every(a => assetStatus[a.key] !== 'pending')
    : false

  const needsPlacement  = !!currentGroup?.placementKey
  const placementDone   = !needsPlacement || !!spritePositions[currentGroup?.placementKey ?? '']

  const groupDone = mode === 'edit'
    ? true
    : allAssetsResolved && placementDone

  const isEditing   = mode === 'edit'
  const isAssetStep = step >= 2 && step <= lastGroupStep

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    const uploaded = Object.values(assetStatus).filter(s => s === 'uploaded').length
    const skipped  = Object.values(assetStatus).filter(s => s === 'skipped').length
    return (
      <div style={{ ...VT, background: BG, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ color: GOLD, fontSize: '2.5rem', marginBottom: '1rem' }}>
          {isEditing ? 'THEME UPDATED' : 'THEME ADDED'}
        </div>
        <div style={{ color: '#aaa', fontSize: '1.2rem', marginBottom: '0.5rem' }}>"{displayName}" is now live in the shop.</div>
        <div style={{ color: DIM, fontSize: '1rem', marginBottom: '2rem' }}>{uploaded} assets uploaded · {skipped} placeholders</div>
        <button onClick={() => navigate('/admin')} style={{ ...VT, background: GOLD, color: '#000', border: 'none', padding: '0.6rem 2rem', fontSize: '1.3rem', cursor: 'pointer' }}>
          ← BACK TO ADMIN
        </button>
      </div>
    )
  }

  // ── Mode picker ───────────────────────────────────────────────────────────
  if (mode === 'pick' || mode === 'edit-pick') {
    return (
      <div style={{ background: BG, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: '#111', borderBottom: `1px solid ${GOLD}33`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <button onClick={() => navigate('/admin')} style={{ ...VT, background: 'transparent', border: `1px solid ${GOLD}55`, color: GOLD, padding: '0.3rem 1rem', fontSize: '1.1rem', cursor: 'pointer' }}>
            ← ADMIN
          </button>
          <div style={{ ...VT, color: GOLD, fontSize: '1.6rem' }}>THEME DESIGNER</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '3rem 1.5rem' }}>
          <div style={{ maxWidth: 600, width: '100%' }}>

            {mode === 'pick' && (
              <AnimatePresence mode="wait">
                <motion.div key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <div style={{ ...VT, color: GOLD, fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>WHAT WOULD YOU LIKE TO DO?</div>
                  <div style={{ ...dimText, textAlign: 'center', marginBottom: '2.5rem' }}>Create a brand-new theme, or edit an existing one.</div>
                  <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => { resetState(); setMode('create'); setStep(0) }}
                      style={{ ...VT, background: GOLD, color: '#000', border: 'none', padding: '1rem 2.5rem', fontSize: '1.4rem', cursor: 'pointer', letterSpacing: '2px', minWidth: 200 }}
                    >
                      + CREATE NEW
                    </button>
                    <button
                      onClick={() => setMode('edit-pick')}
                      style={{ ...VT, background: 'transparent', color: GOLD, border: `1px solid ${GOLD}88`, padding: '1rem 2.5rem', fontSize: '1.4rem', cursor: 'pointer', letterSpacing: '2px', minWidth: 200 }}
                    >
                      ✎ EDIT EXISTING
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {mode === 'edit-pick' && (
              <AnimatePresence mode="wait">
                <motion.div key="edit-pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <button onClick={() => setMode('pick')} style={{ ...VT, background: 'transparent', border: `1px solid ${GOLD}44`, color: DIM, padding: '0.2rem 0.7rem', fontSize: '1rem', cursor: 'pointer' }}>← BACK</button>
                    <div style={{ ...VT, color: GOLD, fontSize: '2rem' }}>SELECT THEME TO EDIT</div>
                  </div>
                  <div style={{ ...dimText, marginBottom: '1.5rem' }}>Choose an existing theme to update its colours or replace individual assets.</div>

                  {adminLoading && <div style={{ ...VT, color: DIM, fontSize: '1.1rem' }}>Loading themes…</div>}
                  {!adminLoading && existingThemes.length === 0 && (
                    <div style={{ ...VT, color: '#666', fontSize: '1.1rem' }}>No custom themes found. Create one first.</div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {existingThemes.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => loadThemeForEdit(theme)}
                        style={{ ...VT, background: '#0e0e0e', border: `1px solid ${GOLD}33`, color: GOLD, padding: '0.75rem 1.25rem', fontSize: '1.15rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}99` }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${GOLD}33` }}
                      >
                        <div>
                          <div style={{ fontSize: '1.3rem', letterSpacing: '1px' }}>{theme.displayName}</div>
                          <div style={{ color: DIM, fontSize: '0.95rem' }}>{theme.name} · {theme.status}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {[theme.colorPrimary, theme.colorSecondary, theme.colorAccent, theme.colorText].map((c, i) => (
                            <div key={i} style={{ width: 18, height: 18, background: c, border: '1px solid #333', flexShrink: 0 }} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  const progressPct = Math.round((step / (totalSteps - 1)) * 100)

  return (
    <div style={{ background: BG, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#111', borderBottom: `1px solid ${GOLD}33`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <button
          onClick={() => { resetState(); setMode('pick') }}
          style={{ ...VT, background: 'transparent', border: `1px solid ${GOLD}55`, color: GOLD, padding: '0.3rem 1rem', fontSize: '1.1rem', cursor: 'pointer' }}
        >
          ← {isEditing ? 'THEMES' : 'ADMIN'}
        </button>
        <div style={{ ...VT, color: GOLD, fontSize: '1.6rem', flex: 1 }}>
          {isEditing ? `EDITING: ${displayName}` : 'NEW THEME'}
        </div>
        <div style={{ ...VT, color: DIM, fontSize: '1rem' }}>Step {step + 1} / {totalSteps}</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#222', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: GOLD, transition: 'width 0.3s' }} />
      </div>

      {/* Section tabs */}
      {initDone && (
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: `1px solid ${GOLD}22`, background: '#0a0a0a', flexShrink: 0, scrollbarWidth: 'none' }}>
          {SECTION_TABS.map(tab => {
            const active = step === tab.step
            return (
              <button
                key={tab.step}
                onClick={() => setStep(tab.step)}
                style={{ ...VT, fontSize: '0.88rem', padding: '0.45rem 0.9rem', border: 'none', borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent', background: active ? `${GOLD}11` : 'transparent', color: active ? GOLD : DIM, cursor: 'pointer', flexShrink: 0, letterSpacing: '0.05em', transition: 'color 0.15s, background 0.15s' }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: isAssetStep ? 1120 : 760, margin: '0 auto', width: '100%', padding: '2rem 1.5rem' }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>

              {/* ── STEP 0: Theme Name ── */}
              {step === 0 && mode === 'create' && (
                <div>
                  <div style={{ ...VT, color: GOLD, fontSize: '2rem', marginBottom: '0.25rem' }}>THEME NAME</div>
                  <div style={{ ...dimText, marginBottom: '1.5rem' }}>Choose a unique identifier and a human-friendly display name.</div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={labelStyle}>THEME SLUG</label>
                    <div style={{ ...dimText, marginBottom: '0.4rem' }}>Letters, digits, _ or - only. Must start with a letter. Used for folder names and CSS. Example: spacePirate, neonCity</div>
                    <input style={inputStyle} value={themeName} onChange={e => { setThemeName(e.target.value); setNameError('') }} placeholder="e.g. spacePirate" maxLength={40} />
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={labelStyle}>DISPLAY NAME</label>
                    <div style={{ ...dimText, marginBottom: '0.4rem' }}>Shown in the shop and admin panel. Example: Space Pirate, Neon City</div>
                    <input style={inputStyle} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Space Pirate" maxLength={60} />
                  </div>

                  {nameError && <div style={{ ...VT, color: '#ff4444', fontSize: '1rem', marginBottom: '1rem' }}>{nameError}</div>}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <GoldBtn onClick={handleNameNext}>NEXT — CHOOSE COLOURS →</GoldBtn>
                  </div>
                </div>
              )}

              {/* ── STEP 1: Colors ── */}
              {step === 1 && (
                <div>
                  <div style={{ ...VT, color: GOLD, fontSize: '2rem', marginBottom: '0.25rem' }}>COLOUR PALETTE</div>
                  <div style={{ ...dimText, marginBottom: '1.5rem' }}>
                    These colours are injected as CSS variables across the entire UI when this theme is active.
                    {isEditing && ' Changes will be saved when you click Next.'}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {COLOR_FIELDS.slice(0, 4).map(f => (
                      <div key={f.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ width: 40, height: 40, background: colors[f.key], border: '1px solid #333', borderRadius: 3 }} />
                        <div style={{ ...VT, color: DIM, fontSize: '0.75rem' }}>{f.label.split(' ')[0]}</div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: 40, height: 40, background: colors.colorBgOverlay, border: '1px solid #333', borderRadius: 3 }} />
                      <div style={{ ...VT, color: DIM, fontSize: '0.75rem' }}>OVERLAY</div>
                    </div>
                  </div>

                  {COLOR_FIELDS.map(f => (
                    <div key={f.key} style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <input
                        type={f.key === 'colorBgOverlay' ? 'text' : 'color'}
                        value={colors[f.key]}
                        onChange={e => setColors(c => ({ ...c, [f.key]: e.target.value }))}
                        style={f.key === 'colorBgOverlay'
                          ? { ...inputStyle, width: 220 }
                          : { width: 48, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }
                        }
                      />
                      <div>
                        <div style={labelStyle}>{f.label}</div>
                        <div style={dimText}>{f.description}</div>
                      </div>
                    </div>
                  ))}

                  {error && <div style={{ ...VT, color: '#ff4444', fontSize: '1rem', marginBottom: '1rem' }}>{error}</div>}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <GoldBtn variant="ghost" onClick={() => isEditing ? setMode('edit-pick') : setStep(0)}>← BACK</GoldBtn>
                    <GoldBtn onClick={handleColorsNext}>NEXT — UPLOAD ASSETS →</GoldBtn>
                  </div>
                </div>
              )}

              {/* ── STEPS 2–9: Asset groups ── */}
              {isAssetStep && currentGroup && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '2rem', alignItems: 'start' }}>

                  {/* Upload column */}
                  <div>
                    <div style={{ ...VT, color: GOLD, fontSize: '2rem', marginBottom: '0.25rem' }}>{currentGroup.title}</div>
                    <div style={{ ...dimText, marginBottom: '1.5rem' }}>{currentGroup.description}</div>

                    {currentGroup.assets.map(asset => {
                      const status  = assetStatus[asset.key]
                      const file    = selectedFiles[asset.key] ?? null
                      const busy    = uploading === asset.key
                      const preview = previewUrls[asset.key]
                      const isAudio = asset.key === 'music_theme'

                      return (
                        <div key={asset.key} style={{ marginBottom: '1.25rem', padding: '0.9rem 1rem', background: '#0e0e0e', border: `1px solid ${status === 'uploaded' ? GOLD + '55' : status === 'skipped' ? '#555' : '#222'}`, borderRadius: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                            <div style={{ ...VT, color: status === 'uploaded' ? GOLD : status === 'skipped' ? '#888' : '#ccc', fontSize: '1.15rem' }}>
                              {status === 'uploaded' ? '✓ ' : status === 'skipped' ? '⏭ ' : '○ '}{asset.label}
                            </div>
                            <div style={{ ...VT, color: DIM, fontSize: '0.9rem', textAlign: 'right' }}>{asset.dims}</div>
                          </div>
                          <div style={{ ...dimText, marginBottom: '0.7rem', fontSize: '0.9rem' }}>{asset.description}</div>

                          {!isAudio && preview && (
                            <div style={{ marginBottom: '0.75rem', display: 'inline-block', border: '1px solid #333', background: '#080808', overflow: 'hidden' }}>
                              <img src={preview} alt={asset.label} style={{ display: 'block', maxWidth: 300, maxHeight: 150, objectFit: 'contain', imageRendering: 'pixelated' }} />
                            </div>
                          )}

                          {isAudio && status === 'uploaded' && (
                            <div style={{ ...VT, color: DIM, fontSize: '0.95rem', marginBottom: '0.5rem' }}>♪ Audio file uploaded</div>
                          )}

                          {status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <input
                                ref={el => { fileInputRefs.current[asset.key] = el }}
                                type="file"
                                accept={isAudio ? 'audio/*' : 'image/*'}
                                style={{ display: 'none' }}
                                onChange={e => handleFileSelect(asset.key, e.target.files?.[0] ?? null)}
                              />
                              <button
                                onClick={() => fileInputRefs.current[asset.key]?.click()}
                                style={{ ...VT, background: '#1a1a1a', border: `1px solid ${GOLD}55`, color: GOLD, padding: '0.35rem 1rem', fontSize: '1.05rem', cursor: 'pointer' }}
                              >
                                {file ? `📎 ${file.name}` : 'SELECT FILE'}
                              </button>
                              {file && (
                                <button
                                  onClick={() => handleUpload(asset.key)}
                                  disabled={busy}
                                  style={{ ...VT, background: busy ? '#333' : GOLD, color: '#000', border: 'none', padding: '0.35rem 1rem', fontSize: '1.05rem', cursor: busy ? 'default' : 'pointer' }}
                                >
                                  {busy ? 'UPLOADING…' : 'UPLOAD ↑'}
                                </button>
                              )}
                              <button
                                onClick={() => handleSkip(asset.key)}
                                style={{ ...VT, background: 'transparent', border: '1px solid #555', color: '#777', padding: '0.35rem 0.9rem', fontSize: '1rem', cursor: 'pointer' }}
                              >
                                SKIP
                              </button>
                            </div>
                          )}

                          {(status === 'uploaded' || status === 'skipped') && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <div style={{ ...VT, color: status === 'uploaded' ? GOLD : '#777', fontSize: '0.95rem' }}>
                                {status === 'uploaded' ? 'Uploaded successfully.' : 'Placeholder created — add the real file later.'}
                              </div>
                              <button
                                onClick={() => { setAssetStatus(s => ({ ...s, [asset.key]: 'pending' })); setSelectedFiles(s => ({ ...s, [asset.key]: null })) }}
                                style={{ ...VT, background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.2rem 0.6rem', fontSize: '0.85rem', cursor: 'pointer' }}
                              >
                                {status === 'uploaded' ? 'REPLACE' : 'ADD FILE'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Placement picker — only for static sprite groups, only after assets resolved */}
                    {currentGroup.placementKey && allAssetsResolved && (
                      <PlacementPicker
                        bgUrl={previewUrls[currentGroup.placementBgKey ?? ''] ?? null}
                        spriteUrl={previewUrls[currentGroup.placementSpriteKey ?? ''] ?? null}
                        position={spritePositions[currentGroup.placementKey] ?? null}
                        onPlace={pos => {
                          if (pos) {
                            setSpritePositions(s => ({ ...s, [currentGroup.placementKey!]: pos }))
                          } else {
                            setSpritePositions(s => { const next = { ...s }; delete next[currentGroup.placementKey!]; return next })
                          }
                        }}
                        onUseDefault={() => {
                          setSpritePositions(s => ({ ...s, [currentGroup.placementKey!]: currentGroup.defaultPosition! }))
                        }}
                      />
                    )}

                    {error && <div style={{ ...VT, color: '#ff4444', fontSize: '1rem', marginBottom: '1rem', marginTop: '0.5rem' }}>{error}</div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                      <GoldBtn variant="ghost" onClick={() => setStep(s => s - 1)}>← BACK</GoldBtn>
                      <GoldBtn onClick={() => setStep(s => s + 1)} disabled={!groupDone}>
                        {step === lastGroupStep ? 'REVIEW & FINISH →' : 'NEXT →'}
                      </GoldBtn>
                    </div>
                    {!groupDone && (
                      <div style={{ ...dimText, textAlign: 'right', marginTop: '0.4rem', fontSize: '0.9rem' }}>
                        {!allAssetsResolved
                          ? 'Upload or skip all assets above to continue.'
                          : 'Place the sprite on the background to continue.'}
                      </div>
                    )}
                  </div>

                  {/* Preview column */}
                  <ThemePreviewPanel
                    previewUrls={previewUrls}
                    colors={colors}
                    groupIndex={groupIndex}
                    spritePositions={spritePositions}
                    currentGroup={currentGroup}
                  />
                </div>
              )}

              {/* ── FINALIZE STEP ── */}
              {step === finalizeStep && (
                <div>
                  <div style={{ ...VT, color: GOLD, fontSize: '2rem', marginBottom: '0.25rem' }}>
                    {isEditing ? 'REVIEW & SAVE' : 'REVIEW & FINALISE'}
                  </div>
                  <div style={{ ...dimText, marginBottom: '1.5rem' }}>
                    {isEditing
                      ? `Saving will regenerate sprites.json and update "${displayName}" in the shop.`
                      : `Finalising will generate sprites.json manifests and add "${displayName}" to the shop for 500 points.`}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <SummaryRow label="Theme Slug"   value={themeName} />
                    <SummaryRow label="Display Name" value={displayName} />
                    <SummaryRow label="Shop Price"   value={isEditing ? 'existing price' : '500 pts'} />
                    <SummaryRow label="Uploaded"     value={`${Object.values(assetStatus).filter(s => s === 'uploaded').length} / ${ASSET_GROUPS.flatMap(g => g.assets).length} assets`} />
                    <SummaryRow label="Placeholders" value={`${Object.values(assetStatus).filter(s => s === 'skipped').length} spec files`} />
                    <SummaryRow label="Positions set" value={`${Object.keys(spritePositions).length} / 2 static sprites`} />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={labelStyle}>COLOUR PALETTE</div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {COLOR_FIELDS.map(f => (
                        <div key={f.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <div style={{ width: 36, height: 36, background: colors[f.key], border: '1px solid #444', borderRadius: 2 }} />
                          <div style={{ ...VT, color: DIM, fontSize: '0.7rem', textAlign: 'center', maxWidth: 60 }}>{f.label.split(' ')[0]}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={labelStyle}>ASSET CHECKLIST</div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {ASSET_GROUPS.flatMap(g => g.assets).map(a => {
                        const st = assetStatus[a.key]
                        const preview = previewUrls[a.key]
                        return (
                          <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.3rem 0.5rem', background: '#0e0e0e', borderLeft: `3px solid ${st === 'uploaded' ? GOLD : st === 'skipped' ? '#555' : '#333'}` }}>
                            {preview && a.key !== 'music_theme' && (
                              <img src={preview} alt="" style={{ width: 40, height: 24, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }} />
                            )}
                            <span style={{ ...VT, color: '#aaa', fontSize: '0.95rem', flex: 1 }}>{a.label}</span>
                            <span style={{ ...VT, color: st === 'uploaded' ? GOLD : st === 'skipped' ? '#666' : '#444', fontSize: '0.95rem' }}>
                              {st === 'uploaded' ? '✓ UPLOADED' : st === 'skipped' ? '⏭ SKIPPED' : '○ PENDING'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {error && <div style={{ ...VT, color: '#ff4444', fontSize: '1rem', marginBottom: '1rem' }}>{error}</div>}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <GoldBtn variant="ghost" onClick={() => setStep(s => s - 1)}>← BACK</GoldBtn>
                    <GoldBtn onClick={handleFinalize} disabled={finalizing}>
                      {finalizing ? 'SAVING…' : isEditing ? 'SAVE CHANGES ✓' : 'FINALISE THEME ✓'}
                    </GoldBtn>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── PlacementPicker ────────────────────────────────────────────────────────────
function PlacementPicker({
  bgUrl,
  spriteUrl,
  position,
  onPlace,
  onUseDefault,
}: {
  bgUrl: string | null
  spriteUrl: string | null
  position: { x: number; y: number } | null
  onPlace: (pos: { x: number; y: number } | null) => void
  onUseDefault: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const locked = position != null

  function getRelPos(e: React.MouseEvent): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
      y: Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
    }
  }

  const displayPos = locked ? position : mousePos

  return (
    <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
      <div style={{ ...VT, color: GOLD, fontSize: '1.5rem', marginBottom: '0.25rem' }}>
        {locked ? '✓ SPRITE PLACED' : 'PLACE SPRITE ON BACKGROUND'}
      </div>
      <div style={{ ...dimText, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
        {locked
          ? `Position locked at ${position.x.toFixed(1)}% × ${position.y.toFixed(1)}%.`
          : bgUrl
            ? 'Move your cursor over the background and click to set the sprite position.'
            : 'Upload the page background first to use the placement picker.'}
      </div>

      {/* Placement canvas */}
      <div
        ref={containerRef}
        onClick={locked ? undefined : e => { onPlace(getRelPos(e)) }}
        onMouseMove={locked ? undefined : e => setMousePos(getRelPos(e))}
        onMouseLeave={locked ? undefined : () => setMousePos(null)}
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '56.25%',
          background: bgUrl ? 'transparent' : '#0e0e0e',
          border: `1px solid ${locked ? GOLD + '66' : GOLD + '33'}`,
          cursor: locked ? 'default' : bgUrl ? 'crosshair' : 'not-allowed',
          overflow: 'hidden',
          borderRadius: 2,
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          {bgUrl ? (
            <img src={bgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', imageRendering: 'pixelated' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ ...VT, color: '#333', fontSize: '0.9rem', letterSpacing: '1px' }}>BACKGROUND NOT YET UPLOADED</span>
            </div>
          )}

          {/* Sprite cursor / placed position */}
          {spriteUrl && displayPos && (
            <img
              src={spriteUrl}
              alt=""
              style={{
                position: 'absolute',
                left: `${displayPos.x}%`,
                top: `${displayPos.y}%`,
                transform: 'translate(-50%, -100%)',
                height: '18%',
                imageRendering: 'pixelated',
                objectFit: 'contain',
                pointerEvents: 'none',
                opacity: locked ? 1 : 0.9,
                filter: locked ? `drop-shadow(0 0 4px ${GOLD}88)` : 'drop-shadow(0 0 6px rgba(255,215,0,0.5))',
                transition: locked ? 'none' : 'left 0.04s, top 0.04s',
              }}
            />
          )}

          {/* Instruction overlay when not hovering and not locked */}
          {!locked && !mousePos && bgUrl && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', pointerEvents: 'none' }}>
              <span style={{ ...VT, color: GOLD, fontSize: '1.1rem', letterSpacing: '3px', textShadow: '1px 1px 0 rgba(0,0,0,0.9)' }}>
                CLICK TO PLACE
              </span>
            </div>
          )}

          {locked && (
            <div style={{ position: 'absolute', top: 6, right: 8, ...VT, color: `${GOLD}cc`, fontSize: '0.75rem', letterSpacing: '1px', background: 'rgba(0,0,0,0.7)', padding: '1px 6px' }}>
              PLACED ✓
            </div>
          )}
        </div>
      </div>

      {/* Actions below canvas */}
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {locked ? (
          <button
            onClick={() => onPlace(null)}
            style={{ ...VT, background: 'transparent', border: '1px solid #555', color: '#888', padding: '0.25rem 0.75rem', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            RE-PLACE
          </button>
        ) : (
          <button
            onClick={onUseDefault}
            style={{ ...VT, background: 'transparent', border: `1px solid ${GOLD}44`, color: DIM, padding: '0.25rem 0.75rem', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            USE DEFAULT POSITION
          </button>
        )}
        {locked && (
          <span style={{ ...VT, color: DIM, fontSize: '0.85rem' }}>
            {position!.x.toFixed(1)}% from left · {position!.y.toFixed(1)}% from top
          </span>
        )}
      </div>
    </div>
  )
}

// ── ThemePreviewPanel ──────────────────────────────────────────────────────────
// groupIndex: 0=BRANDING  1=HOME  2=STUDY  3=SUBJECTS  4=ATTENDANCE  5=MESSAGES  6=SHOP

function ThemePreviewPanel({
  previewUrls,
  colors,
  groupIndex,
  spritePositions,
  currentGroup,
}: {
  previewUrls: Record<string, string>
  colors: Record<string, string>
  groupIndex: number
  spritePositions: Record<string, { x: number; y: number }>
  currentGroup: AssetGroup
}) {
  // Pick the most relevant background for this group
  const bgForGroup: Record<number, string> = {
    0: 'bg_home',
    1: 'bg_home',
    2: 'bg_learningTask',
    3: 'bg_mySubjects',
    4: 'bg_attendence',
    5: 'bg_messages',
    6: 'bg_shop',
  }
  const bgKey = bgForGroup[groupIndex] ?? 'bg_home'
  const bg =
    previewUrls[bgKey] ??
    Object.entries(previewUrls).find(([k]) => k.startsWith('bg_'))?.[1] ??
    null

  const banner  = previewUrls['banner_top']
  const btn     = previewUrls['btn_primary']
  const primary = colors.colorPrimary   || GOLD
  const text    = colors.colorText      || '#fff'

  const attendStaticPos = spritePositions['attendence_static'] ?? { x: 12, y: 72 }

  return (
    <div style={{ position: 'sticky', top: 16 }}>
      <div style={{ ...VT, color: DIM, fontSize: '0.85rem', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
        LIVE PREVIEW
      </div>

      {/* 16:9 preview window */}
      <div style={{
        position: 'relative', width: '100%', paddingBottom: '60%',
        background: '#060606', border: `1px solid ${GOLD}33`, overflow: 'hidden', borderRadius: 2,
      }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

          {/* Background */}
          {bg && (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${bg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          )}

          {/* Banner strip */}
          {banner ? (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '9%', backgroundImage: `url('${banner}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }} />
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '9%', background: `linear-gradient(to bottom, ${primary}55, transparent)` }} />
          )}

          {/* Solid content pane */}
          <div style={{
            position: 'absolute',
            top: '13%', left: '10%', right: '10%', bottom: '8%',
            background: 'rgba(8,8,8,0.97)',
            border: `1px solid ${primary}22`,
            display: 'flex', flexDirection: 'column', padding: 10, gap: 6, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', gap: 3, flexShrink: 0, justifyContent: 'flex-end' }}>
              {['HOME', 'QUESTS', 'SHOP'].map(l => (
                <div key={l} style={{ ...VT, color: primary, fontSize: 7, padding: '1px 4px', border: `1px solid ${primary}44` }}>{l}</div>
              ))}
            </div>
            <div style={{ ...VT, color: primary, fontSize: 11, letterSpacing: 1, flexShrink: 0 }}>QUEST LOG</div>
            <div style={{ ...VT, color: text, fontSize: 8, lineHeight: 1.5, flex: 1, opacity: 0.85, overflow: 'hidden' }}>
              Complete daily exercises to earn XP and unlock new abilities as you progress through the curriculum.
            </div>
            <div style={{ height: 14, flexShrink: 0, border: `1px solid ${primary}33`, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', padding: '0 6px' }}>
              <span style={{ ...VT, color: text, fontSize: 7, opacity: 0.5 }}>Enter your answer…</span>
            </div>
            {btn ? (
              <div style={{ height: 16, flexShrink: 0, backgroundImage: `url('${btn}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ ...VT, color: text, fontSize: 8, letterSpacing: 1 }}>SUBMIT QUEST</span>
              </div>
            ) : (
              <div style={{ height: 16, flexShrink: 0, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ ...VT, color: '#000', fontSize: 8, letterSpacing: 1 }}>SUBMIT QUEST</span>
              </div>
            )}
          </div>

          {/* Home sprites (group 1) */}
          {groupIndex === 1 && previewUrls['cloud_drift'] && (
            <img src={previewUrls['cloud_drift']} alt="" style={{ position: 'absolute', top: '28%', left: '12%', width: '38%', height: '9%', imageRendering: 'pixelated', objectFit: 'contain' }} />
          )}
          {groupIndex === 1 && previewUrls['rabbit_1'] && (
            <img src={previewUrls['rabbit_1']} alt="" style={{ position: 'absolute', right: '5%', bottom: '9%', height: '18%', imageRendering: 'pixelated', objectFit: 'contain' }} />
          )}

          {/* Subject detail frame (group 3) */}
          {groupIndex === 3 && previewUrls['subject_detail'] && (
            <div style={{ position: 'absolute', top: '13%', left: '10%', right: '10%', bottom: '8%', backgroundImage: `url('${previewUrls['subject_detail']}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }}>
              <div style={{ ...VT, padding: '12% 30%', color: primary, fontSize: 8, opacity: 0.8, letterSpacing: 1 }}>SUBJECT NAME</div>
            </div>
          )}
          {groupIndex === 3 && !previewUrls['subject_detail'] && (
            <div style={{ position: 'absolute', top: '13%', left: '10%', right: '10%', bottom: '8%', background: 'rgba(8,8,8,0.9)', border: `1px dashed ${GOLD}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ ...VT, color: `${GOLD}33`, fontSize: 8 }}>FRAME NOT YET UPLOADED</span>
            </div>
          )}

          {/* Attendance static sprite (group 4) */}
          {groupIndex === 4 && previewUrls['fireplace_1'] && (
            <img src={previewUrls['fireplace_1']} alt="" style={{ position: 'absolute', left: `${attendStaticPos.x}%`, top: `${attendStaticPos.y}%`, height: '22%', transform: 'translate(-50%,-100%)', imageRendering: 'pixelated', objectFit: 'contain', pointerEvents: 'none' }} />
          )}

          <div style={{ position: 'absolute', bottom: 3, right: 5, ...VT, color: `${GOLD}33`, fontSize: 7, letterSpacing: 1 }}>PREVIEW</div>
        </div>
      </div>

      {groupIndex === 0 && (
        <div style={{ ...dimText, fontSize: '0.8rem', marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#0e0e0e', border: '1px solid #222' }}>
          ♪ Audio files cannot be previewed visually — verify the .wav loops cleanly.
        </div>
      )}
      <div style={{ ...dimText, fontSize: '0.75rem', marginTop: '0.4rem' }}>Updates live as you select and upload files.</div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────────

function GoldBtn({ children, onClick, disabled, variant }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'ghost'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "'VT323', monospace",
        fontSize: '1.15rem',
        padding: '0.5rem 1.5rem',
        cursor: disabled ? 'default' : 'pointer',
        border: variant === 'ghost' ? `1px solid ${GOLD}55` : 'none',
        background: disabled ? '#333' : variant === 'ghost' ? 'transparent' : GOLD,
        color: disabled ? '#666' : variant === 'ghost' ? GOLD : '#000',
        letterSpacing: '0.05em',
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '0.4rem 0.75rem', background: '#0e0e0e', border: '1px solid #222' }}>
      <div style={{ fontFamily: "'VT323', monospace", color: '#888', fontSize: '0.85rem' }}>{label}</div>
      <div style={{ fontFamily: "'VT323', monospace", color: GOLD, fontSize: '1rem' }}>{value}</div>
    </div>
  )
}
