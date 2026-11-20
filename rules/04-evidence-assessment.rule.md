# Rule 04 — Evidence Capture & Assessment Sheet

## 1. Chụp ảnh từng bước (Step-by-step Evidence)
Khi `CAPTURE_STEP_EVIDENCE=true`:
* Với mỗi step trong test case `Auto`:
  1. Nếu step có `Target` và `HIGHLIGHT_TARGET=true` và element đang tồn tại trong DOM: viền tạm element bằng khung đỏ `3px solid #ef4444` ngay trước khi chụp (và khôi phục style gốc ngay sau khi chụp, đảm bảo không làm hỏng DOM nếu step gây chuyển trang).
  2. Chụp viewport/full-screen PNG vào `evidence/<runId>/<TC_ID>/step-<NN>_<ACTION>.png`.
  3. Nếu step bị FAIL: bắt buộc chụp thêm ảnh lỗi `evidence/<runId>/<TC_ID>/step-<NN>_FAILED.png` trước khi đánh dấu TC fail để lưu bằng chứng màn hình tại thời điểm lỗi.

## 2. File Excel Evidence đầu ra (`evidence/<runId>/Evidence_<module>.xlsx`)
Được sinh tự động sau **mọi** lần chạy (kể cả khi có TC FAIL):
* **Sheet 1 `Summary`:** Thời gian chạy, `Run_ID`, `Base_URL`, file Excel nguồn, trạng thái `DB_Reset`, tổng số TC, số TC Auto/Manual, số PASS/FAIL/SKIPPED, tỷ lệ Pass Auto (%).
* **Sheet 2 `TestCases_Result`:** Mỗi dòng 1 TC với badge màu trạng thái (`PASS` xanh lá, `FAIL` đỏ, `MANUAL` vàng cam, `SKIPPED` xám), thời gian chạy (ms), số step Pass/Total, tóm tắt lỗi, đường dẫn thư mục ảnh.
* **Sheet 3 `Step_Evidence`:** Liệt kê từng step của từng TC Auto kèm trạng thái, thông báo lỗi (nếu có), tên file ảnh và **nhúng trực tiếp ảnh PNG thật vào ô Excel** với khoảng cách hàng đủ cao để mở file lên là xem/so sánh được ngay.

## 3. Bộ Assessment Sheet (`assessments/<module>-assessment.xlsx` & `.md`)
Bảng kiểm kê tổng thể cho Lead/Dev/QA (4 sheet):
1. **`Overview`:** Thông tin module, phạm vi màn hình, các quyết định Blocker đã chốt (`B1..Bn`), số liệu tổng hợp.
2. **`Coverage_Matrix`:** Ma trận kiểm kê theo `Screen_ID` × `Category` (`Normal`, `Abnormal`, `Boundary`, `Security/Role`, `BugCheck`) + tách cột `Auto` vs `Manual`.
3. **`Execution_Summary`:** Kết quả của lần chạy mới nhất (số Pass/Fail/Manual, thời gian chạy, link `Evidence_<module>.xlsx`).
4. **`Findings_And_Risks`:** Ghi nhận chi tiết từng `BUG-*` (lỗi thật bắt được từ code, VD `BUG-001` returnUrl ở `LoginPage.tsx`), `RISK-*` (rủi ro phụ thuộc ngoài / dữ liệu), `RECOMMENDATION-*` (đề xuất gắn `data-testid` ở Phase 2...).
