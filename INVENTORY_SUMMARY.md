# 📊 Tóm tắt Bổ sung Chức năng Nhập/Xuất/Tồn kho

## Tình hình hiện tại (Trước bổ sung)

### ✅ Đã có
```
Frontend (Mobile):
├── inventory/index.tsx     → Tabs BALANCE, IN, OUT, HISTORY
├── inventory/in/index.tsx  → Nhập kho (IN)
└── inventory/out/index.tsx → Xuất kho (OUT)

Backend API:
├── POST /api/inventory/move          → Tạo phiếu nhập/xuất
├── GET /api/inventory/balance        → Xem tồn kho
├── GET /api/inventory/skus           → Tìm kiếm SKU
└── GET /api/inventory/move           → Lịch sử
```

### ❌ Thiếu
- Kiểm kê tồn kho (ADJUST)
- Cảnh báo tồn kho tối thiểu
- Xác nhận phiếu (workflow status)
- Báo cáo nhập/xuất/tồn
- Lý do xuất kho

---

## Bổ sung sau (Hoàn thiện)

### ✅ Backend API mới (4 endpoints)

#### 1️⃣ **POST /api/inventory/adjust** - Kiểm kê
```
Purpose: Tạo phiếu kiểm kê (điều chỉnh tồn kho)
Input: warehouseId, items[{variantId, currentQty, reason}]
Logic:
  - So sánh số lượng thực tế (currentQty) vs tồn kho hiện tại
  - Tính delta tự động
  - Update StockBalance
Output: Phiếu ADJUST mới với số lượng items được điều chỉnh
```

#### 2️⃣ **GET /api/inventory/low-stock** - Cảnh báo
```
Purpose: Lấy danh sách sản phẩm tồn kho dưới mức tối thiểu
Input: warehouseId, minStock (default=10)
Logic:
  - Lọc sản phẩm qty <= minStock
  - Sắp xếp theo qty tăng dần
Output: Danh sách cảnh báo với product/variant info
```

#### 3️⃣ **POST /api/inventory/move-confirm** - Xác nhận phiếu
```
Purpose: Xác nhận phiếu nhập/xuất (workflow DRAFT → CONFIRMED)
Input: moveId
Logic:
  - Nếu OUT: re-check tồn kho (tránh race condition)
  - Update status = CONFIRMED
Output: Phiếu đã xác nhận
```

#### 4️⃣ **GET /api/inventory/report** - Báo cáo
```
Purpose: Báo cáo nhập/xuất/tồn kho theo tiêu chí
Input: warehouseId, type (IN/OUT/ADJUST), startDate, endDate
Logic:
  - Lấy tất cả phiếu phù hợp
  - Tính tổng hợp (IN count, OUT count, ADJUST count)
  - Liệt kê chi tiết items với cost
Output: Summary + detail list
```

### 📋 File mới

| File | Mô tả |
|------|-------|
| `/api/inventory/move-confirm/route.ts` | Xác nhận phiếu |
| `/api/inventory/low-stock/route.ts` | Cảnh báo tồn kho |
| `/api/inventory/adjust/route.ts` | Kiểm kê (ADJUST) |
| `/api/inventory/report/route.ts` | Báo cáo |
| `/INVENTORY_ENHANCEMENT.md` | Doc chi tiết |

---

## Thay đổi Backend Code

### 1. Type definitions (move/route.ts)
```diff
+ type MoveStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";
+ reason?: string; // lý do xuất: "bán hàng", "hỏng", "kiểm kê"
```

### 2. Logic xử lý Stock Validation
```
POST /api/inventory/move → type "OUT"
  ✓ Check: ENFORCE_NO_NEGATIVE = true
  ✓ Load balances
  ✓ Reject nếu after < 0
  ✓ Update cost price nếu IN
  ✓ Auto-upsert StockBalance
```

### 3. Schema cần cập nhật (khuyến cáo)
```prisma
model StockMove {
  status        String  @default("DRAFT")      // DRAFT, CONFIRMED, CANCELLED
  reason        String?                         // Lý do
  refDocNumber  String?                         // Liên kết
}

model StockMoveItem {
  reason        String?  // Chi tiết lý do
  batchNumber   String?  // Mã lô (nếu cần)
  expiryDate    DateTime? // Hạn sử dụng
}

model Product {
  minStockLevel Float? @default(10)   // Mức cảnh báo
  reorderQty    Float? @default(50)   // Số lượng tái nhập
}
```

---

## Utility Functions mới (frontend/utils/api.ts)

```typescript
// Kiểm kê
export async function createAdjustment(data: {...}) {}

// Cảnh báo
export async function getLowStockAlerts(warehouseId?: string) {}

// Báo cáo
export async function getInventoryReport(filters: {...}) {}

// Xác nhận
export async function confirmStockMove(moveId: string) {}
```

