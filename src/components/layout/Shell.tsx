'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { ReactNode } from 'react';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col transition-all duration-200 md:ml-60">
        <Header />
        <main className="relative flex-1 px-4 py-8 pt-20 md:px-8 md:pt-8">
          {/* Ambient background glow */}
          <div className="ambient-glow -top-40 left-1/3 -z-10" />
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
