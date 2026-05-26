"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";

export default function AmazonShipmentsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setUser(data.session.user);
      setLoading(false);
    }

    init();
  }, [router]);

  if (loading) {
    return <div className="loading-page">正在加载亚马逊物流页面...</div>;
  }

  return (
    <AppShell user={user} title="亚马逊物流">
      <div className="card">
        <h2>亚马逊物流</h2>
        <p>这里以后用于管理 FBA 发货记录。</p>
        <p>当前页面已创建成功。</p>
      </div>
    </AppShell>
  );
}
