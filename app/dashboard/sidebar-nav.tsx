"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Factory, Package, BookOpen, Cog, ClipboardList, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/role";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { label: string; items: NavItem[]; requiredRole?: UserRole };

const navSections: NavSection[] = [
  {
    label: "",
    requiredRole: "ADMIN",
    items: [
      { href: "/dashboard/production-run", label: "Production Run", icon: Factory },
    ],
  },
  {
    label: "Stock",
    requiredRole: "ADMIN",
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
    requiredRole: "ADMIN",
    items: [
      { href: "/dashboard/product-manager", label: "Product Manager", icon: ClipboardList },
      { href: "/dashboard/machine-manager", label: "Machine Manager", icon: Wrench },
    ],
  },
];

interface SidebarNavProps {
  role: UserRole | null;
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();

  const visibleSections = navSections.filter(
    (section) => !section.requiredRole || section.requiredRole === role
  );

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {visibleSections.map((section, i) => (
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
