'use client'

/**
 * Animated login background — "Medusae" particle effect.
 * Visual effect adapted from BreathDearMedusae by ewohlken2
 * (https://github.com/ewohlken2/BreathDearMedusae). All credit for the
 * shader/particle work to the original author. Used here for a personal
 * visual customization of the login screen.
 */

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

interface MedusaeProps {
  className?: string
  style?: React.CSSProperties
  config?: Record<string, unknown>
}

const Medusae = dynamic<MedusaeProps>(
  () => import('./medusae/Medusae') as Promise<{ default: React.ComponentType<MedusaeProps> }>,
  { ssr: false },
)

const MEDUSAE_CONFIG = {
  background: { color: '#0a0a14' },
  particles: {
    // colorBase is the resting color (away from the cursor). It must be
    // clearly brighter than the background or the field is invisible.
    colorBase: '#3b4fd9',
    colorOne: '#4cc9f0',
    colorTwo: '#a855f7',
    colorThree: '#06b6d4',
  },
}

export function LoginBackground() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
  }, [])

  if (reducedMotion) {
    return (
      <div
        className="fixed inset-0 z-0"
        style={{ backgroundColor: '#0a0a14' }}
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Medusae config={MEDUSAE_CONFIG} />
    </div>
  )
}
