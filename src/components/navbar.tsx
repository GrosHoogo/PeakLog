"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mountain,
  Map,
  BookOpen,
  BarChart3,
  Sparkles,
  Backpack,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/plan", label: "Planifier", icon: Sparkles },
  { href: "/gear", label: "Mon sac", icon: Backpack },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/map", label: "Carte", icon: Map },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-peak-border bg-peak-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Mountain className="h-7 w-7 text-amber-400" />
          <span className="font-display text-xl font-bold tracking-wide text-peak-text">
            Peaklog
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-forest-900 text-amber-400"
                    : "text-peak-text-muted hover:bg-peak-surface-light hover:text-peak-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="text-peak-text-muted md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="border-t border-peak-border bg-peak-bg px-4 pb-4 md:hidden">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-forest-900 text-amber-400"
                    : "text-peak-text-muted hover:bg-peak-surface-light"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
