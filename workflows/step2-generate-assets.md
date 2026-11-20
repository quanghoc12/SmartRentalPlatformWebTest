# Workflow — Step 2: Generate Spec, Locators & Excel Test Cases

## Điều kiện đầu vào
* Đã có `assessments/<module>-blockers.md`.
* Người dùng đã xác nhận lựa chọn cho tất cả Blocker.

## Các bước thực hiện
1. Đọc `rules/02-testcase-excel.rule.md` và `rules/03-locator-playwright.rule.md`.
2. Tạo `specs/<module>.spec.md`:
   * Ghi rõ các quyết định Blocker đã chốt.
   * Liệt kê từng `Screen_ID`, route, role truy cập, danh sách element, validation rules, API liên quan, và danh sách `Known Bugs / Risks`.
3. Đối chiếu lại source code React ở `TARGET_REPO_PATH` để tạo/cập nhật `locators/<domain>.locators.json`:
   * Chỉ dùng selector đã thấy trong code thật.
   * Đặt key theo `<domain>.<screen>.<element>`.
4. Tạo hoặc cập nhật generator script (trong `src/`) sử dụng `writeTestCasesWorkbook` từ `src/excel/writer.ts` để sinh `inputs/<module>.testcases.xlsx`:
   * Bao phủ `Normal`, `Abnormal`, `Boundary`, `Security/Role`, và `BugCheck` (nếu có Blocker chọn bắt bug).
   * Case phụ thuộc dịch vụ ngoài gắn `Automation = Manual`.
   * Case sai mật khẩu không làm khóa tài khoản demo thật.
5. Chạy xác thực:
   * `npm run build:xlsx` (hoặc script tương ứng của module)
   * `npm run validate:xlsx -- --file inputs/<module>.testcases.xlsx`
   * `npx playwright test --list` (với `SRP_EXCEL_FILE=inputs/<module>.testcases.xlsx`)
6. Đảm bảo tất cả lệnh kiểm tra pass 0 lỗi trước khi chuyển sang Step 3.
