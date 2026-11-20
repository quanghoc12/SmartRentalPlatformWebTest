# AGENTS.md — AI-Assisted Playwright QA Operating System

Repository này vận hành theo mô hình **2 pha chuẩn dự án Nhật**:
1. **Pha 1 — AI Authoring (3 bước có cổng kiểm duyệt con người):** AI đọc source code hệ thống chính (`TARGET_REPO_PATH`, mặc định `D:\Github\SmartRentalPlatform`), phân tích Blocker, chuẩn hóa Spec, sinh file `.xlsx` Test Cases + Locator Map và xuất Assessment Sheet.
2. **Pha 2 — Deterministic Execution & Evidence (Thuần TypeScript + Playwright + ExcelJS):** Tester bỏ file `.xlsx` vào `inputs/`, chạy 1 lệnh terminal để tự động chạy Playwright, chụp ảnh từng step (kèm highlight element), xuất `Evidence_<module>.xlsx` nhúng ảnh và cập nhật `assessments/<module>-assessment.xlsx`.

---

## Quy trình 3 bước bắt buộc cho mọi Module

> **NGUYÊN TẮC BẤT DI BẤT DỊCH:** Không bao giờ nhảy cóc sang bước sau nếu chưa hoàn tất cổng kiểm duyệt của bước trước.

### Step 1 — Analyze & Blocker Check (AI 1: Input Gatekeeper)
* **Mục tiêu:** Đọc source thực tế ở `TARGET_REPO_PATH` (router, pages, components, DTO, controllers, docs), đối chiếu với thực tế code để phát hiện mọi điểm mơ hồ, lệch spec, rủi ro side-effect DB, phụ thuộc 3rd-party và chiến lược locator.
* **Rule bắt buộc:** `rules/01-input-blocker.rule.md`
* **Playbook:** `workflows/step1-analyze-blockers.md`
* **Output:** `assessments/<module>-blockers.md`
* **Cổng dừng (Human Gate):** Trình bày rõ từng Blocker (`B1, B2, ...`) kèm phương án A/B và khuyến nghị. **DỪNG LẠI** chờ người dùng chọn phương án.

### Step 2 — Generate Spec, Locator Map & Test Cases Excel (AI 2 + AI 3 Prep)
* **Mục tiêu:** Dựa trên lựa chọn Blocker đã chốt ở Step 1:
  1. Tạo `specs/<module>.spec.md` (Single Source of Truth cho màn hình, route, role, validation, API, edge cases).
  2. Tạo/cập nhật `locators/<domain>.locators.json` bằng selector thật đã kiểm chứng từ source React.
  3. Viết builder TypeScript và chạy sinh `inputs/<module>.testcases.xlsx` theo đúng schema `rules/02-testcase-excel.rule.md`.
  4. Chạy `npm run validate:xlsx -- --file inputs/<module>.testcases.xlsx` kiểm tra 0 lỗi schema và 0 locator thiếu.
* **Rule bắt buộc:** `rules/02-testcase-excel.rule.md`, `rules/03-locator-playwright.rule.md`
* **Playbook:** `workflows/step2-generate-assets.md`

### Step 3 — Execute, Collect Evidence & Build Assessment Sheet
* **Mục tiêu:**
  1. Chạy Playwright theo file Excel: `npm run test:excel -- --file inputs/<module>.testcases.xlsx` (kèm `--reset-db` nếu module cần DB sạch).
  2. Thu thập ảnh chụp từng step trong `evidence/<runId>/<TC_ID>/` và `evidence/<runId>/Evidence_<module>.xlsx`.
  3. Sinh bảng đánh giá `assessments/<module>-assessment.xlsx` (4 sheet) và `assessments/<module>-assessment.md` ghi rõ Coverage, Pass/Fail/Manual, Findings & Risks.
* **Rule bắt buộc:** `rules/04-evidence-assessment.rule.md`
* **Playbook:** `workflows/step3-assessment-sheet.md`

---

## Câu lệnh mẫu để gọi AI làm module mới

Bạn có thể copy y nguyên 3 câu lệnh này khi mở rộng sang các module khác (`kyc`, `rental-requests`, `billing`, `contracts`, `admin`):

1. **Bước 1:**
   > `Chạy Step 1 theo AGENTS.md và workflows/step1-analyze-blockers.md cho module <ten-module>. Đọc code thật bên D:\Github\SmartRentalPlatform và xuất danh sách Blocker để tôi chọn phương án.`
2. **Bước 2:**
   > `Chốt phương án Blocker: B1=..., B2=... Chạy Step 2 theo workflows/step2-generate-assets.md cho module <ten-module>, sinh spec, locators, file Excel và validate.`
3. **Bước 3:**
   > `Chạy Step 3 theo workflows/step3-assessment-sheet.md cho module <ten-module>, chạy test (hoặc kiểm tra báo cáo) và xuất Assessment Sheet.`

---

## Cấu trúc thư mục

* `rules/` — Bộ luật chặt chẽ cho từng pha.
* `workflows/` — Kịch bản thao tác chi tiết Step 1 → Step 2 → Step 3.
* `specs/` — Tài liệu đặc tả sạch đã lọc (output AI 1).
* `locators/` — Bản đồ ánh xạ Element Key → Playwright Locator thật.
* `inputs/` — File `.xlsx` test case đầu vào cho Playwright Runner.
* `src/` — Mã nguồn TypeScript của Excel Parser/Writer, Action Engine, Assessment Generator, CLI.
* `tests/` — Spec Playwright đọc động từ `.xlsx`.
* `assessments/` — Báo cáo Blocker (`*-blockers.md`) và Bảng đánh giá (`*-assessment.xlsx`, `*-assessment.md`).
* `evidence/` — Ảnh chụp từng bước theo từng lần chạy + `Evidence_<module>.xlsx` (gitignored).

---

## Ràng buộc kỹ thuật bắt buộc (Strict Guardrails)

1. **Không sửa repo ứng dụng chính (`D:\Github\SmartRentalPlatform`)** trừ khi Blocker `B5` của module được người dùng duyệt sang phương án cho phép thêm `data-testid`.
2. **Không tự bịa CSS selector, ID, text tiếng Việt hay route.** Mọi locator phải đối chiếu đúng dòng code trong `client/src/...`.
3. **Không dùng `waitForTimeout` hay sleep cứng** trong Runner/Action; luôn dùng Playwright web-first assertions (`expect(locator)...`, `expect(page)...`).
4. **Không chỉnh sửa file `.xlsx` nhị phân trực tiếp bằng tay ở pha AI Authoring:** Luôn sinh bằng script `exceljs` và chạy `npm run validate:xlsx` trước khi bàn giao cho Tester.
5. **Tách biệt rõ `Auto` và `Manual`:** Các case phụ thuộc dịch vụ ngoài không thể tự động hóa an toàn (Email OTP thật, Google OAuth thật, LLM rate-limited) phải có mặt trong Excel với `Automation = Manual` để Tester kiểm soát 100% độ phủ.
