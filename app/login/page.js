"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
  console.log("登录错误：", error);
  setError(error.message || "登录失败，请检查邮箱或密码");
  return;
}

    router.push("/dashboard");
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <h1 className="login-title">登录后台</h1>
        <p className="login-subtitle">个人产品与物流管理系统</p>

        <div className="form-item">
          <label>邮箱</label>
          <input
            type="email"
            placeholder="请输入邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-item">
          <label>密码</label>
          <input
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary btn-full" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>

        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
