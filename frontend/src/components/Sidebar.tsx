"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getAuth } from "@/lib/api";

interface SidebarProps {
  links: { href: string; label: string; icon: string }[];
  roleLabel: string;
  roleIcon: string;
}

export default function Sidebar({ links, roleLabel, roleIcon }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span style={{ fontSize: 24 }}>📦</span>
        <h1>LastMile</h1>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-link${pathname === link.href ? " active" : ""}`}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 8 }}>
          <span style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "white", flexShrink: 0,
          }}>
            {roleIcon}
          </span>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {auth?.name || "User"}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{roleLabel}</div>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: "100%" }}
          onClick={() => { clearAuth(); router.push("/"); }}
        >
          ↩ Sign Out
        </button>
      </div>
    </aside>
  );
}
