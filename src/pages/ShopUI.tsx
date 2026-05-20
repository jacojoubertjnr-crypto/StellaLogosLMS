import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, gql } from '@apollo/client'
import { usePageBackground } from '@/hooks/usePageBackground'
import { useThemeStore } from '@/stores/themeStore'
import { useThemeVocab } from '@/hooks/useThemeVocab'
import { mockLearnerState } from '@/mockState'
import { applyColorScheme, clearColorScheme } from '@/lib/skinInjection'

// MarketplaceEntry [The Merchant's Stall]

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const SHOP_ITEMS_QUERY = gql`
  query ShopItems {
    shopItems {
      id name itemType subtype themeCompatibility
      cost description tag scope assetPath owned active
    }
  }
`
const ME_QUERY = gql`
  query MePoints {
    me { pointsBalance }
  }
`
const PURCHASE_MUTATION = gql`
  mutation PurchaseItem($itemId: ID!) {
    purchaseItem(itemId: $itemId) {
      item { id owned active }
      pointsBalance
    }
  }
`
const EQUIP_MUTATION = gql`
  mutation EquipItem($itemId: ID!) {
    equipItem(itemId: $itemId) { id owned active }
  }
`
const UNEQUIP_MUTATION = gql`
  mutation UnequipItem($itemId: ID!) {
    unequipItem(itemId: $itemId) { id owned active }
  }
`

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemType = 'theme' | 'soundtrack' | 'sprite' | 'colorscheme' | 'background'
type SpriteSubtype = 'interactive' | 'animated' | 'static'
type ItemTheme = 'medieval' | 'default' | 'all'

interface ShopItem {
  id: string
  name: string
  type: ItemType
  subtype?: SpriteSubtype
  theme: ItemTheme
  cost: number
  owned: boolean
  active: boolean
  tag: string
  description: string
  scope: string
  assetPath: string
}

interface GqlShopItem {
  id: string
  name: string
  itemType: string
  subtype: string | null
  themeCompatibility: string
  cost: number
  description: string
  tag: string
  scope: string
  assetPath: string
  owned: boolean
  active: boolean
}

// Map DB item_type → frontend type + subtype
const TYPE_MAP: Record<string, { type: ItemType; subtype?: SpriteSubtype }> = {
  'Theme':                { type: 'theme' },
  'Soundtrack':           { type: 'soundtrack' },
  'Interactive Sprite':   { type: 'sprite', subtype: 'interactive' },
  'Color Scheme':         { type: 'colorscheme' },
  'Alternate Background': { type: 'background' },
  'Animated Sprite':      { type: 'sprite', subtype: 'animated' },
  'Static Sprite':        { type: 'sprite', subtype: 'static' },
}

function gqlToShopItem(g: GqlShopItem): ShopItem {
  const { type, subtype } = TYPE_MAP[g.itemType] ?? { type: 'sprite' }
  return {
    id: g.id,
    name: g.name,
    type,
    subtype,
    theme: (g.themeCompatibility as ItemTheme) ?? 'all',
    cost: g.cost,
    owned: g.owned,
    active: g.active,
    tag: g.tag,
    description: g.description,
    scope: g.scope,
    assetPath: g.assetPath ?? '',
  }
}

// Map theme item name → store theme key
const THEME_KEY: Record<string, 'medieval' | 'default'> = {
  'Medieval Realm': 'medieval',
}

// ─── Preview path resolution ──────────────────────────────────────────────────
// Returns an ordered list of image paths to try for a given item.
// Uses assetPath from DB first; otherwise infers from item type + theme folder structure.

function resolvePreviewPaths(item: ShopItem): string[] {
  if (item.assetPath) {
    // Custom themes store a folder path like 'themes/pirates', not an image path.
    // Expand it to the candidate image files inside that folder.
    if (item.type === 'theme' && item.assetPath.startsWith('themes/')) {
      const folder = item.assetPath  // e.g. 'themes/classicPirate'
      return [
        `/assets/${folder}/home/background.png`,
        `/assets/${folder}/login/background.png`,
        `/assets/${folder}/home/bg.png`,
        `/assets/${folder}/login/bg.png`,
      ]
    }
    return [item.assetPath]
  }

  const t = item.theme === 'all' ? 'medieval' : item.theme

  switch (item.type) {
    case 'theme':
      return [
        `/assets/themes/${t}/home/background.png`,
        `/assets/themes/${t}/login/background.png`,
        `/assets/themes/${t}/home/bg.png`,
        `/assets/themes/${t}/login/bg.png`,
      ]
    case 'background':
      return item.assetPath ? [item.assetPath] : []
    case 'sprite':
      return []
    default:
      return []  // soundtrack + colorscheme handled by PreviewImage directly
  }
}

