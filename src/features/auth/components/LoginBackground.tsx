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
import { useTheme } from 'next-themes'

interface MedusaeProps {
  className?: string
  style?: React.CSSProperties
  config?: Record<string, unknown>
}

const Medusae = dynamic<MedusaeProps>(
  () => import('./medusae/Medusae') as Promise<{ default: React.ComponentType<MedusaeProps> }>,
  { ssr: false },
)

const DARK_CONFIG = {
  background: { color: '#0a0a14' },
  halo: {
    radiusBase: 1.5,
    radiusAmplitude: 0.35,
    rimWidth: 1.3,
  },
  particles: {
    colorBase: '#3b4fd9',
    colorOne: '#4cc9f0',
    colorTwo: '#a855f7',
    colorThree: '#06b6d4',
  },
}

const LIGHT_CONFIG = {
  background: { color: '#f1f5f9' },
  halo: {
    radiusBase: 1.5,
    radiusAmplitude: 0.35,
    rimWidth: 1.3,
  },
  particles: {
    colorBase: '#94a3b8',
    colorOne: '#2563eb',
    colorTwo: '#7c3aed',
    colorThree: '#0891b2',
  },
}

export function LoginBackground() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
  }, [])

  const isDark = !mounted || resolvedTheme === 'dark'
  const config = isDark ? DARK_CONFIG : LIGHT_CONFIG
  const bgColor = isDark ? '#0a0a14' : '#f1f5f9'

  if (reducedMotion) {
    return (
      <div
        className="fixed inset-0 z-0"
        style={{ backgroundColor: bgColor }}
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Medusae config={config} />
    </div>
  )
}
