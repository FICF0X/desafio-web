'use client'

import * as React from 'react'
import { Gamepad2, Ghost, Swords, Maximize2 } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Server components cannot pass component functions as props across the
// client boundary, so widgets receive an icon NAME and resolve it here.
const ICONS = { ghost: Ghost, swords: Swords, gamepad: Gamepad2 } as const

interface GameWidgetProps {
  title: string
  description: string
  src: string
  iconName?: keyof typeof ICONS
}

export function GameWidget({ title, description, src, iconName = 'gamepad' }: GameWidgetProps) {
  const Icon = ICONS[iconName]
  const [open, setOpen] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  function handleFullscreen() {
    iframeRef.current?.requestFullscreen().catch(() => {
      // requestFullscreen may fail if the iframe hasn't received user gesture focus yet
    })
  }

  return (
    <>
      <Card className="flex flex-col gap-0 overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-5">
          {/* Icon + title */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/10 p-2">
              {Icon ? (
                <Icon className="h-5 w-5 text-violet-500" />
              ) : (
                <Gamepad2 className="h-5 w-5 text-violet-500" />
              )}
            </div>
            <span className="font-medium leading-snug">{title}</span>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">{description}</p>

          {/* CTA */}
          <Button
            className="w-full gap-2"
            onClick={() => setOpen(true)}
          >
            <Gamepad2 className="h-4 w-4" />
            Jugar
          </Button>
        </CardContent>
      </Card>

      {/* Dialog — iframe is only rendered when open === true (lazy load + GPU free on close) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[88vh] p-0 overflow-hidden flex flex-col gap-0">
          {/* Header strip */}
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-2 pr-10">
            <DialogTitle className="text-base font-semibold truncate">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <p className="hidden sm:block text-xs text-muted-foreground">
                Haz clic en el juego para capturar el mouse · ESC para salir
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={handleFullscreen}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Pantalla completa
              </Button>
            </div>
          </DialogHeader>

          {/* Game iframe — ONLY rendered when dialog is open */}
          {open && (
            <iframe
              ref={iframeRef}
              src={src}
              title={title}
              loading="lazy"
              allow="fullscreen; pointer-lock; gamepad; autoplay"
              className="h-full w-full border-0 flex-1"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
