/**
 * Shared loading UI for all authenticated (app) routes.
 * Next.js renders this instantly on navigation while the Server Component
 * for the target route streams in, giving immediate visual feedback.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      {/* Heading placeholder */}
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="mt-3 h-4 w-72 animate-pulse rounded-md bg-muted/70" />

      {/* Content placeholder rows */}
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full animate-pulse rounded-md border bg-muted/40"
          />
        ))}
      </div>
    </div>
  )
}
