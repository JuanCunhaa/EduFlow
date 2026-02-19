/**
 * Landing route group layout — renders full-width without app shell.
 * No sidebar, no header — just the landing page content.
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
