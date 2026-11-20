# Spec — Module `Auth + Home Search` (AI 1 Clean Spec)

- **Nguồn trích xuất:** `D:\Github\SmartRentalPlatform` (`client/src/features/auth/`, `client/src/features/home/`, `client/src/features/rooming-houses/`, `client/src/shared/components/layout/HomeHeader.tsx`, `server/src/SmartRentalPlatform.Api/Controllers/Auth/`, `Public/`)
- **Quyết định Blocker áp dụng:** `B1=A`, `B2=B`, `B3=A`, `B4=B`, `B5=A`

---

## 1. Danh sách Màn hình (`Screen_ID`)

| Screen_ID | Route | Vai trò được phép | File nguồn chính |
| --- | --- | --- | --- |
| `SCR-AUTH-01` | `/login` | Guest | `LoginPage.tsx`, `LoginForm.tsx` |
| `SCR-AUTH-02` | `/register` | Guest | `RegisterPage.tsx`, `RegisterForm.tsx` |
| `SCR-AUTH-03` | `/verify-email` | Guest / User chưa verify | `VerifyEmailOtpPage.tsx`, `OtpForm.tsx` |
| `SCR-AUTH-04` | `/forgot-password`, `/reset-password` | Guest | `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` |
| `SCR-HOME-01` | `/`, `/home` | Guest, Tenant, Landlord, Admin | `MePage.tsx`, `HomeHeader.tsx` |
| `SCR-HOME-02` | `/search` | Guest, Tenant, Landlord, Admin | `SearchRoomingHousesPage.tsx`, `LocationFilterPanel.tsx` |
| `SCR-HOME-03` | `/rooming-houses/:id` | Guest, Tenant, Landlord, Admin | `PublicRoomingHouseDetailPage.tsx` |

---

## 2. Đặc tả Validation & Business Rules từ code thật

### `SCR-AUTH-01` — Đăng nhập (`/login`)
* Form có `noValidate`: mọi validation do React xử lý và hiển thị dưới `.form-field-error`.
* **Email:**
  * Trống → `"Vui lòng nhập email."`
  * Không khớp `/^\S+@\S+\.\S+$/` → `"Email không hợp lệ."`
* **Password:**
  * Trống → `"Vui lòng nhập mật khẩu."`
  * Nút toggle `.auth-password-toggle` đổi `type` giữa `password` và `text`, `aria-label` đổi giữa `"Hiện mật khẩu"` và `"Ẩn mật khẩu"`.
* **Điều hướng sau Login (`LoginPage.finishLogin`):**
  * Nếu `roles` chứa `'Admin'` → `/admin`.
  * Nếu `emailConfirmed === true` → `/home`.
  * Nếu `emailConfirmed === false` → `/verify-email`.
  * Nếu API trả lỗi xác thực email (`"Vui lòng xác thực email trước khi đăng nhập."`) → `/verify-email?email=...`.
  * **Lỗi đã xác định (`BUG-001`):** Không xử lý query `?returnUrl=...` sau khi đăng nhập.
* **Logout (`HomeHeader.tsx`):** Mở menu avatar (`button.avatar-btn`) → bấm `Đăng xuất` (`button.dropdown-item--danger`) xóa session và quay lại trạng thái Guest (hiển thị nút `Đăng nhập` / `Đăng ký`).

### `SCR-AUTH-02` — Đăng ký (`/register`)
* Form **KHÔNG có `noValidate`**, input email dùng `type="email"` → email không chứa `@` sẽ bị trình duyệt chặn submit bằng HTML5 validation; email có `@` nhưng thiếu TLD (VD `a@b`) hoặc trigger `onBlur` sẽ hiện lỗi React `.form-field-error`.
* **Rules trong `RegisterForm.tsx`:**
  * Email: trống → `"Vui lòng nhập email."`; sai regex `/^\S+@\S+\.\S+$/` → `"Email không hợp lệ."`
  * Mật khẩu: `< 8` ký tự → `"Mật khẩu phải chứa ít nhất 8 ký tự."`; thiếu chữ hoa → `"...1 chữ viết hoa."`; thiếu chữ thường → `"...1 chữ viết thường."`; thiếu số → `"...1 chữ số."`; thiếu ký tự đặc biệt `[!@#$%^&*(),.?":{}|<>]` → `"...1 ký tự đặc biệt (ví dụ: !@#$%^&*)."`.
  * Nhập lại mật khẩu: không khớp → `"Mật khẩu nhập lại không khớp."`
  * Tên hiển thị: trống → `"Vui lòng nhập tên hiển thị."`
  * Số điện thoại: trống → `"Vui lòng nhập số điện thoại."`; sai regex `/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/` → `"Số điện thoại không đúng định dạng Việt Nam (ví dụ: 03..., 09...)."`