// Named color palettes for color scheme items; falls back to theme palette
const COLOR_PALETTES: Record<string, string[]> = {
  'Crimson Court': ['#6B0000', '#B22222', '#3D0000', '#C0392B'],
  'Emerald Isle':  ['#1A4A1A', '#2E8B22', '#0D2B0D', '#4CAF4C'],
  'Midnight Blue': ['#0A1628', '#1B3A6B', '#0D2145', '#2D5AA0'],
}
const THEME_PALETTE: Record<string, string[]> = {
  medieval: ['#8B4513', '#D2691E', '#FFD700', '#2C1810'],
  default:  ['#1E3A5F', '#4A9EFF', '#232B3E', '#E8F0FE'],
  all:      ['#2A2A3A', '#5A6A8A', '#3A3A4A', '#8A9ABC'],
}

// ─── PreviewImage ─────────────────────────────────────────────────────────────
// Tries each resolved path in sequence; falls back to a styled placeholder.

const PreviewImage: React.FC<{ item: ShopItem; modalSize?: boolean }> = ({ item, modalSize }) => {
  const paths = useMemo(() => resolvePreviewPaths(item), [item.id, item.type, item.theme, item.assetPath])
  const [idx, setIdx] = useState(0)
  useEffect(() => setIdx(0), [item.id])

  if (item.type === 'colorscheme') {
    const colors = COLOR_PALETTES[item.name] ?? THEME_PALETTE[item.theme] ?? THEME_PALETTE.all
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {colors.map((c, i) => (
          <div key={i} style={{ flex: 1, background: c, position: 'relative' }}>
            {modalSize && i === 0 && (
              <span style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', ...VT, fontSize: '0.6rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>
                COLOUR PREVIEW
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (item.type === 'soundtrack') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '100%' }}>
        <span style={{ fontSize: modalSize ? '4.5rem' : '2.5rem', opacity: 0.28, lineHeight: 1 }}>♪</span>
        <span style={{ ...VT, fontSize: '0.65rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.25)' }}>AUDIO</span>
      </div>
    )
  }

  if (paths.length === 0 || idx >= paths.length) {
    return <span style={{ fontSize: modalSize ? '5rem' : '2.8rem', opacity: 0.18 }}>{TYPE_ICON[item.type]}</span>
  }

  return (
    <img
      key={paths[idx]}
      src={paths[idx]}
      alt=""
      onError={() => setIdx(i => i + 1)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }}
    />
  )
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

const THEME_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  medieval: { label: 'MEDIEVAL', color: 'rgba(255,195,50,0.95)',  bg: 'rgba(55,25,0,0.85)'   },
  scifi:    { label: 'SCI-FI',   color: 'rgba(100,200,255,0.95)', bg: 'rgba(0,15,35,0.85)'   },
  default:  { label: 'DEFAULT',  color: 'rgba(210,220,235,0.95)', bg: 'rgba(18,18,26,0.85)'  },
  all:      { label: 'ALL',      color: 'rgba(180,200,255,0.9)',  bg: 'rgba(20,20,40,0.85)'  },
}

const TYPE_ICON: Record<ItemType, string> = {
  theme:       '⚔',
  soundtrack:  '♪',
  colorscheme: '◈',
  background:  '⛰',
  sprite:      '✦',
}

type FilterTab = 'all' | ItemType | 'bg_page'

const CAT_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',         label: 'ALL' },
  { id: 'theme',       label: 'THEME' },
  { id: 'bg_page',     label: 'BACKGROUNDS' },
  { id: 'background',  label: 'ALT BACKGROUNDS' },
  { id: 'sprite',      label: 'SPRITES' },
  { id: 'soundtrack',  label: 'SOUNDTRACK' },
  { id: 'colorscheme', label: 'COLOR SCHEMES' },
]

