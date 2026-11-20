# Workflow — Step 3: Execute Tests, Collect Evidence & Build Assessment Sheet

## Điều kiện đầu vào
* File `inputs/<module>.testcases.xlsx` đã pass `npm run validate:xlsx`.
* Nếu chạy test live: ứng dụng chính (`SmartRentalPlatform` frontend + backend + PostgreSQL Docker) đang chạy tại `BASE_URL` / `API_URL` trong `.env`.

## Các bước thực hiện
1. Đọc `rules/04-evidence-assessment.rule.md`.
2. Chạy Playwright từ file Excel:
   * Có reset DB (chỉ định theo Blocker `B2=B`):
     `npm run test:excel -- --file inputs/<module>.testcases.xlsx --reset-db --module <module>`
   * Hoặc chạy nhanh không reset DB (hoặc lọc 1 case):
     `npm run test:excel -- --file inputs/<module>.testcases.xlsx --no-reset-db --tc <TC_ID>`
3. Kiểm tra output sau khi chạy:
   * Ảnh chụp từng step: `evidence/<runId>/<TC_ID>/step-01_*.png`, ...
   * File Excel Evidence nhúng ảnh: `evidence/<runId>/Evidence_<module>.xlsx`
   * HTML Report của Playwright: `npm run report`
4. Sinh/cập nhật Assessment Sheet:
   `npm run build:assessment -- --file inputs/<module>.testcases.xlsx --module <module>`
5. Mở và rà soát `assessments/<module>-assessment.xlsx` và `assessments/<module>-assessment.md` để chốt tỷ lệ coverage, kết quả PASS/FAIL/MANUAL và danh sách `Findings_And_Risks`.