---

## Frontend Bổ sung (khuyến cáo)

### Tabs mới cần thêm vào `inventory/index.tsx`
```
BALANCE  (hiện tại) → Xem tồn kho
IN       (hiện tại) → Nhập kho
OUT      (hiện tại) → Xuất kho
ADJUST   (MỚI)     → Kiểm kê
LOW_STOCK(MỚI)     → Cảnh báo tồn kho
HISTORY  (hiện tại) → Lịch sử
```

### Screen mới cần tạo
```
app/inventory/adjust/index.tsx
  ├─ Chọn kho
  ├─ Thêm sản phẩm (quét/tìm kiếm)
  ├─ Nhập số lượng thực tế
  └─ Lưu phiếu → Call API /api/inventory/adjust

app/inventory/low-stock/index.tsx
  ├─ Lọc theo kho
  ├─ Hiển thị cảnh báo (badge đỏ)
  └─ Xem chi tiết → Có thể tạo đơn tái nhập
```

---

## Kiểm thử (Testing Checklist)

### ✅ Backend (API)

**Test 1: Nhập kho**
```bash
POST /api/inventory/move
{
  "warehouseId": "wh-001",
  "type": "IN",
  "items": [{"variantId": "var-001", "qty": 50, "unitCost": 5000}]
}
Expected: StockBalance created/updated với qty=50
```

**Test 2: Xuất kho không đủ hàng**
```bash
POST /api/inventory/move
{
  "warehouseId": "wh-001",
  "type": "OUT",
  "items": [{"variantId": "var-001", "qty": 100}]
}
Expected: Error "Not enough stock"
```

**Test 3: Kiểm kê**
```bash
POST /api/inventory/adjust
{
  "warehouseId": "wh-001",
  "items": [{"variantId": "var-001", "currentQty": 45, "reason": "kiểm kê"}]
}
Expected: StockBalance updated qty=45 (chênh lệch -5), tạo move ADJUST
```

**Test 4: Cảnh báo**
```bash
GET /api/inventory/low-stock?warehouseId=wh-001&minStock=10
Expected: Danh sách items qty <= 10
```

**Test 5: Báo cáo**
```bash
GET /api/inventory/report?warehouseId=wh-001&type=IN&startDate=2026-04-01
Expected: Summary + list phiếu IN trong tháng 4
```

---

## Kế hoạch triển khai (TODO)

### Phase 1: Backend (DONE)
- [x] Tạo 4 API endpoint
- [x] Update type definitions
- [x] Thêm logic validation & calculation
- [x] Viết documentation

### Phase 2: Cập nhật Schema (TODO)
- [ ] Add `status`, `reason` fields vào StockMove
- [ ] Add `minStockLevel`, `reorderQty` fields vào Product
- [ ] Chạy Prisma migration

### Phase 3: Frontend (TODO)
- [ ] Tạo màn hình ADJUST
- [ ] Tạo tab/screen LOW_STOCK
- [ ] Update inventory/index.tsx tabs
- [ ] Tích hợp 4 API mới vào utils/api.ts
- [ ] Test UI/UX

### Phase 4: E2E Testing (TODO)
- [ ] Test flow Nhập → Xuất → Kiểm kê
- [ ] Test cảnh báo tồn kho
- [ ] Test báo cáo
- [ ] Test trên thiết bị thực

---

## Mục tiêu sau triển khai

✅ **Nhập/Xuất/Tồn kho đầy đủ:**
- Nhập kho tự động cập nhật costPriceVnd
- Xuất kho kiểm tra tồn kho (không âm)
- Kiểm kê tự động tính chênh lệch
- Cảnh báo sản phẩm cạn hàng
- Báo cáo chi tiết nhập/xuất/tồn

✅ **Multi-warehouse support:**
- Chọn kho trước khi thao tác
- Tồn kho tính riêng theo kho
- Báo cáo có thể lọc theo kho

✅ **Audit trail:**
- Lấy lịch sử tất cả thao tác
- Biết ai, khi nào, tại sao
- Hỗ trợ kiểm toán

---

## Ghi chú

- Hiện tại chưa có workflow approval phức tạp, phiếu được tạo = "confirm on create"
- Nếu muốn DRAFT → CONFIRMED flow, cần add `status` field vào schema
- `reason` field giúp phân loại lý do xuất: bán hàng, hỏng, kiểm kê, etc.
- Export PDF/Excel báo cáo làm sau (sử dụng library như jsPDF, xlsx)
- Integration với báo giá/giao hàng làm sau (auto-deduct when confirm delivery)
