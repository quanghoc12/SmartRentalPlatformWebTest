# Workflow — Step 1: Analyze Code & Identify Blockers

## Mục tiêu
Chạy vai trò **AI 1 (Input Gatekeeper)**: đọc source code thật của module mục tiêu ở `TARGET_REPO_PATH`, lọc nhiễu và liệt kê mọi Blocker để người dùng quyết định phương án trước khi sinh test.

## Các bước thực hiện
1. Đọc `rules/01-input-blocker.rule.md`.
2. Quét trong `TARGET_REPO_PATH` (`D:\Github\SmartRentalPlatform`):
   * `client/src/app/router/routePaths.ts` & `routes.tsx` để lấy danh sách route và guard.
   * Tất cả page, form, component, API client thuộc module cần test.
   * Controller/DTO tương ứng ở `server/src/SmartRentalPlatform.Api/Controllers/...`.
   * Các tài liệu liên quan ở `docs/` và `server/tests/TESTING_SCENARIOS.md`.
3. Kiểm tra thực tế code xem có:
   * Màn hình/trạng thái phụ thuộc DB state (`Occupied`, `Locked`, `Pending`...).
   * Dịch vụ ngoài (Email OTP, OAuth, Payment, S3, AI rate limit).
   * Sai khác giữa UI/UX mong đợi và code hiện tại (VD: mất `returnUrl`, thiếu `noValidate`...).
   * Thiếu `data-testid` ở các control động/lặp.
4. Viết báo cáo `assessments/<module>-blockers.md` theo đúng format `B1, B2, ...` kèm Phương án A/B và khuyến nghị.
5. **Dừng lại và hỏi người dùng chốt từng phương án.** Không đi tiếp sang Step 2 khi chưa có câu trả lời.
