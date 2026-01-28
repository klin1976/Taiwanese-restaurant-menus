import React, { useEffect, useState } from "react";

function StoreInitPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStores() {
      try {

        //測試用本地端伺服器
        // const res = await fetch("/api/stores"); // <-- 改成你的 API 路徑
        const res = await fetch("http://localhost:3002/api/stores");
        //測試用本地端伺服器
        
        if (!res.ok) {
          throw new Error(`API 回應錯誤：${res.status}`);
        }
        const data = await res.json();
        setStores(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStores();
  }, []);

  if (loading) {
    return <p>⏳ 正在初始化店家資料…</p>;
  }

  if (error) {
    return (
      <div style={{ color: "red" }}>
        ❌ 載入失敗：{error}
      </div>
    );
  }

  return (
    <div>
      <h2>✅ 店家清單</h2>
      <ul>
        {stores.map((store) => (
          <li key={store.id}>
            {store.name} - {store.menu?.join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default StoreInitPage;