* **Submit thành công:** gọi `POST /api/auth/register` → điều hướng sang `/verify-email?email=...`.
* **Email đã tồn tại:** `POST /api/auth/register` trả `409 Conflict` → hiện `.alert.alert-error`.

### `SCR-AUTH-04` — Quên mật khẩu (`/forgot-password`)
* Form **KHÔNG có `noValidate`**, dùng `#forgot-password-email`.
* Email hợp lệ → gọi `POST /api/auth/forgot-password` → điều hướng tới `/reset-password?email=...`.

### `SCR-HOME-01` — Trang chủ (`/home`, `/` redirect về `/home`)
* Route `/` tự động redirect về `/home`.
* Hiển thị danh sách `article.home-listing-card` (cùng phân nhóm và thanh tìm kiếm `SearchSuggestionBox`).
* Focus ô tìm kiếm (`input[aria-label="Tìm kiếm khu trọ"]`) mở dropdown `.search-suggestion-box__dropdown` hiển thị gợi ý.
* Nhập từ khóa + bấm `button.search-submit-btn` → chuyển tới `/search?q=...`.
* Bấm `button.home-location-button` → mở dialog `[role="dialog"][aria-label="Tùy chọn vị trí tìm kiếm"]`; chọn tỉnh nhanh (VD `Đà Nẵng`) → `Áp dụng` → chuyển tới `/search?provinceCode=...`.
* Bấm nút tim `.favorite-button` khi là **Guest** → chuyển tới `/login?returnUrl=...` (chặn thao tác yêu thích).
* Bấm vào card `article.home-listing-card` → mở trang chi tiết `/rooming-houses/:id`.

### `SCR-HOME-02` — Tìm kiếm & Bộ lọc nâng cao (`/search`)
* URL nhận query params: `q`, `provinceCode`, `wardCode`, `minPrice`, `maxPrice`, `minAreaM2`, `maxAreaM2`, `minOccupants`, `sortBy`, `page`.
* Sidebar bộ lọc mở panel từng nhóm:
  * Giá thuê (`button.filter-toggle:has-text("Giá thuê")`): nhập `Giá tối thiểu` / `Giá tối đa`, bấm `Lưu` (`button.btn-save-filter`) cập nhật URL (`minPrice`, `maxPrice`) và gọi API tìm kiếm.
  * Diện tích (`button.filter-toggle:has-text("Diện tích")`): nhập `Diện tích tối thiểu` / `Diện tích tối đa`, bấm `Lưu`.
  * Số người ở (`button.filter-toggle:has-text("Số người ở")`): chọn `#occupants-select`, bấm `Lưu`.
* Sắp xếp `#sort-select`: chọn `priceAsc`, `newest`, `priceDesc`... cập nhật URL `sortBy=...`.
* Nút `Xóa tất cả` (`button.search-clear-btn`) reset toàn bộ bộ lọc và query URL.
* Khi không có kết quả khớp (VD `q` ngẫu nhiên vô nghĩa) → hiển thị `.search-page__state` chứa `"Không tìm thấy khu trọ nào phù hợp với bộ lọc của bạn."`.
* Khi là **Tenant đã đăng nhập** bấm `.favorite-button` → KHÔNG redirect về `/login`, cập nhật trạng thái nút tim (`favorite-button--active` hoặc thông báo/trạng thái đã lưu).
