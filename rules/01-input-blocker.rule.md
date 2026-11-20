# Rule 01 — Input Analysis & Blocker Gatekeeper (AI 1)

## 1. Mục tiêu
Trước khi sinh Test Case hay code Playwright cho bất kỳ module nào, AI 1 **bắt buộc** phải đọc source code thực tế ở `TARGET_REPO_PATH` (`D:\Github\SmartRentalPlatform`) để chuẩn hóa đầu vào và chặn sớm các điểm mơ hồ/rủi ro.

## 2. Nguồn dữ liệu bắt buộc phải đọc
Đối với một module `<module>`, AI 1 phải kiểm tra tối thiểu:
1. **Routing & Guards:** `client/src/app/router/routePaths.ts`, `routes.tsx`, `ProtectedRoute.tsx`, `RoleGuard.tsx`, `OnboardingGuard.tsx`.
2. **Frontend Pages & Components:** Toàn bộ page, form, component liên quan trong `client/src/features/<feature>/` và shared UI (`Alert.tsx`, `FormField.tsx`, `HomeHeader.tsx`...).
3. **Validation & Business Rules trong code:** Kiểm tra kỹ các điều kiện regex, min/max, `noValidate`, thông báo lỗi tiếng Việt chính xác từng ký tự, điều hướng sau submit.
4. **Backend API & Controllers:** `server/src/SmartRentalPlatform.Api/Controllers/...` và `Contracts/...` (DTO request/response, status code, rate limiting).
5. **Tài liệu hiện có:** `docs/DemoShowcaseScenario.md`, `server/tests/TESTING_SCENARIOS.md`, `docs/interval-plan/...`.

## 3. Phân loại Blocker bắt buộc
Mọi vấn đề phát hiện được phân thành 5 nhóm chuẩn:
1. **Environment (`B1`):** Chạy local hay staging/prod, port FE/API, biến môi trường cần thiết.
2. **DB & State Side-Effects (`B2`):** Tài khoản có bị khóa khi sai mật khẩu (lockout), dữ liệu bị biến đổi khi tạo/xóa/hủy/thanh toán, có cần reset DB (`reset-demo-data.ps1`) trước khi chạy hay không.
3. **3rd-Party & External Dependencies (`B3`):** Email OTP, Google OAuth, VNPT eKYC, PayOS/VNPay, S3 upload, AI Chatbot rate limit — quyết định phần nào `Auto`, phần nào đánh dấu `Manual` hoặc mock/query DB.
4. **Spec vs. Code Discrepancies (`B4`):** Các chỗ code chạy khác với kỳ vọng nghiệp vụ hoặc UX chuẩn (ví dụ: có truyền `returnUrl` nhưng trang login bỏ qua không redirect về). Quyết định viết test `BugCheck` để bắt FAIL hay ghi nhận riêng và test theo hiện trạng.
5. **Locator Strategy (`B5`):** Repo chính có `data-testid` chưa, có được phép sửa repo chính để gắn `data-testid` hay giữ nguyên repo chính và map locator ngoài.

## 4. Định dạng Output (`assessments/<module>-blockers.md`)
Mỗi Blocker phải trình bày đủ:
* Mã Blocker (`B1`, `B2`, ...) và Nhóm
* Mô tả bằng chứng cụ thể từ file code thật (kèm tên file/hành vi thực tế)
* **Phương án A** (kèm ưu/nhược điểm)
* **Phương án B** (kèm ưu/nhược điểm)
* **Khuyến nghị**

## 5. Cổng dừng (Mandatory Stop Gate)
* **CẤM** viết `specs/<module>.spec.md`, **CẤM** tạo `inputs/<module>.testcases.xlsx`, **CẤM** tạo `locators/*.json` cho tới khi người dùng phản hồi lựa chọn cho từng Blocker.
