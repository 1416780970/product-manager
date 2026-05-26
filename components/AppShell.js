"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AppShell({ children, user, title = "后台管理" }) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-title">产品物流管理</div>

        <nav className="sidebar-nav">
          <Link className="sidebar-link" href="/dashboard">
            首页仪表盘
          </Link>

          <Link className="sidebar-link" href="/products">
            产品管理
          </Link>

          <Link className="sidebar-link" href="/purchases">
            采购记录
          </Link>

          <Link className="sidebar-link" href="/amazon-shipments">
            亚马逊物流
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-danger btn-full" onClick={handleLogout}>
            退出登录
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-user">{user?.email}</div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}
