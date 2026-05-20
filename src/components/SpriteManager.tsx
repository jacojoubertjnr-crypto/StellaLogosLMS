import React, { useEffect, useState } from 'react'
import { useThemeStore } from '@/stores/themeStore'
import { AnimatedSprite } from '@/components/AnimatedSprite'

interface SpriteMovement {
  type: 'linear_drift' | 'random_flight' | 'frame_loop' | 'path_drift'
  speed?: string          // linear_drift / path_drift: CSS duration e.g. "40s"
  waypointInterval?: number  // random_flight: ms between waypoints
  frameRate?: number      // random_flight / frame_loop / path_drift: ms per frame
  yMin?: number           // random_flight: lowest Y% waypoint can reach (0–100)
  yMax?: number           // random_flight: highest Y% waypoint can reach (0–100)
  // path_drift only:
  x1?: number; y1?: number  // start point (percentage)
  x2?: number; y2?: number  // end point (percentage)
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
  frameCount?: number   // path_drift: number of animation frames (1 = single image)
  spritePath?: string   // path_drift: overrides auto-computed /sprites/ path
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

// Sprite that travels back and forth along a custom path, with optional frame cycling.
const PathDriftSprite: React.FC<{
  spriteId: string
  basePath: string
  frameCount: number
  size?: { width: string; height: string }
  x1: number; y1: number; x2: number; y2: number
  speed: string
  frameRate: number
  zIndex: number
}> = ({ spriteId, basePath, frameCount, size, x1, y1, x2, y2, speed, frameRate, zIndex }) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (frameCount <= 1) return
    const id = setInterval(() => setFrame(f => (f + 1) % frameCount), frameRate)
    return () => clearInterval(id)
  }, [frameCount, frameRate])

  const src = frameCount > 1 ? `${basePath}/frame_${frame + 1}.png` : `${basePath}.png`
  const keyframeName = `path-drift-${spriteId}`

  return (
    <>
      <style>{`
        @keyframes ${keyframeName} {
          0%   { left: ${x1}%; top: ${y1}%; }
          100% { left: ${x2}%; top: ${y2}%; }
        }
      `}</style>
      <img
        src={src}
        alt=""
        style={{
          position: 'absolute',
          width: size?.width,
          height: size?.height,
          imageRendering: 'pixelated',
          zIndex,
          pointerEvents: 'none',
          animation: `${keyframeName} ${speed} ease-in-out infinite alternate`,
        }}
      />
    </>
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

        // Custom path — sprite travels from (x1,y1) to (x2,y2) and back
        if (sprite.movement?.type === 'path_drift') {
          const m = sprite.movement
          const basePath = sprite.spritePath
            ?? `/assets/themes/${resolvedTheme}/${page}/sprites/${sprite.file}`
          return (
            <PathDriftSprite
              key={sprite.id}
              spriteId={sprite.id}
              basePath={basePath}
              frameCount={sprite.frameCount ?? 1}
              size={sprite.size}
              x1={m.x1 ?? 5}  y1={m.y1 ?? 20}
              x2={m.x2 ?? 90} y2={m.y2 ?? 20}
              speed={m.speed ?? '12s'}
              frameRate={m.frameRate ?? 150}
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
