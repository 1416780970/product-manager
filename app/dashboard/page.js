"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    products: 0,
    batteryProducts: 0,
    purchases: 0,
    amazonShipments: 0,
  });

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      const currentUser = data.session.user;
      setUser(currentUser);

      await loadStats(currentUser.id);

      setLoading(false);
    }

    init();
  }, [router]);

  async function loadStats(userId) {
    const { count: productsCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: batteryCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("battery", true);

    const { count: purchasesCount } = await supabase
      .from("purchase_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: amazonCount } = await supabase
      .from("amazon_shipments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    setStats({
      products: productsCount || 0,
      batteryProducts: batteryCount || 0,
      purchases: purchasesCount || 0,
      amazonShipments: amazonCount || 0,
    });
  }

  if (loading) {
    return <div className="loading-page">正在加载后台...</div>;
  }

  return (
    <AppShell user={user} title="首页仪表盘">
      <div className="stats">
        <div className="stat-card">
          <div className="stat-title">产品总数</div>
          <div className="stat-value">{stats.products}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">带电产品</div>
          <div className="stat-value">{stats.batteryProducts}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">采购记录</div>
          <div className="stat-value">{stats.purchases}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">FBA 发货记录</div>
          <div className="stat-value">{stats.amazonShipments}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>欢迎使用</h2>
        <p>这里是你的个人产品与物流管理系统。</p>
        <p>下一步我们会继续添加「产品管理」页面，用数据库保存产品信息。</p>
      </div>
    </AppShell>
  );
}
