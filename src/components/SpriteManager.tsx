import React, { useEffect, useState } from 'react'
import { useThemeStore } from '@/stores/themeStore'
import { AnimatedSprite } from '@/components/AnimatedSprite'

interface SpriteMovement {
  type: 'linear_drift' | 'random_flight' | 'frame_loop'
  speed?: string          // linear_drift: CSS duration e.g. "40s"
  waypointInterval?: number  // random_flight: ms between waypoints
  frameRate?: number      // random_flight / frame_loop: ms per animation frame
  yMin?: number           // random_flight: lowest Y% waypoint can reach (0–100)
  yMax?: number           // random_flight: highest Y% waypoint can reach (0–100)
}

interface SpriteEntry {
  id: string
  file: string
  anchor: 'top_header' | 'background' | 'safe_zone'
  position: { x: string; y: string }
  size?: { width: string; height: string }
  performance?: 'high'
  animationDelay?: string
  movement?: SpriteMovement
}

interface SpritesManifest {
  sprites: SpriteEntry[]
}

interface SpriteManagerProps {
  anchor: 'top_header' | 'background' | 'safe_zone'
  page: string
}

const anchorZIndex: Record<SpriteManagerProps['anchor'], number> = {
  background: 1,
  top_header: 3,
  safe_zone:  11,
}

// Fixed-position sprite that loops through numbered frames — used for torches etc.
const LoopingSprite: React.FC<{
  basePath: string
  position: { x: string; y: string }
  size?: { width: string; height: string }
  frameCount?: number
  frameRate?: number
  startDelay?: number
  zIndex: number
}> = ({ basePath, position, size, frameCount = 3, frameRate = 110, startDelay = 0, zIndex }) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>
    const t = setTimeout(() => {
      intervalId = setInterval(() => setFrame(f => (f + 1) % frameCount), frameRate)
    }, startDelay)
    return () => { clearTimeout(t); clearInterval(intervalId) }
  }, [frameCount, frameRate, startDelay])

  return (
    <img
      src={`${basePath}/frame_${frame + 1}.png`}
      alt=""
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size?.width ?? '64px',
        height: size?.height ?? '64px',
        imageRendering: 'pixelated',
        zIndex,
        pointerEvents: 'none',
      }}
    />
  )
}

const handleSpriteError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget
  if (img.dataset.fallback === 'true') {
    img.style.display = 'none'
    return
  }
  img.dataset.fallback = 'true'
  if (img.src.endsWith('.gif')) {
    img.src = img.src.replace('.gif', '.png')
  } else if (img.src.endsWith('.png')) {
    img.src = img.src.replace('.png', '.gif')
  }
}

export const SpriteManager: React.FC<SpriteManagerProps> = ({ anchor, page }) => {
  const { currentTheme, performanceTier } = useThemeStore()
  const [sprites, setSprites] = useState<SpriteEntry[]>([])
  const [resolvedTheme, setResolvedTheme] = useState(currentTheme)

  useEffect(() => {
    setResolvedTheme(currentTheme)
    fetch(`/assets/themes/${currentTheme}/${page}/sprites.json`)
      .then(r => r.json())
      .then((manifest: SpritesManifest) => { setSprites(manifest.sprites); setResolvedTheme(currentTheme) })
      .catch(() => setSprites([]))
  }, [currentTheme, page])

  const visible = sprites.filter(s => {
    if (s.anchor !== anchor) return false
    if (s.performance === 'high' && performanceTier !== 'High') return false
    return true
  })

  if (visible.length === 0) return null

  return (
    <>
      {visible.map(sprite => {
        const zIndex = anchorZIndex[anchor]

        // Fixed-position frame animation (torches, candles, etc.)
        if (sprite.movement?.type === 'frame_loop') {
          const delayMs = sprite.animationDelay
            ? parseFloat(sprite.animationDelay) * 1000
            : 0
          return (
            <LoopingSprite
              key={sprite.id}
              basePath={`/assets/themes/${resolvedTheme}/${page}/sprites/${sprite.file}`}
              position={sprite.position}
              size={sprite.size}
              frameRate={sprite.movement.frameRate}
              startDelay={delayMs}
              zIndex={zIndex}
            />
          )
        }

        // Animated creature with random flight path and click interaction
        if (sprite.movement?.type === 'random_flight') {
          return (
            <AnimatedSprite
              key={sprite.id}
              theme={`${resolvedTheme}/${page}`}
              folder={sprite.file}
              frameRate={sprite.movement.frameRate}
              waypointInterval={sprite.movement.waypointInterval}
              size={sprite.size}
              zIndex={zIndex}
              yMin={sprite.movement.yMin}
              yMax={sprite.movement.yMax}
            />
          )
        }

        // Standard static or linear-drift sprite
        const basePath = `/assets/themes/${resolvedTheme}/${page}/sprites/${sprite.file}`
        return (
          <img
            key={sprite.id}
            src={`${basePath}.gif`}
            alt=""
            onError={handleSpriteError}
            style={{
              position: 'absolute',
              left: sprite.position.x,
              top: sprite.position.y,
              width: sprite.size?.width,
              height: sprite.size?.height,
              zIndex,
              pointerEvents: 'none',
              ...(sprite.movement?.type === 'linear_drift'
                ? { animation: `linear-drift ${sprite.movement.speed} linear infinite` }
                : {}),
              ...(sprite.animationDelay
                ? { animationDelay: sprite.animationDelay }
                : {}),
            }}
          />
        )
      })}
    </>
  )
}
