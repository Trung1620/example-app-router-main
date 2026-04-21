# 📋 Hướng dẫn bổ sung chức năng Nhập/Xuất/Tồn kho

## 1. Tình hình hiện tại

### ✅ Chức năng đã có
- **Nhập kho (IN):** Tạo phiếu nhập, chọn kho, chọn SKU, nhập số lượng, unit cost
- **Xuất kho (OUT):** Tạo phiếu xuất, kiểm tra đủ tồn kho trước khi xuất
- **Tồn kho (BALANCE):** Hiển thị tổng tồn kho theo kho, sản phẩm
- **Lịch sử (HISTORY):** Xem danh sách phiếu nhập/xuất

### ❌ Chức năng thiếu / cần bổ sung
1. **Kiểm kê, điều chỉnh tồn kho (ADJUST)**
2. **Cảnh báo tồn kho dưới mức tối thiểu (Low Stock Alert)**
3. **Xác nhận phiếu (Confirm movement) - Multi-step workflow**
4. **Báo cáo nhập/xuất/tồn (Report & Export)**
5. **Lý do xuất kho (Reason for out)**
6. **In phiếu nhập/xuất**

---

## 2. Các API mới đã được tạo

### 2.1 POST `/api/inventory/move-confirm`
**Xác nhận phiếu nhập/xuất (chuyển từ DRAFT → CONFIRMED)**

```bash
POST /api/inventory/move-confirm
Authorization: Bearer {token}
Content-Type: application/json

{
  "moveId": "phieu-001"
}
```

**Response:**
```json
{
  "ok": true,
  "move": { ... }
}
```

---

### 2.2 GET `/api/inventory/low-stock`
**Lấy danh sách tồn kho dưới mức tối thiểu**

```bash
GET /api/inventory/low-stock?warehouseId=wh-001&minStock=10
Authorization: Bearer {token}
```

**Response:**
```json
{
  "items": [
    {
      "id": "balance-id",
      "warehouseId": "wh-001",
      "warehouseName": "Kho chính",
      "productId": "prod-001",
      "variantId": "var-001",
      "qty": 5,
      "minAlert": 10,
      "product": { "nameVi": "Khay mây", "brand": "SeedsBiz" },
      "variant": { "sku": "KM-001-01", "name": "Size M" }
    }
  ]
}
```

---

### 2.3 POST `/api/inventory/adjust`
**Tạo phiếu kiểm kê (ADJUST)**

```bash
POST /api/inventory/adjust
Authorization: Bearer {token}
Content-Type: application/json

{
  "warehouseId": "wh-001",
  "items": [
    {
      "variantId": "var-001",
      "currentQty": 25,
      "reason": "kiểm kê"
    },
    {
      "variantId": "var-002",
      "currentQty": 10,
      "reason": "hỏng"
    }
  ],
  "note": "Kiểm kê hàng tháng 4/2026"
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "id": "move-adjust-001",
    "itemsAdjusted": 2
  }
}
```

---

### 2.4 GET `/api/inventory/report`
**Báo cáo nhập/xuất/tồn kho**

```bash
GET /api/inventory/report?warehouseId=wh-001&type=IN&startDate=2026-04-01&endDate=2026-04-30
Authorization: Bearer {token}
```

**Response:**
```json
{
  "totalMoves": 15,
  "inMoves": 5,
  "outMoves": 8,
  "adjustMoves": 2,
  "details": [
    {
      "id": "move-001",
      "type": "IN",
      "warehouseName": "Kho chính",
      "date": "2026-04-10T10:30:00Z",
      "items": [
        {
          "productName": "Khay mây",
          "sku": "KM-001-01",
          "qty": 50,
          "unitCost": 5000,
          "totalCost": 250000,
          "note": "Nhập từ nhà cung cấp A"
        }
      ],
      "note": "Đơn nhập hàng tháng"
    }
  ]
}
```

---

## 3. Cập nhật Schema Prisma (khuyến cáo)

Để hỗ trợ đầy đủ các chức năng trên, cần update schema:

### 3.1 Update `StockMove` model
```prisma
model StockMove {
  // ... existing fields
  
  // Thêm các field
  status        String        @default("DRAFT")    // DRAFT, CONFIRMED, CANCELLED
  reason        String?                             // Lý do: "bán hàng", "hỏng", "kiểm kê"
  refDocNumber  String?                             // Liên kết với báo giá, đơn giao hàng
  
  // ... existing relations
}
```

### 3.2 Update `StockMoveItem` model
```prisma
model StockMoveItem {
  // ... existing fields
  
  // Thêm field
  reason        String?       // Lý do chi tiết cho item này
  batchNumber   String?       // Mã lô/batch
  expiryDate    DateTime?     // Hạn sử dụng (nếu có)
  
  // ... existing relations
}
```

### 3.3 Update `Product` model
```prisma
model Product {
  // ... existing fields
  
  // Thêm field
  minStockLevel Float?        @default(10)  // Mức cảnh báo tồn kho
  reorderQty    Float?        @default(50)  // Số lượng đề xuất tái nhập
  
  // ... existing relations
}
```

---

## 4. Cập nhật Frontend (Mobile)

### 4.1 Thêm chức năng ADJUST (kiểm kê) vào Inventory

**File:** `app/inventory/adjust/index.tsx`

