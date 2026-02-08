"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Factory, Package, BookOpen, Cog, ClipboardList, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { label: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    label: "",
    items: [
      { href: "/dashboard/production-run", label: "Production Run", icon: Factory },
    ],
  },
  {
    label: "Stock",
    items: [
      { href: "/dashboard/inventory", label: "Inventory", icon: Package },
      { href: "/dashboard/stock-ledger", label: "Stock Ledger", icon: BookOpen },
    ],
  },
  {
    label: "",
    items: [
      { href: "/dashboard/machinery", label: "Machinery", icon: Cog },
    ],
  },
  {
    label: "Asset Manager",
    items: [
      { href: "/dashboard/product-manager", label: "Product Manager", icon: ClipboardList },
      { href: "/dashboard/machine-manager", label: "Machine Manager", icon: Wrench },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {navSections.map((section, i) => (
        <div key={i} className={cn(i > 0 && "mt-3")}>
          {section.label && (
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
          )}
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
