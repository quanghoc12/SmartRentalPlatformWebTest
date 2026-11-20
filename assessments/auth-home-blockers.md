# Step 1 — Blocker Analysis Report: `auth-home`

- **Module:** `Auth + Home Search`
- **Target Repo:** `D:\Github\SmartRentalPlatform`
- **Ngày phân tích:** 2026-11-21
- **Trạng thái:** Đã chốt toàn bộ phương án bởi người dùng.

---

## Danh sách Blocker & Phương án đã chốt

### `B1` — Môi trường chạy Playwright (`BASE_URL`)
* **Bằng chứng từ code:** `client/.env.example` dùng `VITE_API_BASE_URL=http://localhost:5294`, `client/package.json` chạy Vite tại `http://localhost:5173`.
* **Phương án A (Đã chọn):** Chạy trên môi trường **Local** (`BASE_URL=http://localhost:5173`, `API_URL=http://localhost:5294`, PostgreSQL Docker).
* **Phương án B:** Chạy lên URL deploy (Vercel/Production).

### `B2` — Side-effect khóa tài khoản khi sai mật khẩu & dữ liệu bẩn DB
* **Bằng chứng từ code:** `server/tests/TESTING_SCENARIOS.md` dòng 30 ghi rõ `AuthService.LoginAsync` khóa tài khoản nếu nhập sai mật khẩu 5 lần; repo chính có sẵn `scripts/reset-demo-data.ps1` + `database/smart_rental_demo_snapshot.dump`.
* **Phương án A:** Không reset DB tự động, chỉ tránh nhập sai vào tài khoản demo thật.
* **Phương án B (Đã chọn):** Tích hợp hook tự chạy `D:\Github\SmartRentalPlatform\scripts\reset-demo-data.ps1` trước khi chạy full suite (`--reset-db`), đồng thời dùng email không tồn tại (`notfound.qa@example.com`) cho case kiểm tra sai credential để an toàn khi chạy `--no-reset-db`.

### `B3` — Phụ thuộc dịch vụ bên ngoài (Email OTP, Google Login, AI Chatbot)
* **Bằng chứng từ code:** `AuthController.cs` có `verify-email-otp`, `google-login`, `forgot-password`, `reset-password`; `PublicRoomingHousesController.cs` gắn `[EnableRateLimiting("AiChat")]` trên `ai-chat`.
* **Phương án A (Đã chọn):** Tự động hóa (`Auto`) toàn bộ validation form, đăng ký chuyển tới `/verify-email`, quên mật khẩu chuyển tới `/reset-password`, login/logout/role guard, tìm kiếm/lọc/sắp xếp/chọn khu vực/guest guard. Gắn `Automation = Manual` cho các case đọc OTP email thật, Google OAuth và AI Chatbot trong Excel.
* **Phương án B:** Query trực tiếp OTP từ PostgreSQL local để auto cả bước nhập OTP.

### `B4` — Lệch hành vi `returnUrl` trong `LoginPage.tsx`
* **Bằng chứng từ code:**
  * `FavoriteButton.tsx` (dòng 25-29) chuyển Guest sang `/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`.
  * `LoginPage.tsx` (`finishLogin`, dòng 21-41) chỉ điều hướng thẳng về `ROUTE_PATHS.ADMIN.ROOT` (`/admin`) hoặc `ROUTE_PATHS.ME.ROOT` (`/home`), **hoàn toàn bỏ qua `returnUrl`**.
* **Phương án A:** Ghi nhận bug trong tài liệu nhưng tạm viết test theo code hiện tại.
* **Phương án B (Đã chọn):** Giữ nguyên Expected chuẩn trong Excel (`HOME-009`, Category `BugCheck`) là **sau khi đăng nhập phải quay lại trang `returnUrl`** để Playwright chủ động bắt FAIL lỗi này kèm ảnh Evidence và log `BUG-001` vào Assessment Sheet.

### `B5` — Chiến lược Locator (`data-testid` bên repo chính)
* **Bằng chứng từ code:** Toàn bộ `client/src/**/*.tsx` hiện có `0` thuộc tính `data-testid`; tuy nhiên nhiều input quan trọng đã có `id` (`#login-email`, `#register-email`, `#occupants-select`, `#sort-select`), `aria-label` (`Tìm kiếm khu trọ`, `Giá tối thiểu`...), `role` và class ổn định.
* **Phương án A (Đã chọn):** **Không sửa bất kỳ file nào trong `D:\Github\SmartRentalPlatform`**. Quản lý tập trung toàn bộ selector trong `locators/*.locators.json`.
* **Phương án B:** Sửa repo chính để bổ sung `data-testid`.
