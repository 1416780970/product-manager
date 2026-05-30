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
    let isMounted = true;

    async function init() {
      setLoading(true);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.log("获取登录状态失败：", error);
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      const currentUser = data.session.user;

      if (!isMounted) return;

      setUser(currentUser);

      await loadStats(currentUser.id);

      if (!isMounted) return;

      setLoading(false);
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function loadStats(userId) {
    const [
      productsResult,
      batteryResult,
      purchasesResult,
      amazonResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),

      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("battery", true),

      supabase
        .from("purchase_records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),

      supabase
        .from("amazon_shipments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    if (productsResult.error) {
      console.log("产品数量查询失败：", productsResult.error);
    }

    if (batteryResult.error) {
      console.log("带电产品数量查询失败：", batteryResult.error);
    }

    if (purchasesResult.error) {
      console.log("采购记录数量查询失败：", purchasesResult.error);
    }

    if (amazonResult.error) {
      console.log("FBA 发货记录数量查询失败：", amazonResult.error);
    }

    setStats({
      products: productsResult.count || 0,
      batteryProducts: batteryResult.count || 0,
      purchases: purchasesResult.count || 0,
      amazonShipments: amazonResult.count || 0,
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
