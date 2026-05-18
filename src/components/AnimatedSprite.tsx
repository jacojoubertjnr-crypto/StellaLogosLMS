import React, { useState, useEffect, useRef, useCallback } from 'react'

interface AnimatedSpriteProps {
  theme: string
  folder: string
  frameCount?: number
  frameRate?: number
  waypointInterval?: number
  size?: { width: string; height: string }
  zIndex: number
  yMin?: number
  yMax?: number
  /** When true: position:fixed, y measured from bottom instead of top */
  anchorBottom?: boolean
}

export const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({
  theme,
  folder,
  frameCount = 3,
  frameRate = 150,
  waypointInterval = 3000,
  size,
  zIndex,
  yMin = 10,
  yMax = 80,
  anchorBottom = false,
}) => {
  const nextPos = useCallback(() => ({
    x: 5 + Math.random() * 80,
    y: yMin + Math.random() * (yMax - yMin),
  }), [yMin, yMax])

  const [frame, setFrame]       = useState(0)
  const [pos, setPos]           = useState(nextPos)
  const [facingLeft, setFacingLeft] = useState(false)
  const [isHit, setIsHit]       = useState(false)
  const [showScore, setShowScore] = useState(false)
  const [hidden, setHidden]     = useState(false)

  // Ref keeps the current pos readable inside the interval without stale closures
  const posRef = useRef(pos)
  useEffect(() => { posRef.current = pos }, [pos])

  const transitionSecs = waypointInterval / 1000
  const basePath = `/assets/themes/${theme}/sprites/${folder}`

  // Cycle through animation frames — keeps running during hit so it resumes mid-cycle
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % frameCount), frameRate)
    return () => clearInterval(id)
  }, [frameCount, frameRate])

  // Move to a new random waypoint on each interval; flip to face direction of travel
  useEffect(() => {
    if (isHit) return
    const id = setInterval(() => {
      const newPos = nextPos()
      setFacingLeft(newPos.x < posRef.current.x)
      setPos(newPos)
    }, waypointInterval)
    return () => clearInterval(id)
  }, [isHit, waypointInterval, nextPos])

  const handleClick = useCallback(() => {
    if (isHit) return
    setIsHit(true)
    setShowScore(true)
    // After showing the clicked image, respawn at a new random position
    setTimeout(() => {
      setIsHit(false)
      setShowScore(false)
      setPos(nextPos())
    }, 900)
  }, [isHit])

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHidden(true)
  }

  if (hidden) return null

  return (
    <div
      onClick={handleClick}
      style={{
        position: anchorBottom ? 'fixed' : 'absolute',
        left: `${pos.x}%`,
        ...(anchorBottom
          ? { bottom: `${pos.y}%`, transition: `left ${transitionSecs}s ease-in-out, bottom ${transitionSecs}s ease-in-out` }
          : { top: `${pos.y}%`,    transition: `left ${transitionSecs}s ease-in-out, top ${transitionSecs}s ease-in-out` }),
        zIndex,
        cursor: 'crosshair',
        userSelect: 'none',
      }}
    >
      <img
        src={isHit ? `${basePath}/clicked.png` : `${basePath}/frame_${frame + 1}.png`}
        alt=""
        onError={handleImgError}
        style={{
          width: size?.width ?? '64px',
          height: size?.height ?? '64px',
          imageRendering: 'pixelated',
          display: 'block',
          pointerEvents: 'none',
          transform: facingLeft ? 'scaleX(-1)' : undefined,
        }}
      />
      {showScore && (
        <div style={{
          position: 'absolute',
          top: '-28px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#FFD700',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          pointerEvents: 'none',
          animation: 'score-pop 0.9s ease-out forwards',
          whiteSpace: 'nowrap',
        }}>
          +1
        </div>
      )}
    </div>
  )
}