const BG_PAGES = [
  { key: 'home',         label: 'HOME' },
  { key: 'learningTask', label: 'LEARNING TASK' },
  { key: 'mySubjects',   label: 'MY SUBJECTS' },
  { key: 'attendence',   label: 'ATTENDANCE' },
  { key: 'messages',     label: 'MESSAGES' },
  { key: 'shop',         label: 'SHOP' },
]

// ─── BgPageCard ───────────────────────────────────────────────────────────────
// Non-purchasable visual preview of an included page background.

const BgPageCard: React.FC<{ themeKey: string; page: string; label: string; themeOwned: boolean }> = ({ themeKey, page, label, themeOwned }) => {
  const [loaded, setLoaded] = useState(false)
  const src = `/assets/themes/${themeKey}/${page}/background.png`
  return (
    <div style={{
      ...VT,
      display: 'flex', flexDirection: 'column',
      border: '1px solid rgba(255,215,0,0.15)',
      background: 'var(--color-pane-bg, rgba(0,0,0,0.4))',
      overflow: 'hidden',
      opacity: themeOwned ? 1 : 0.55,
    }}>
      <div style={{ flex: 1, minHeight: '80px', position: 'relative', background: 'rgba(255,215,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img
          src={src}
          alt=""
          onLoad={() => setLoaded(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: loaded ? 'block' : 'none' }}
        />
        {!loaded && <span style={{ fontSize: '2.8rem', opacity: 0.18 }}>⛰</span>}
        <span style={{ position: 'absolute', top: '0.35rem', right: '0.45rem', fontSize: '0.65rem', letterSpacing: '1px', color: themeOwned ? 'rgba(100,255,130,0.85)' : 'rgba(255,215,0,0.4)', background: 'rgba(0,0,0,0.65)', padding: '0.1rem 0.4rem' }}>
          {themeOwned ? 'INCLUDED' : 'BUY THEME'}
        </span>
      </div>
      <div style={{ padding: '0.45rem 0.6rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        <span style={{ fontSize: '0.6rem', letterSpacing: '1.5px', color: 'rgba(255,215,0,0.3)' }}>PAGE BACKGROUND</span>
        <span style={{ fontSize: '1rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.88)', lineHeight: 1.1 }}>{label}</span>
      </div>
    </div>
  )
}

interface ThemeSection { key: string; label: string; items: ShopItem[] }

function buildSections(catalog: ShopItem[]): ThemeSection[] {
  const map = new Map<string, ThemeSection>()
  map.set('default', { key: 'default', label: 'DEFAULT', items: [] })

  // First pass: create sections for every Theme item
  catalog.filter(i => i.type === 'theme').forEach(ti => {
    const key = ti.assetPath?.startsWith('themes/')
      ? ti.assetPath.replace('themes/', '')
      : ti.theme !== 'all' ? ti.theme : null
    if (!key) return
    if (!map.has(key)) map.set(key, { key, label: ti.name.toUpperCase(), items: [] })
    map.get(key)!.items.push(ti)
  })

  // Second pass: place non-theme items into their section
  catalog.filter(i => i.type !== 'theme').forEach(item => {
    const compat = item.theme
    if (compat === 'default') { map.get('default')!.items.push(item); return }
    if (compat === 'all') return
    if (map.has(compat)) { map.get(compat)!.items.push(item); return }
    // Section not yet created (items without a Theme item) — create with formatted label
    const label = compat.replace(/([A-Z])/g, ' $1').trim().toUpperCase()
    map.set(compat, { key: compat, label, items: [item] })
  })

  return [...map.values()].filter(s => s.items.length > 0)
}

const GRID_SIZE = 9

// ─── ItemCard ─────────────────────────────────────────────────────────────────

const ItemCard: React.FC<{ item: ShopItem; points: number; onClick: () => void }> = ({ item, points, onClick }) => {
  const canAfford = points >= item.cost

  const borderColor = item.active
    ? 'rgba(100,255,130,0.45)'
    : item.owned
      ? 'rgba(255,215,0,0.35)'
      : 'rgba(255,215,0,0.15)'

  const ctaColor = item.active
    ? 'rgba(100,255,130,0.9)'
    : item.owned
      ? 'rgba(255,215,0,0.85)'
      : canAfford
        ? 'rgba(255,215,0,0.65)'
        : 'rgba(255,215,0,0.25)'

  const ctaLabel = item.active
    ? 'ACTIVE · UNEQUIP'
    : item.owned
      ? 'OWNED · EQUIP'
      : canAfford
        ? `BUY · ${item.cost.toLocaleString()} PTS`
        : `${item.cost.toLocaleString()} PTS`

  const themeStyle = THEME_STYLE[item.theme] ?? THEME_STYLE.all

  return (
    <motion.div
      whileHover={{ scale: 1.025 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      style={{
        ...VT,
        background: item.owned ? 'rgba(255,215,0,0.05)' : 'var(--color-pane-bg, rgba(0,0,0,0.4))',
        border: `1px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column',
        cursor: 'pointer', overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = item.active ? 'rgba(100,255,130,0.75)' : 'rgba(255,215,0,0.6)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = borderColor }}
    >
      {/* Preview area */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,215,0,0.025)',
        borderBottom: '1px solid rgba(255,215,0,0.07)',
        position: 'relative',
        minHeight: '80px',
        overflow: 'hidden',
      }}>
        <PreviewImage item={item} />
        {item.active && (
          <span style={{ position: 'absolute', top: '0.35rem', right: '0.45rem', fontSize: '0.65rem', letterSpacing: '1px', color: 'rgba(100,255,130,0.85)', background: 'rgba(0,0,0,0.65)', padding: '0.1rem 0.4rem' }}>
            ACTIVE
          </span>
        )}
        {item.owned && !item.active && (
          <span style={{ position: 'absolute', top: '0.35rem', right: '0.45rem', fontSize: '0.65rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.55)', background: 'rgba(0,0,0,0.65)', padding: '0.1rem 0.4rem' }}>
            OWNED
          </span>
        )}
        <span style={{ position: 'absolute', bottom: '0.35rem', left: '0.45rem', fontSize: '0.6rem', letterSpacing: '1.5px', color: themeStyle.color, background: themeStyle.bg, padding: '0.1rem 0.4rem' }}>
          {themeStyle.label}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '0.45rem 0.6rem 0.55rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        <span style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)' }}>{item.tag}</span>
        <span style={{ fontSize: '1.05rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.9)', lineHeight: 1.1 }}>{item.name}</span>
        <span style={{ fontSize: '0.85rem', letterSpacing: '1px', color: ctaColor, marginTop: '0.2rem' }}>{ctaLabel}</span>
      </div>
    </motion.div>
  )
}

// ─── ItemModal ────────────────────────────────────────────────────────────────

const ItemModal: React.FC<{
  item: ShopItem
  points: number
  onClose: () => void
  onBuy: (id: string) => void
  onEquip: (id: string) => void
  onUnequip: (id: string) => void
}> = ({ item, points, onClose, onBuy, onEquip, onUnequip }) => {
  const canAfford = points >= item.cost

  let ctaLabel: string
  let ctaAction: (() => void) | null = null
  let ctaDisabled = false
  let ctaBorderColor = 'rgba(255,215,0,0.5)'
  let ctaTextColor = 'rgba(255,215,0,0.9)'
  let ctaBg = 'rgba(255,215,0,0.08)'

  if (item.active) {
    ctaLabel = 'UNEQUIP'
    ctaAction = () => { onUnequip(item.id) }
    ctaBorderColor = 'rgba(100,255,130,0.4)'
    ctaTextColor = 'rgba(100,255,130,0.8)'
    ctaBg = 'rgba(100,255,130,0.06)'
  } else if (item.owned) {
    ctaLabel = 'EQUIP'
    ctaAction = () => { onEquip(item.id); onClose() }
  } else if (canAfford) {
    ctaLabel = `BUY · ${item.cost.toLocaleString()} PTS`
    ctaAction = () => { onBuy(item.id) }
  } else {
    ctaLabel = `${(item.cost - points).toLocaleString()} PTS SHORT`
    ctaDisabled = true
    ctaBorderColor = 'rgba(255,215,0,0.15)'
    ctaTextColor = 'rgba(255,215,0,0.3)'
    ctaBg = 'transparent'
  }

  const themeStyle = THEME_STYLE[item.theme] ?? THEME_STYLE.all

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        style={{ ...VT, background: 'var(--color-modal-bg)', border: '1px solid rgba(255,215,0,0.35)', width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.7rem 3.5rem', borderBottom: '1px solid rgba(255,215,0,0.15)', flexShrink: 0 }}>
          <span style={{ fontSize: '1.5rem', letterSpacing: '3px', color: 'rgba(255,215,0,1)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{item.name}</span>
          <button
            onClick={onClose}
            style={{ position: 'absolute', right: '1rem', ...VT, fontSize: '1rem', letterSpacing: '2px', background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.6)', cursor: 'pointer', padding: '0.2rem 0.9rem', transition: 'border-color 0.12s, color 0.12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.8)'; e.currentTarget.style.color = 'rgba(255,215,0,1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.color = 'rgba(255,215,0,0.6)' }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Preview */}
        <div style={{ height: '220px', background: 'rgba(255,215,0,0.025)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,215,0,0.08)', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
          <PreviewImage item={item} modalSize />
        </div>

        {/* Details */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.4)' }}>{item.tag}</span>
            <span style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: themeStyle.color, background: themeStyle.bg, padding: '0.1rem 0.5rem' }}>
              {themeStyle.label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '1.05rem', letterSpacing: '0.5px', color: 'rgba(255,215,0,0.75)', lineHeight: 1.65 }}>
            {item.description}
          </p>
          <div style={{ background: 'rgba(255,215,0,0.04)', borderLeft: '2px solid rgba(255,215,0,0.25)', padding: '0.55rem 0.8rem' }}>
            <span style={{ fontSize: '0.85rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.45)' }}>{item.scope}</span>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,215,0,0.12)', flexShrink: 0 }}>
          <button
            disabled={ctaDisabled}
            onClick={() => ctaAction?.()}
            style={{ ...VT, width: '100%', fontSize: '1.3rem', letterSpacing: '3px', padding: '0.65rem', background: ctaBg, border: `1px solid ${ctaBorderColor}`, color: ctaTextColor, cursor: ctaDisabled ? 'default' : 'pointer', transition: 'border-color 0.12s, color 0.12s' }}
            onMouseEnter={(e) => { if (!ctaDisabled) { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.85)'; e.currentTarget.style.color = 'rgba(255,215,0,1)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = ctaBorderColor; e.currentTarget.style.color = ctaTextColor }}
          >
            {ctaLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── ShopUI ───────────────────────────────────────────────────────────────────

export const ShopUI: React.FC = () => {
  usePageBackground('shop')
  const vocab = useThemeVocab()
  const { setTheme } = useThemeStore()

  const [selectedTheme, setSelectedTheme] = useState<string>('')
  const [categoryTab,   setCategoryTab]   = useState<FilterTab>('all')
  const [page,          setPage]          = useState(0)
  const [selectedItem,  setSelectedItem]  = useState<ShopItem | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const { data: shopData, loading } = useQuery(SHOP_ITEMS_QUERY)
  const { data: meData, refetch: refetchMe } = useQuery(ME_QUERY, { fetchPolicy: 'network-only' })

  const [purchaseMutation] = useMutation(PURCHASE_MUTATION, {
    refetchQueries: [{ query: SHOP_ITEMS_QUERY }],
    onCompleted: (data) => {
      refetchMe()
      setMutationError(null)
      const returned = data?.purchaseItem?.item
      if (returned) {
        setSelectedItem(prev => prev && prev.id === returned.id
          ? { ...prev, owned: returned.owned, active: returned.active }
          : prev
        )
      }
    },
    onError: (err) => setMutationError(err.message),
  })
  const [equipMutation] = useMutation(EQUIP_MUTATION, {
    refetchQueries: [{ query: SHOP_ITEMS_QUERY }],
    onError: (err) => setMutationError(err.message),
  })
  const [unequipMutation] = useMutation(UNEQUIP_MUTATION, {
    refetchQueries: [{ query: SHOP_ITEMS_QUERY }],
    onCompleted: (data) => {
      const returned = data?.unequipItem
      if (returned) {
        setSelectedItem(prev => prev && prev.id === returned.id
          ? { ...prev, owned: returned.owned, active: returned.active }
          : prev
        )
      }
    },
    onError: (err) => setMutationError(err.message),
  })

  const points: number = meData?.me?.pointsBalance ?? 0

  const rawItems: GqlShopItem[] = shopData?.shopItems ?? []
  const catalog: ShopItem[] = rawItems.map(gqlToShopItem)

  const sections = useMemo(() => buildSections(catalog), [catalog])

  // Default to first non-default section once data loads
  useEffect(() => {
    if (!selectedTheme && sections.length > 0) {
      const first = sections.find(s => s.key !== 'default') ?? sections[0]
      setSelectedTheme(first.key)
    }
  }, [sections])

  const activeSection = sections.find(s => s.key === selectedTheme) ?? sections[0]
  const sectionItems  = activeSection?.items ?? []

  const catsInSection = new Set(sectionItems.map(i => i.type))
  const hasBgPage = selectedTheme !== 'default' && selectedTheme !== ''
  const visibleCatTabs = CAT_TABS.filter(t =>
    t.id === 'all' ||
    (t.id === 'bg_page' && hasBgPage) ||
    catsInSection.has(t.id as ItemType)
  )

  const filtered   = categoryTab === 'all' ? sectionItems : sectionItems.filter(i => i.type === categoryTab)
  const totalPages = Math.ceil(filtered.length / GRID_SIZE)
  const pageItems  = filtered.slice(page * GRID_SIZE, (page + 1) * GRID_SIZE)
  const gridItems  = [...pageItems, ...Array(Math.max(0, GRID_SIZE - pageItems.length)).fill(null)] as (ShopItem | null)[]

  const handleThemeChange = (key: string) => { setSelectedTheme(key); setCategoryTab('all'); setPage(0) }
  const handleCatChange   = (tab: FilterTab) => { setCategoryTab(tab); setPage(0) }

  const handleBuy = (id: string) => {
    setMutationError(null)
    purchaseMutation({ variables: { itemId: id } })
  }

  const handleEquip = (id: string) => {
    const item = catalog.find(i => i.id === id)
    if (!item) return
    if (item.type === 'theme') {
      const key = THEME_KEY[item.name]
      if (key) {
        setTheme(key)
      } else if (item.assetPath.startsWith('themes/')) {
        setTheme(item.assetPath.replace('themes/', ''))
      }
      clearColorScheme()
    }
    if (item.type === 'colorscheme') {
      applyColorScheme(item.name)
    }
    setMutationError(null)
    equipMutation({ variables: { itemId: id } })
  }

  const handleUnequip = (id: string) => {
    const item = catalog.find(i => i.id === id)
    if (!item) return
    if (item.type === 'theme') {
      setTheme('default')
      clearColorScheme()
    }
    if (item.type === 'colorscheme') {
      clearColorScheme()
    }
    setMutationError(null)
    unequipMutation({ variables: { itemId: id } })
  }

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'hidden' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="safe-zone"
        style={{ marginTop: '72px', marginBottom: '1.5rem', maxWidth: '960px', width: '95%', gap: 0, alignItems: 'stretch', height: 'calc(100vh - 72px - 1.5rem)', overflow: 'hidden' }}
      >
        {/* Shop header */}
        <div style={{ ...VT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', height: '52px', flexShrink: 0, background: 'var(--color-pane-bg, rgba(0,0,0,0.55))', border: '1px solid rgba(255,215,0,0.2)', borderBottom: 'none' }}>
          <span style={{ fontSize: '1.6rem', letterSpacing: '5px', color: 'rgba(255,215,0,0.9)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {vocab.shopPageTitle}
          </span>
          <span style={{ fontSize: '1.2rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)' }}>
            💰 {points.toLocaleString()} {vocab.currencyLabel}
          </span>
        </div>

        {/* Theme selector row */}
        <div style={{ display: 'flex', gap: '0.3rem', padding: '0.45rem 1.25rem', background: 'var(--color-pane-bg, rgba(0,0,0,0.55))', border: '1px solid rgba(255,215,0,0.2)', borderBottom: 'none', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ ...VT, fontSize: '0.75rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.3)', marginRight: '0.3rem' }}>THEME</span>
          {sections.map(s => {
            const themeOwned = s.items.some(i => i.type === 'theme' && i.owned)
            const isActive = selectedTheme === s.key
            return (
              <button
                key={s.key}
                onClick={() => handleThemeChange(s.key)}
                style={{ ...VT, fontSize: '1.05rem', letterSpacing: '2px', padding: '0.2rem 1rem', background: isActive ? 'rgba(255,215,0,0.18)' : 'transparent', border: `1px solid ${isActive ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.18)'}`, color: isActive ? 'rgba(255,215,0,1)' : 'rgba(255,215,0,0.45)', cursor: 'pointer', transition: 'border-color 0.12s, color 0.12s, background 0.12s', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {themeOwned && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(100,255,130,0.9)', lineHeight: 1 }}>✓</span>
                )}
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Category sub-filter (only shown when there are multiple categories) */}
        {visibleCatTabs.length > 2 && (
          <div style={{ display: 'flex', gap: '0.25rem', padding: '0.35rem 1.25rem', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,215,0,0.12)', borderBottom: 'none', flexShrink: 0, flexWrap: 'wrap' }}>
            {visibleCatTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleCatChange(tab.id)}
                style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', padding: '0.1rem 0.65rem', background: categoryTab === tab.id ? 'rgba(255,215,0,0.1)' : 'transparent', border: `1px solid ${categoryTab === tab.id ? 'rgba(255,215,0,0.45)' : 'rgba(255,215,0,0.12)'}`, color: categoryTab === tab.id ? 'rgba(255,215,0,0.9)' : 'rgba(255,215,0,0.35)', cursor: 'pointer', transition: 'border-color 0.12s, color 0.12s' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Grid area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-pane-bg, rgba(0,0,0,0.35))', border: '1px solid rgba(255,215,0,0.2)', padding: '1rem 1.25rem', gap: '0.75rem', minHeight: 0, overflow: 'hidden' }}>

          {/* Error banner */}
          {mutationError && (
            <div style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', color: '#E74C3C', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)', padding: '0.4rem 0.8rem', flexShrink: 0 }}>
              {mutationError}
            </div>
          )}

          {/* 3×3 grid */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '0.75rem', minHeight: 0 }}>
            {loading
              ? Array(GRID_SIZE).fill(null).map((_, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,215,0,0.02)', border: '1px solid rgba(255,215,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.2)' }}>···</span>
                  </div>
                ))
              : categoryTab === 'bg_page'
                ? (() => {
                    const themeOwned = sectionItems.some(i => i.type === 'theme' && i.owned)
                    const padded = [...BG_PAGES, ...Array(Math.max(0, GRID_SIZE - BG_PAGES.length)).fill(null)] as (typeof BG_PAGES[0] | null)[]
                    return padded.map((pg, idx) =>
                      pg ? (
                        <BgPageCard key={pg.key} themeKey={selectedTheme} page={pg.key} label={pg.label} themeOwned={themeOwned} />
                      ) : (
                        <div key={`empty-${idx}`} style={{ background: 'rgba(255,215,0,0.01)', border: '1px dashed rgba(255,215,0,0.06)' }} />
                      )
                    )
                  })()
                : gridItems.map((item, idx) =>
                    item ? (
                      <ItemCard key={item.id} item={item} points={points} onClick={() => setSelectedItem(item)} />
                    ) : (
                      <div key={`empty-${idx}`} style={{ background: 'rgba(255,215,0,0.01)', border: '1px dashed rgba(255,215,0,0.06)' }} />
                    )
                  )
            }
          </div>

          {/* Pagination */}
          {totalPages > 1 && categoryTab !== 'bg_page' && (
            <div style={{ ...VT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexShrink: 0 }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ ...VT, fontSize: '1.1rem', letterSpacing: '2px', background: 'transparent', border: `1px solid ${page === 0 ? 'rgba(255,215,0,0.12)' : 'rgba(255,215,0,0.3)'}`, color: page === 0 ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.65)', cursor: page === 0 ? 'default' : 'pointer', padding: '0.2rem 0.85rem' }}
              >◂</button>
              <span style={{ fontSize: '1rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.45)' }}>{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                style={{ ...VT, fontSize: '1.1rem', letterSpacing: '2px', background: 'transparent', border: `1px solid ${page === totalPages - 1 ? 'rgba(255,215,0,0.12)' : 'rgba(255,215,0,0.3)'}`, color: page === totalPages - 1 ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.65)', cursor: page === totalPages - 1 ? 'default' : 'pointer', padding: '0.2rem 0.85rem' }}
              >▶</button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Item detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <ItemModal
            item={selectedItem}
            points={points}
            onClose={() => setSelectedItem(null)}
            onBuy={handleBuy}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
