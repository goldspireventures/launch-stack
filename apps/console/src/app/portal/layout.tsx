/**
 * Client-facing deal portal — no studio chrome; inherits root TRPC + theme.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
