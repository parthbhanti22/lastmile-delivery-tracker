"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

const CUSTOMER_LINKS = [
  { href: "/customer", label: "My Orders", icon: "📦" },
  { href: "/customer/new-order", label: "New Order", icon: "➕" },
  { href: "/customer/track", label: "Track Order", icon: "📍" },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    if (!auth || auth.role !== "customer") {
      router.push("/");
    }
  }, [auth, router]);

  if (!auth || auth.role !== "customer") return null;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar links={CUSTOMER_LINKS} roleLabel="Customer" roleIcon="📱" />
      <main className="main-content">{children}</main>
    </div>
  );
}
