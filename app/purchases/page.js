"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";

const emptyForm = {
  product_id: "",
  store_name: "",
  sku: "",
  product_name: "",
  purchase_date: "",
  quantity: "1",
  unit_price: "",
  total_price: "",
  domestic_logistics_company: "",
  domestic_tracking_number: "",
  note: "",
};

const PAGE_SIZE = 8;

export default function PurchasesPage() {
  const router = useRouter();

  const autoRefreshStartedRef = useRef(false);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState([]);
  const [records, setRecords] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [trackingLoadingMap, setTrackingLoadingMap] = useState({});
  const logisticsCompanies = [
  { value: "shunfeng", label: "顺丰速运" },
  { value: "yuantong", label: "圆通速递" },
  { value: "zhongtong", label: "中通快递" },
  { value: "shentong", label: "申通快递" },
  { value: "yunda", label: "韵达快递" },
  { value: "debangwuliu", label: "德邦快递" },
  { value: "jd", label: "京东物流" },
  { value: "jtexpress", label: "极兔速递" },
  { value: "ems", label: "EMS / 邮政" },
  { value: "baishiwuliu", label: "百世快运" },
  { value: "tiantian", label: "天天快递" },
];
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      const currentUser = data.session.user;
      setUser(currentUser);

      await loadProducts(currentUser.id);
      const loadedRecords = await loadPurchaseRecords(currentUser.id);

      setLoading(false);

      if (!autoRefreshStartedRef.current) {
        autoRefreshStartedRef.current = true;
        autoRefreshPendingTracking(currentUser.id, loadedRecords || []);
      }
    }

    init();
  }, [router]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [records, currentPage]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  }, [records]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return records.slice(start, start + PAGE_SIZE);
  }, [records, currentPage]);

  async function loadProducts(userId) {
    const { data, error } = await supabase
      .from("products")
      .select("id, store_name, sku, name, unit_price")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("加载产品失败：" + error.message);
      return [];
    }

    setProducts(data || []);
    return data || [];
  }

  async function loadPurchaseRecords(userId) {
    const { data, error } = await supabase
      .from("purchase_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("加载采购记录失败：" + error.message);
      return [];
    }

    setRecords(data || []);
    return data || [];
  }

  function toNumberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;

    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function toIntegerOrOne(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return 1;
    return Math.floor(num);
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") return "-";

    const num = Number(value);
    if (!Number.isFinite(num)) return "-";

    return num.toFixed(2);
  }

  function formatDate(value) {
    if (!value) return "-";
    return String(value).slice(0, 10);
  }

  function formatDateTime(value) {
    if (!value) return "-";

    try {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      const pad = (n) => String(n).padStart(2, "0");

      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
      )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return String(value);
    }
  }

  function getStatusClass(status) {
    if (status === "delivered") return "status-delivered";
    if (status === "in_transit") return "status-transit";
    if (status === "exception") return "status-exception";
    return "status-pending";
  }

  function getStatusText(record) {
    if (record.domestic_tracking_status_text) {
      return record.domestic_tracking_status_text;
    }

    if (record.domestic_tracking_status === "delivered") return "已送达";
    if (record.domestic_tracking_status === "in_transit") return "运输中";
    if (record.domestic_tracking_status === "exception") return "异常";
    if (record.domestic_tracking_status === "pending") return "待揽收";

    return "未查询";
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "quantity" || name === "unit_price") {
        const quantity =
          name === "quantity" ? toIntegerOrOne(value) : toIntegerOrOne(prev.quantity);

        const unitPrice =
          name === "unit_price"
            ? toNumberOrNull(value)
            : toNumberOrNull(prev.unit_price);

        if (unitPrice !== null) {
          next.total_price = (quantity * unitPrice).toFixed(2);
        } else {
          next.total_price = "";
        }
      }

      return next;
    });
  }

  function handleProductChange(e) {
    const productId = e.target.value;
    const selectedProduct = products.find((item) => item.id === productId);

    if (!selectedProduct) {
      setForm((prev) => ({
        ...prev,
        product_id: "",
        store_name: "",
        sku: "",
        product_name: "",
        unit_price: "",
        total_price: "",
      }));
      return;
    }

    const quantity = toIntegerOrOne(form.quantity);
    const unitPrice = toNumberOrNull(selectedProduct.unit_price);
    const totalPrice = unitPrice !== null ? (quantity * unitPrice).toFixed(2) : "";

    setForm((prev) => ({
      ...prev,
      product_id: selectedProduct.id,
      store_name: selectedProduct.store_name || "",
      sku: selectedProduct.sku || "",
      product_name: selectedProduct.name || "",
      unit_price: selectedProduct.unit_price ?? "",
      total_price: totalPrice,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) {
      setError("用户未登录");
      return;
    }

    setError("");

    if (!form.product_id) {
      setError("请选择产品");
      return;
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      setError("请输入正确的采购数量");
      return;
    }

    setSaving(true);

    try {
      const quantity = toIntegerOrOne(form.quantity);
      const unitPrice = toNumberOrNull(form.unit_price);
      const totalPrice = unitPrice !== null ? quantity * unitPrice : null;

      const payload = {
        product_id: form.product_id,
        store_name: form.store_name || null,
        sku: form.sku || null,
        product_name: form.product_name || null,
        purchase_date: form.purchase_date || null,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,

        domestic_logistics_company:
          form.domestic_logistics_company.trim() || null,
        domestic_tracking_number:
          form.domestic_tracking_number.trim() || null,

        note: form.note.trim() || null,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("purchase_records")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("purchase_records")
          .insert({
            ...payload,
            user_id: user.id,
          });

        if (insertError) throw insertError;
      }

      resetForm();
      await loadPurchaseRecords(user.id);

      alert(editingId ? "采购记录更新成功" : "采购记录保存成功");
    } catch (err) {
      console.error(err);
      setError(err.message || "保存失败");
      alert(err.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(record) {
    setEditingId(record.id);

    setForm({
      product_id: record.product_id || "",
      store_name: record.store_name || "",
      sku: record.sku || "",
      product_name: record.product_name || "",
      purchase_date: record.purchase_date || "",
      quantity: record.quantity ?? "1",
      unit_price: record.unit_price ?? "",
      total_price: record.total_price ?? "",
      domestic_logistics_company: record.domestic_logistics_company || "",
      domestic_tracking_number: record.domestic_tracking_number || "",
      note: record.note || "",
    });

    const panel = document.querySelector(".purchase-left-panel");
    if (panel) {
      panel.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  async function handleDelete(id) {
    if (!user) return;

    if (!confirm("确定要删除这条采购记录吗？")) {
      return;
    }

    const { error } = await supabase
      .from("purchase_records")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      setError("删除失败：" + error.message);
      return;
    }

    await loadPurchaseRecords(user.id);
  }

  async function queryTracking(record, options = {}) {
    const { silent = false } = options;

    if (!user) return;

    if (
      !record.domestic_logistics_company ||
      !record.domestic_tracking_number
    ) {
      if (!silent) {
        alert("请先填写物流公司和物流单号");
      }
      return;
    }

    setTrackingLoadingMap((prev) => ({
      ...prev,
      [record.id]: true,
    }));

    try {
      const params = new URLSearchParams({
        company: record.domestic_logistics_company,
        number: record.domestic_tracking_number,
      });

      const response = await fetch(`/api/tracking?${params.toString()}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "查询物流失败");
      }

      const updatePayload = {
        domestic_tracking_status: data.status || null,
        domestic_tracking_status_text: data.statusText || null,
        domestic_tracking_events: data.events || [],
        domestic_ship_date: data.shipDate || null,
        domestic_arrival_date: data.arrivalDate || null,
        last_tracking_checked_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("purchase_records")
        .update(updatePayload)
        .eq("id", record.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setRecords((prev) =>
        prev.map((item) =>
          item.id === record.id
            ? {
                ...item,
                ...updatePayload,
              }
            : item
        )
      );

      if (!silent) {
        alert("物流轨迹已更新");
      }
    } catch (err) {
      console.error(err);

      if (!silent) {
        alert(err.message || "查询物流失败");
      }
    } finally {
      setTrackingLoadingMap((prev) => ({
        ...prev,
        [record.id]: false,
      }));
    }
  }

  async function autoRefreshPendingTracking(userId, loadedRecords) {
    const pendingRecords = (loadedRecords || []).filter((record) => {
      return (
        record.domestic_logistics_company &&
        record.domestic_tracking_number &&
        record.domestic_tracking_status !== "delivered"
      );
    });

    if (pendingRecords.length === 0) {
      return;
    }

    /**
     * 为了避免一次性请求过多，这里逐条刷新。
     * 如果以后记录很多，可以改成限制每天自动刷新一次。
     */
    for (const record of pendingRecords) {
      await queryTracking(record, { silent: true });
    }

    await loadPurchaseRecords(userId);
  }

  if (loading) {
    return <div className="loading-page">正在加载采购管理页面...</div>;
  }

  return (
    <AppShell user={user} title="采购管理">
      <div className="purchase-page-layout">
        <div className="purchase-left-panel">
          <div className="card purchase-form-card">
            <h2>{editingId ? "编辑采购记录" : "新增采购记录"}</h2>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-item">
                <label>选择产品 *</label>
                <select
                  name="product_id"
                  value={form.product_id}
                  onChange={handleProductChange}
                >
                  <option value="">请选择产品</option>
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.store_name || "-"} / {item.sku || "-"} /{" "}
                      {item.name || "-"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-item">
                  <label>店铺名称</label>
                  <input value={form.store_name} readOnly />
                </div>

                <div className="form-item">
                  <label>SKU</label>
                  <input value={form.sku} readOnly />
                </div>
              </div>

              <div className="form-item">
                <label>产品名称</label>
                <input value={form.product_name} readOnly />
              </div>

              <div className="form-row">
                <div className="form-item">
                  <label>采购日期</label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={form.purchase_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-item">
                  <label>采购数量 *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="例如：100"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-item">
                  <label>默认单价</label>
                  <input
                    type="number"
                    step="0.01"
                    name="unit_price"
                    value={form.unit_price}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-item">
                  <label>采购总金额</label>
                  <input value={form.total_price} readOnly />
                </div>
              </div>

              <hr />

              <h3>国内物流信息</h3>

              <div className="form-item">
  <label>国内物流公司</label>
  <select
    name="domestic_logistics_company"
    value={form.domestic_logistics_company}
    onChange={handleChange}
  >
    <option value="">请选择物流公司</option>
    {logisticsCompanies.map((item) => (
      <option key={item.value} value={item.value}>
        {item.label}
      </option>
    ))}
  </select>
</div>

              <div className="form-item">
                <label>国内物流单号</label>
                <input
                  name="domestic_tracking_number"
                  value={form.domestic_tracking_number}
                  onChange={handleChange}
                  placeholder="请输入物流单号"
                />
              </div>

              <div className="form-item">
                <label>备注</label>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="采购备注"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={saving}
              >
                {saving ? "保存中..." : editingId ? "更新采购记录" : "保存采购记录"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={resetForm}
                >
                  取消编辑
                </button>
              )}

              {error && <div className="error">{error}</div>}
            </form>
          </div>
        </div>

        <div className="purchase-right-panel">
          <div className="card purchase-list-card">
            <div className="purchase-list-header">
              <div>
                <h2>采购记录</h2>
                <div className="muted">
                  共 {records.length} 条，每页 {PAGE_SIZE} 条
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => loadPurchaseRecords(user.id)}
              >
                刷新列表
              </button>
            </div>

            {records.length === 0 ? (
              <div className="empty">暂无采购记录。</div>
            ) : (
              <>
                <div className="purchase-list-fixed">
                  {paginatedRecords.map((record) => {
                    const events = Array.isArray(
                      record.domestic_tracking_events
                    )
                      ? record.domestic_tracking_events
                      : [];

                    return (
                      <div key={record.id} className="purchase-record-card">
                        <div className="purchase-record-main">
                          <div>
                            <div className="record-title">
                              {record.product_name || "-"}
                            </div>
                            <div className="record-subtitle">
                              {record.store_name || "-"} / {record.sku || "-"}
                            </div>
                          </div>

                          <div className="record-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleEdit(record)}
                            >
                              编辑
                            </button>

                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => handleDelete(record.id)}
                            >
                              删除
                            </button>
                          </div>
                        </div>

                        <div className="record-grid">
                          <div>
                            <span className="field-label">采购日期</span>
                            <span>{formatDate(record.purchase_date)}</span>
                          </div>

                          <div>
                            <span className="field-label">数量</span>
                            <span>{record.quantity || "-"}</span>
                          </div>

                          <div>
                            <span className="field-label">单价</span>
                            <span>{formatMoney(record.unit_price)}</span>
                          </div>

                          <div>
                            <span className="field-label">总金额</span>
                            <span>{formatMoney(record.total_price)}</span>
                          </div>
                        </div>

                        <div className="tracking-box">
                          <div className="tracking-header">
                            <div>
                              <div className="tracking-title">
                                国内物流：{" "}
                                {record.domestic_logistics_company || "-"} /{" "}
                                {record.domestic_tracking_number || "-"}
                              </div>

                              <div className="tracking-meta">
                                <span
                                  className={`status-pill ${getStatusClass(
                                    record.domestic_tracking_status
                                  )}`}
                                >
                                  {getStatusText(record)}
                                </span>

                                <span className="muted">
                                  最后查询：
                                  {formatDateTime(
                                    record.last_tracking_checked_at
                                  )}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-small btn-primary"
                              disabled={!!trackingLoadingMap[record.id]}
                              onClick={() => queryTracking(record)}
                            >
                              {trackingLoadingMap[record.id]
                                ? "查询中..."
                                : "查询轨迹"}
                            </button>
                          </div>

                          <div className="record-grid">
                            <div>
                              <span className="field-label">国内发货日期</span>
                              <span>{formatDate(record.domestic_ship_date)}</span>
                            </div>

                            <div>
                              <span className="field-label">国内到货日期</span>
                              <span>
                                {formatDate(record.domestic_arrival_date)}
                              </span>
                            </div>
                          </div>

                          {events.length > 0 ? (
                            <div className="tracking-events">
                              {events.map((event, index) => (
                                <div key={index} className="tracking-event">
                                  <div className="tracking-dot" />
                                  <div className="tracking-event-content">
                                    <div className="tracking-event-time">
                                      {event.time || "-"}
                                    </div>
                                    <div>
                                      <strong>{event.status || "-"}</strong>
                                      {event.location ? (
                                        <span> / {event.location}</span>
                                      ) : null}
                                    </div>
                                    {event.description && (
                                      <div className="muted">
                                        {event.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="empty-small">
                              暂无轨迹，请点击“查询轨迹”。
                            </div>
                          )}
                        </div>

                        {record.note && (
                          <div className="record-note">
                            <span className="field-label">备注：</span>
                            {record.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pagination">
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    上一页
                  </button>

                  <span>
                    第 {currentPage} 页 / 共 {totalPages} 页
                  </span>

                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    下一页
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