```typescript
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import * as api from "@/utils/api";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function InventoryAdjustScreen() {
  const { activeOrg } = useAuth();
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState([]); // SKU item được thêm vào
  const [loading, setLoading] = useState(false);

  const handleAddItem = () => {
    // Thêm dòng mới để nhập tồn kho kiểm kê
    setItems([...items, { variantId: "", currentQty: 0, reason: "" }]);
  };

  const handleSubmit = async () => {
    if (!warehouseId || items.length === 0) {
      return Alert.alert("Thiếu dữ liệu", "Chọn kho và thêm sản phẩm cần kiểm kê");
    }

    setLoading(true);
    try {
      await api.createAdjustment({
        warehouseId,
        items,
        note: `Kiểm kê ${new Date().toLocaleDateString("vi-VN")}`,
      });

      Alert.alert("Thành công", "Đã lưu phiếu kiểm kê");
      setItems([]);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 20 }}>
        📊 Kiểm kê tồn kho
      </Text>
      
      {/* UI xử lý chọn kho, thêm item, nhập số lượng */}
      
      <Pressable style={{ backgroundColor: "#4CAF50", padding: 12, borderRadius: 8 }}
        onPress={handleSubmit} disabled={loading}>
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
          {loading ? "Đang lưu..." : "Lưu phiếu kiểm kê"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
```

### 4.2 Thêm tab cảnh báo tồn kho

**File:** `app/inventory/index.tsx` - Thêm tab "LOW_STOCK"

```typescript
const [tab, setTab] = useState<TabKey>("BALANCE" | "IN" | "OUT" | "ADJUST" | "LOW_STOCK" | "HISTORY");

// Nếu tab === "LOW_STOCK", gọi API low-stock
if (tab === "LOW_STOCK") {
  const lowStocks = await api.getLowStockAlerts(warehouseId, 10);
  // Hiển thị danh sách cảnh báo với badge đỏ
}
```

### 4.3 Cập nhật logic nhập/xuất để lưu reason

**File:** `app/inventory/in/index.tsx` & `app/inventory/out/index.tsx`

```typescript
// Thêm input reason
const [reason, setReason] = useState("");

const submit = async () => {
  // ...
  await api.createStockMove({
    warehouseId,
    type: "OUT",
    items: [{
      variantId: selected.id,
      qty: qn,
      reason: reason || "xuất kho", // ✅ Thêm reason
    }],
  });
};
```

---

## 5. Thêm các utility function vào `utils/api.ts`

```typescript
// Kiểm kê
export async function createAdjustment(data: {
  warehouseId: string;
  items: Array<{ variantId: string; currentQty: number; reason?: string }>;
  note?: string;
}) {
  const res = await fetch("/api/inventory/adjust", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

// Cảnh báo tồn kho
export async function getLowStockAlerts(warehouseId?: string, minStock?: number) {
  const query = new URLSearchParams();
  if (warehouseId) query.append("warehouseId", warehouseId);
  if (minStock) query.append("minStock", minStock.toString());

  const res = await fetch(`/api/inventory/low-stock?${query}`, {
    headers: getHeaders(),
  });
  return res.json();
}

// Báo cáo
export async function getInventoryReport(filters: {
  warehouseId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([_, v]) => v) as any);
  const res = await fetch(`/api/inventory/report?${query}`, {
    headers: getHeaders(),
  });
  return res.json();
}

// Xác nhận phiếu
export async function confirmStockMove(moveId: string) {
  const res = await fetch("/api/inventory/move-confirm", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ moveId }),
  });
  return res.json();
}
```

---

## 6. Tóm tắt nâng cấp logic Backend

### Hiện tại (Basic)
- [x] Nhập/xuất cơ bản
- [x] Cập nhật tồn kho
- [x] Kiểm tra không âm

### Nâng cấp (Enhanced)
- [x] API kiểm kê (ADJUST)
- [x] API cảnh báo tồn kho
- [x] API xác nhận phiếu
- [x] API báo cáo nhập/xuất/tồn
- [ ] Workflow phê duyệt (xử lý sau)
- [ ] Tích hợp với báo giá/giao hàng (xử lý sau)

---

## 7. Kiểm thử

### Test Nhập kho
```bash
curl -X POST http://localhost:3000/api/inventory/move \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": "wh-001",
    "type": "IN",
    "items": [{ "variantId": "var-001", "qty": 50, "unitCost": 5000 }]
  }'
```

### Test Xuất kho (không đủ hàng)
```bash
curl -X POST http://localhost:3000/api/inventory/move \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": "wh-001",
    "type": "OUT",
    "items": [{ "variantId": "var-001", "qty": 100 }]
  }'
# => Phải trả về lỗi "Not enough stock"
```

### Test Cảnh báo tồn kho
```bash
curl http://localhost:3000/api/inventory/low-stock?warehouseId=wh-001&minStock=10 \
  -H "Authorization: Bearer {token}"
```

---

## 8. Ghi chú

- Hiện tại `StockMove` chưa có field `status`, nên phiếu được coi là "confirm on create"
- Để triển khai workflow xác nhận (DRAFT → CONFIRMED), cần update schema
- `reason` field giúp theo dõi lý do xuất kho (bán, hỏng, kiểm kê, etc.)
- Báo cáo có thể xuất CSV/Excel ở lần nâng cấp tiếp theo
