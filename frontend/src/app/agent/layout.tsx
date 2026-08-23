"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

const AGENT_LINKS = [
  { href: "/agent", label: "My Deliveries", icon: "📦" },
  { href: "/agent/profile", label: "My Profile", icon: "👤" },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    if (!auth || auth.role !== "agent") {
      router.push("/");
    }
  }, [auth, router]);

  if (!auth || auth.role !== "agent") return null;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar links={AGENT_LINKS} roleLabel="Delivery Agent" roleIcon="🚚" />
      <main className="main-content">{children}</main>
    </div>
  );
}
