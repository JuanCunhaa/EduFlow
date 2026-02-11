import './globals.css';

/**
 * Minimal root layout — delegates HTML structure to [locale]/layout.tsx
 * so next-intl can inject the correct `lang` attribute.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
