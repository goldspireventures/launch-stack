/** Server-safe loading shell for App Router `loading.tsx`. */
export function AppRouteLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 py-16">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        role="status"
        aria-label={label}
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
