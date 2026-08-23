"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/orders", label: "Orders", icon: "📦" },
  { href: "/admin/agents", label: "Agents", icon: "🚚" },
  { href: "/admin/zones", label: "Zones & Rates", icon: "🗺️" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    if (!auth || auth.role !== "admin") {
      router.push("/");
    }
  }, [auth, router]);

  if (!auth || auth.role !== "admin") return null;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar links={ADMIN_LINKS} roleLabel="Administrator" roleIcon="👑" />
      <main className="main-content">{children}</main>
    </div>
  );
}
