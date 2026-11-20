# Assessment Report — Module: auth-home

- **Spec nguồn:** `specs/auth-home.spec.md`
- **Excel đầu vào:** `inputs/auth-home.testcases.xlsx`
- **Tổng Test Cases:** **29** (Auto: **26**, Manual: **3**)

## 1. Các phương án Blocker đã chốt

| Blocker | Hạng mục | Phương án đã chốt |
| --- | --- | --- |
| B1 | Môi trường chạy Playwright (BASE_URL) | Phương án A — Chạy local (http://localhost:5173 + API http://localhost:5294 + Docker Postgres) |
| B2 | Side-effect khóa tài khoản / dữ liệu bẩn DB | Phương án B — Tích hợp hook chạy scripts/reset-demo-data.ps1 trước khi chạy full suite (--reset-db) |
| B3 | Phụ thuộc bên ngoài (Email OTP, Google OAuth, AI Chatbot) | Phương án A — Auto luồng UI/Validation/Guard; các bước cần OTP email thật / Google OAuth / AI Chat gắn Automation=Manual |
| B4 | Lệch hành vi returnUrl trong LoginPage.tsx | Phương án B — HOME-009 khẳng định đúng Expected chuẩn (quay lại returnUrl sau login) để Playwright chủ động bắt FAIL lỗi thật |
| B5 | Chiến lược Locator (data-testid) | Phương án A — Giữ nguyên D:\Github\SmartRentalPlatform (không sửa code app); quản lý tập trung trong locators/*.locators.json |

## 2. Ma trận độ phủ (Coverage Matrix)

| Screen_ID | Total | Auto | Manual | Normal | Abnormal | Boundary | Security/Role | BugCheck |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| SCR-AUTH-01 | 11 | 10 | 1 | 4 | 4 | 0 | 3 | 0 |
| SCR-HOME-01 | 5 | 4 | 1 | 5 | 0 | 0 | 0 | 0 |
| SCR-AUTH-02 | 4 | 4 | 0 | 1 | 2 | 1 | 0 | 0 |
| SCR-AUTH-03 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 0 |
| SCR-AUTH-04 | 2 | 2 | 0 | 1 | 1 | 0 | 0 | 0 |
| SCR-HOME-02 | 5 | 5 | 0 | 3 | 0 | 1 | 0 | 1 |
| SCR-HOME-03 | 1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 |

## 3. Kết quả chạy gần nhất

- *Chưa có lần chạy Playwright nào trên dữ liệu này (chỉ mới kiểm kê thiết kế). Hãy chạy `npm run test:auth-home` khi hệ thống local đang bật.*

## 4. Findings, Bugs & Risks

| ID | Loại | Mức độ | Liên quan TC | Tóm tắt | Khuyến nghị |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | Bug | High | HOME-009 | LoginPage.finishLogin() bỏ qua query param returnUrl sau khi đăng nhập thành công, luôn redirect về /home (hoặc /admin). | Đọc searchParams.get("returnUrl") trong LoginPage.tsx và validate relative path nội bộ trước khi điều hướng. |
| RISK-001 | Risk | Medium | AUTH-012, AUTH-017 | RegisterForm.tsx và ForgotPasswordForm.tsx không có thuộc tính noValidate trên <form> trong khi dùng input type="email". | Thêm noValidate cho RegisterForm và ForgotPasswordForm nếu muốn thông báo lỗi tiếng Việt đồng bộ thay vì native browser tooltip. |
| RISK-002 | Risk | Medium | AUTH-007 | AuthService.LoginAsync khóa tài khoản sau 5 lần nhập sai mật khẩu liên tiếp. | Test sai mật khẩu bằng email không tồn tại (notfound.qa@example.com) và bật --reset-db khi chạy full suite. |
| REC-001 | Recommendation | Low | AUTH-016, AUTH-019, HOME-010 | 3 test case phụ thuộc Email OTP thật, Google Login và AI Chatbot rate-limit đang để Manual. | Phase 2 nếu cần tự động hóa OTP, bổ sung endpoint/helper đọc OTP trong môi trường Test hoặc query Postgres local. |
| REC-002 | Recommendation | Low | ALL | Repo chính hiện có 0 thuộc tính data-testid ở Frontend. | Khi sang Phase 2 sửa/thêm màn hình, quy chuẩn AI Gen Source gắn data-testid theo Screen_ID để locator bền vững tuyệt đối. |
