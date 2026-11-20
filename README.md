# SmartRentalPlatformWebTest

Repo kiểm thử E2E bằng **Playwright + Excel (`.xlsx`) + AI 3-Step Workflow** tách riêng cho nền tảng [`SmartRentalPlatform`](../SmartRentalPlatform).

---

## 1. Dành cho Tester: Chạy test từ file Excel `.xlsx`

### Bước 1: Cài đặt (chỉ làm 1 lần)
```powershell
npm install
npx playwright install chromium
```
Kiểm tra file `.env` (đã copy sẵn từ `.env.example`):
* `BASE_URL=http://localhost:5173`
* `API_URL=http://localhost:5294`
* `RESET_DB_SCRIPT=D:\Github\SmartRentalPlatform\scripts\reset-demo-data.ps1`

### Bước 2: Đảm bảo hệ thống SmartRentalPlatform đang chạy local
Ở repo `D:\Github\SmartRentalPlatform`:
1. Bật PostgreSQL Docker (`docker compose up -d`).
2. Chạy Backend (`dotnet run --project server/src/SmartRentalPlatform.Api/SmartRentalPlatform.Api.csproj`).
3. Chạy Frontend (`cd client && npm run dev`).

### Bước 3: Bỏ file `.xlsx` vào `inputs/` và chạy lệnh

* **Chạy đầy đủ module Pilot `Auth + Home Search` (có tự động reset DB sạch trước khi chạy):**
  ```powershell
  npm run test:auth-home
  ```
* **Chạy nhanh không reset DB:**
  ```powershell
  npm run test:auth-home:fast
  ```
* **Chạy một file Excel bất kỳ trong `inputs/`:**
  ```powershell
  npm run test:excel -- --file inputs/auth-home.testcases.xlsx --no-reset-db
  ```
* **Chạy lọc đúng 1 Test Case hoặc theo Tag, hoặc bật trình duyệt có giao diện (`--headed`):**
  ```powershell
  npm run test:excel -- --file inputs/auth-home.testcases.xlsx --no-reset-db --tc HOME-009 --headed
  npm run test:excel -- --file inputs/auth-home.testcases.xlsx --no-reset-db --tag smoke
  ```
* **Kiểm tra cú pháp & locator của file `.xlsx` trước khi chạy:**
  ```powershell
  npm run validate:xlsx
  ```

### Bước 4: Xem Evidence & Kết quả
Sau mỗi lần chạy (kể cả khi có test case FAIL), hệ thống tự sinh:
1. **Thư mục ảnh từng bước:** `evidence/<runId>/<TC_ID>/step-01_*.png`, ... (có highlight đỏ phần tử đang thao tác + ảnh `*_FAILED.png` nếu lỗi).
2. **File Excel Evidence nhúng ảnh sẵn:** `evidence/<runId>/Evidence_<module>.xlsx` (gồm 3 sheet `Summary`, `TestCases_Result`, `Step_Evidence` có ảnh nhúng trực tiếp từng bước để đối chiếu/báo cáo).
3. **Playwright HTML Report:** `npm run report`
4. **Bảng đánh giá tổng hợp:** `assessments/<module>-assessment.xlsx` và `assessments/<module>-assessment.md` (tự cập nhật sau khi chạy xong).

---

## 2. Dành cho Dev / QA: Quy trình 3 bước AI Workflow

Xem chi tiết trong [`AGENTS.md`](./AGENTS.md), [`rules/`](./rules) và [`workflows/`](./workflows):

1. **Step 1 — Input & Blocker Gate:** Đọc source thật bên `SmartRentalPlatform`, xuất `assessments/<module>-blockers.md` và **dừng chờ bạn chọn phương án**.
2. **Step 2 — Generate Spec, Locators & Excel:** Sinh `specs/<module>.spec.md`, `locators/*.locators.json`, `inputs/<module>.testcases.xlsx` và chạy `npm run validate:xlsx`.
3. **Step 3 — Run & Assessment Sheet:** Chạy Playwright, thu thập `Evidence_<module>.xlsx` và cập nhật `assessments/<module>-assessment.xlsx`.

---

## 3. Tự kiểm tra nội bộ Engine không cần bật App thật

```powershell
npm run typecheck
npm run test:self
```
`npm run test:self` bật một mock HTTP server cục bộ để kiểm chứng toàn bộ luồng đọc `.xlsx` → chạy Playwright → chụp ảnh từng step → nhúng ảnh vào `Evidence_*.xlsx` → xử lý đúng cả PASS, FAIL và MANUAL.
