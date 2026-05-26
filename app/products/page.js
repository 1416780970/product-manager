"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";

const emptyForm = {
  store_name: "",
  name: "",
  sku: "",
  unit_price: "",
  category: "",
  battery: false,

  product_length_cm: "",
  product_width_cm: "",
  product_height_cm: "",
  product_weight_kg: "",

  note: "",
};

const emptyCartonSpec = {
  carton_name: "",
  carton_quantity: "",
  carton_length_cm: "",
  carton_width_cm: "",
  carton_height_cm: "",
  carton_weight_kg: "",
  note: "",
};

export default function ProductsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [cartonSpecs, setCartonSpecs] = useState([{ ...emptyCartonSpec }]);
  const [error, setError] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [selectedStore, setSelectedStore] = useState("全部");
 const storeNames = Array.from(
  new Set(products.map((item) => item.store_name).filter(Boolean))
);

const filteredProducts =
  selectedStore === "全部"
    ? products
    : products.filter((item) => item.store_name === selectedStore);

const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

const pagedProducts = filteredProducts.slice(
  (currentPage - 1) * pageSize,
  currentPage * pageSize
);


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
      setLoading(false);
    }

    init();
  }, [router]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function loadProducts(userId) {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_carton_specs (
          id,
          carton_name,
          carton_quantity,
          carton_length_cm,
          carton_width_cm,
          carton_height_cm,
          carton_weight_kg,
          note
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setError("加载产品失败：" + error.message);
      return;
    }

    setProducts(data || []);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleCartonChange(index, e) {
    const { name, value } = e.target;

    setCartonSpecs((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [name]: value,
            }
          : item
      )
    );
  }

  function addCartonSpec() {
    setCartonSpecs((prev) => [...prev, { ...emptyCartonSpec }]);
  }

  function removeCartonSpec(index) {
    setCartonSpecs((prev) => {
      if (prev.length === 1) {
        return [{ ...emptyCartonSpec }];
      }

      return prev.filter((_, i) => i !== index);
    });
  }

  function toNumberOrNull(value) {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function cmToInch(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || value === "") return "-";
    return (num / 2.54).toFixed(2);
  }

  function kgToLb(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || value === "") return "-";
    return (num * 2.20462).toFixed(2);
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    const num = Number(value);

    if (!Number.isFinite(num)) {
      return "-";
    }

    return num.toFixed(2);
  }

  function handleCancelEdit() {
    setEditingProductId(null);
    setForm({ ...emptyForm });
    setCartonSpecs([{ ...emptyCartonSpec }]);
  }

  function hasProductSize(item) {
    return (
      item.product_length_cm ||
      item.product_width_cm ||
      item.product_height_cm
    );
  }
  function handleStoreChange(storeName) {
  setSelectedStore(storeName);
  setCurrentPage(1);
}

  function hasCartonSize(carton) {
    return (
      carton.carton_length_cm ||
      carton.carton_width_cm ||
      carton.carton_height_cm
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) {
      setError("用户未登录");
      return;
    }

    setError("");

    if (!form.store_name.trim()) {
      setError("请输入店铺名称");
      return;
    }

    if (!form.name.trim()) {
      setError("请输入产品名称");
      return;
    }

    if (!form.sku.trim()) {
      setError("请输入 SKU");
      return;
    }

    setSaving(true);

    const isEditing = !!editingProductId;

    try {
      const productPayload = {
        store_name: form.store_name.trim(),
        name: form.name.trim(),
        sku: form.sku.trim(),
        unit_price: toNumberOrNull(form.unit_price),
        category: form.category.trim() || null,
        battery: form.battery,

        product_length_cm: toNumberOrNull(form.product_length_cm),
        product_width_cm: toNumberOrNull(form.product_width_cm),
        product_height_cm: toNumberOrNull(form.product_height_cm),
        product_weight_kg: toNumberOrNull(form.product_weight_kg),

        note: form.note.trim() || null,
      };

      let productId = editingProductId;

      if (editingProductId) {
        const { error: updateError } = await supabase
          .from("products")
          .update(productPayload)
          .eq("id", editingProductId)
          .eq("user_id", user.id);

        if (updateError) {
          throw updateError;
        }

        const { error: deleteCartonError } = await supabase
          .from("product_carton_specs")
          .delete()
          .eq("product_id", editingProductId)
          .eq("user_id", user.id);

        if (deleteCartonError) {
          throw deleteCartonError;
        }
      } else {
        const { data: insertedProduct, error: insertError } = await supabase
          .from("products")
          .insert({
            ...productPayload,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (insertError) {
          throw insertError;
        }

        productId = insertedProduct.id;
      }

      const validCartonSpecs = cartonSpecs
        .filter((carton) => {
          return (
            carton.carton_name ||
            carton.carton_quantity ||
            carton.carton_length_cm ||
            carton.carton_width_cm ||
            carton.carton_height_cm ||
            carton.carton_weight_kg ||
            carton.note
          );
        })
        .map((carton) => ({
          user_id: user.id,
          product_id: productId,
          carton_name: carton.carton_name.trim() || null,
          carton_quantity: toNumberOrNull(carton.carton_quantity),
          carton_length_cm: toNumberOrNull(carton.carton_length_cm),
          carton_width_cm: toNumberOrNull(carton.carton_width_cm),
          carton_height_cm: toNumberOrNull(carton.carton_height_cm),
          carton_weight_kg: toNumberOrNull(carton.carton_weight_kg),
          note: carton.note.trim() || null,
        }));

      if (validCartonSpecs.length > 0) {
        const { error: cartonInsertError } = await supabase
          .from("product_carton_specs")
          .insert(validCartonSpecs);

        if (cartonInsertError) {
          throw cartonInsertError;
        }
      }

      setEditingProductId(null);
      setForm({ ...emptyForm });
      setCartonSpecs([{ ...emptyCartonSpec }]);

      await loadProducts(user.id);
      setCurrentPage(1);

      alert(isEditing ? "产品更新成功" : "产品保存成功");
    } catch (error) {
      console.error(error);
      setError(error.message || "保存失败");
      alert(error.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("确定要删除这个产品吗？")) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.log(error);
      setError("删除失败：" + error.message);
      return;
    }

    await loadProducts(user.id);
  }

  function handleEdit(item) {
    setEditingProductId(item.id);

    setForm({
      store_name: item.store_name || "",
      name: item.name || "",
      sku: item.sku || "",
      unit_price: item.unit_price ?? "",
      category: item.category || "",
      battery: item.battery || false,

      product_length_cm: item.product_length_cm ?? "",
      product_width_cm: item.product_width_cm ?? "",
      product_height_cm: item.product_height_cm ?? "",
      product_weight_kg: item.product_weight_kg ?? "",

      note: item.note || "",
    });

    if (item.product_carton_specs && item.product_carton_specs.length > 0) {
      setCartonSpecs(
        item.product_carton_specs.map((carton) => ({
          carton_name: carton.carton_name || "",
          carton_quantity: carton.carton_quantity ?? "",
          carton_length_cm: carton.carton_length_cm ?? "",
          carton_width_cm: carton.carton_width_cm ?? "",
          carton_height_cm: carton.carton_height_cm ?? "",
          carton_weight_kg: carton.carton_weight_kg ?? "",
          note: carton.note || "",
        }))
      );
    } else {
      setCartonSpecs([{ ...emptyCartonSpec }]);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (loading) {
    return <div className="loading-page">正在加载产品管理页面...</div>;
  }

  return (
    <AppShell user={user} title="产品管理">
      <div className="products-page">
        <div className="card products-left-card">
          <h2>{editingProductId ? "编辑产品" : "新增产品"}</h2>

          <form onSubmit={handleSubmit} className="products-form">
            <div className="products-form-scroll">
              <div className="form-item">
                <label>店铺名称 *</label>
                <input
                  name="store_name"
                  value={form.store_name}
                  onChange={handleChange}
                  placeholder="例如：美国店 / 英国店 / A店铺"
                />
              </div>

              <div className="form-item">
                <label>产品名称 *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="例如：蓝牙耳机"
                />
              </div>

              <div className="form-item">
                <label>SKU *</label>
                <input
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="例如：BT-001-US"
                />
              </div>

              <div className="form-row">
                <div className="form-item">
                  <label>单价</label>
                  <input
                    type="number"
                    step="0.01"
                    name="unit_price"
                    value={form.unit_price}
                    onChange={handleChange}
                    placeholder="例如：12.5"
                  />
                </div>

                <div className="form-item">
                  <label>分类</label>
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="例如：电子产品"
                  />
                </div>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="battery"
                  checked={form.battery}
                  onChange={handleChange}
                />
                <span>是否带电产品</span>
              </label>

              <hr />

              <h3>产品尺寸与重量</h3>

              <div className="form-row">
                <div className="form-item">
                  <label>产品长 cm</label>
                  <input
                    type="number"
                    step="0.01"
                    name="product_length_cm"
                    value={form.product_length_cm}
                    onChange={handleChange}
                  />
                  <small>{cmToInch(form.product_length_cm)} inch</small>
                </div>

                <div className="form-item">
                  <label>产品宽 cm</label>
                  <input
                    type="number"
                    step="0.01"
                    name="product_width_cm"
                    value={form.product_width_cm}
                    onChange={handleChange}
                  />
                  <small>{cmToInch(form.product_width_cm)} inch</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-item">
                  <label>产品高 cm</label>
                  <input
                    type="number"
                    step="0.01"
                    name="product_height_cm"
                    value={form.product_height_cm}
                    onChange={handleChange}
                  />
                  <small>{cmToInch(form.product_height_cm)} inch</small>
                </div>

                <div className="form-item">
                  <label>产品重量 kg</label>
                  <input
                    type="number"
                    step="0.001"
                    name="product_weight_kg"
                    value={form.product_weight_kg}
                    onChange={handleChange}
                  />
                  <small>{kgToLb(form.product_weight_kg)} lb</small>
                </div>
              </div>

              <hr />

              <h3>外箱箱规</h3>

              {cartonSpecs.map((item, index) => (
                <div key={index} className="carton-box">
                  <div className="carton-header">
                    <strong>外箱箱规 {index + 1}</strong>

                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      onClick={() => removeCartonSpec(index)}
                    >
                      删除
                    </button>
                  </div>

                  <div className="form-item">
                    <label>箱规名称</label>
                    <input
                      name="carton_name"
                      value={item.carton_name}
                      onChange={(e) => handleCartonChange(index, e)}
                      placeholder="例如：标准箱 / 大箱 / 小箱"
                    />
                  </div>

                  <div className="form-item">
                    <label>每箱数量</label>
                    <input
                      type="number"
                      step="1"
                      name="carton_quantity"
                      value={item.carton_quantity}
                      onChange={(e) => handleCartonChange(index, e)}
                      placeholder="例如：50"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-item">
                      <label>外箱长 cm</label>
                      <input
                        type="number"
                        step="0.01"
                        name="carton_length_cm"
                        value={item.carton_length_cm}
                        onChange={(e) => handleCartonChange(index, e)}
                      />
                      <small>{cmToInch(item.carton_length_cm)} inch</small>
                    </div>

                    <div className="form-item">
                      <label>外箱宽 cm</label>
                      <input
                        type="number"
                        step="0.01"
                        name="carton_width_cm"
                        value={item.carton_width_cm}
                        onChange={(e) => handleCartonChange(index, e)}
                      />
                      <small>{cmToInch(item.carton_width_cm)} inch</small>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-item">
                      <label>外箱高 cm</label>
                      <input
                        type="number"
                        step="0.01"
                        name="carton_height_cm"
                        value={item.carton_height_cm}
                        onChange={(e) => handleCartonChange(index, e)}
                      />
                      <small>{cmToInch(item.carton_height_cm)} inch</small>
                    </div>

                    <div className="form-item">
                      <label>外箱重量 kg</label>
                      <input
                        type="number"
                        step="0.001"
                        name="carton_weight_kg"
                        value={item.carton_weight_kg}
                        onChange={(e) => handleCartonChange(index, e)}
                      />
                      <small>{kgToLb(item.carton_weight_kg)} lb</small>
                    </div>
                  </div>

                  <div className="form-item">
                    <label>外箱备注</label>
                    <input
                      name="note"
                      value={item.note}
                      onChange={(e) => handleCartonChange(index, e)}
                      placeholder="例如：适合空运 / 适合海运"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={addCartonSpec}
              >
                + 添加外箱箱规
              </button>

              <div className="form-item">
                <label>备注</label>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="其他说明"
                />
              </div>
            </div>

            <div className="products-form-actions">
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={saving}
              >
                {saving ? "保存中..." : editingProductId ? "更新产品" : "保存产品"}
              </button>

              {editingProductId && (
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={handleCancelEdit}
                >
                  取消编辑
                </button>
              )}

              {error && <div className="error">{error}</div>}
            </div>
          </form>
        </div>

        <div className="card products-right-card">
  <div className="products-list-header">
    <h2>产品列表</h2>

    <div className="store-tabs">
      <button
        type="button"
        className={selectedStore === "全部" ? "active" : ""}
        onClick={() => handleStoreChange("全部")}
      >
        全部
      </button>

      {storeNames.map((storeName) => (
        <button
          key={storeName}
          type="button"
          className={selectedStore === storeName ? "active" : ""}
          onClick={() => handleStoreChange(storeName)}
        >
          {storeName}
        </button>
      ))}
    </div>
  </div>

  {products.length === 0 ? (
  <div className="empty">暂无产品，请先新增。</div>
) : filteredProducts.length === 0 ? (
  <div className="empty">当前店铺暂无产品。</div>
) : (

            <>
              <div className="products-table-scroll">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>店铺</th>
                        <th>SKU</th>
                        <th>产品名称</th>
                        <th>单价</th>
                        <th>产品尺寸</th>
                        <th>产品重量</th>
                        <th>外箱箱规</th>
                        <th>外箱尺寸</th>
                        <th>外箱重量</th>
                        <th>带电</th>
                        <th>操作</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pagedProducts.map((item) => (
                        <tr key={item.id}>
                          <td>{item.store_name || "-"}</td>
                          <td>{item.sku || "-"}</td>
                          <td>{item.name || "-"}</td>
                          <td>{formatMoney(item.unit_price)}</td>

                          <td>
                            {hasProductSize(item) ? (
                              <>
                                <div>
                                  {item.product_length_cm || "-"} ×{" "}
                                  {item.product_width_cm || "-"} ×{" "}
                                  {item.product_height_cm || "-"} cm
                                </div>
                                <div className="muted">
                                  {cmToInch(item.product_length_cm)} ×{" "}
                                  {cmToInch(item.product_width_cm)} ×{" "}
                                  {cmToInch(item.product_height_cm)} inch
                                </div>
                              </>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td>
                            {item.product_weight_kg ? (
                              <>
                                <div>{item.product_weight_kg} kg</div>
                                <div className="muted">
                                  {kgToLb(item.product_weight_kg)} lb
                                </div>
                              </>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td>
                            {item.product_carton_specs &&
                            item.product_carton_specs.length > 0 ? (
                              <div className="carton-list-simple">
                                {item.product_carton_specs.map((carton) => (
                                  <div
                                    key={carton.id}
                                    className="carton-line-item"
                                  >
                                    <div>
                                      <strong>
                                        {carton.carton_name || "未命名箱规"}
                                      </strong>
                                    </div>

                                    <div>
                                      {carton.carton_quantity
                                        ? `${carton.carton_quantity} 个/箱`
                                        : "数量未填"}
                                    </div>

                                    {carton.note && (
                                      <div className="muted">{carton.note}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td>
                            {item.product_carton_specs &&
                            item.product_carton_specs.length > 0 ? (
                              <div className="carton-list-simple">
                                {item.product_carton_specs.map((carton) => (
                                  <div
                                    key={carton.id}
                                    className="carton-line-item"
                                  >
                                    {hasCartonSize(carton) ? (
                                      <>
                                        <div>
                                          {carton.carton_length_cm || "-"} ×{" "}
                                          {carton.carton_width_cm || "-"} ×{" "}
                                          {carton.carton_height_cm || "-"} cm
                                        </div>

                                        <div className="muted">
                                          {cmToInch(carton.carton_length_cm)} ×{" "}
                                          {cmToInch(carton.carton_width_cm)} ×{" "}
                                          {cmToInch(carton.carton_height_cm)} inch
                                        </div>
                                      </>
                                    ) : (
                                      "尺寸未填"
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td>
                            {item.product_carton_specs &&
                            item.product_carton_specs.length > 0 ? (
                              <div className="carton-list-simple">
                                {item.product_carton_specs.map((carton) => (
                                  <div
                                    key={carton.id}
                                    className="carton-line-item"
                                  >
                                    {carton.carton_weight_kg ? (
                                      <>
                                        <div>{carton.carton_weight_kg} kg</div>
                                        <div className="muted">
                                          {kgToLb(carton.carton_weight_kg)} lb
                                        </div>
                                      </>
                                    ) : (
                                      "重量未填"
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td>{item.battery ? "是" : "否"}</td>

                          <td>
                            <div className="action-buttons">
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleEdit(item)}
                              >
                                编辑
                              </button>

                              <button
                                type="button"
                                className="danger-button"
                                onClick={() => handleDelete(item.id)}
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="products-pagination">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  上一页
                </button>

                <span>
  第 {currentPage} / {totalPages} 页，共 {filteredProducts.length} 个产品
                </span>


                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                >
                  下一页
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
