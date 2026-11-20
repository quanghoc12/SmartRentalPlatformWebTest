import path from 'node:path';
import { writeTestCasesWorkbook } from '../excel/writer.js';
import { buildAuthHomeWorkbookSpec } from '../pilot/authHomeCases.js';

async function main() {
  const outPath = path.resolve('inputs/auth-home.testcases.xlsx');
  const spec = buildAuthHomeWorkbookSpec(outPath);
  await writeTestCasesWorkbook(outPath, spec);

  const autoCount = spec.testCases.filter((tc) => tc.automation === 'Auto').length;
  const manualCount = spec.testCases.filter((tc) => tc.automation === 'Manual').length;
  console.log(`\n[build:xlsx] Đã tạo file Excel Pilot: ${outPath}`);
  console.log(`- Tổng số Test Cases: ${spec.testCases.length} (Auto: ${autoCount}, Manual: ${manualCount})\n`);
}

main().catch((err) => {
  console.error('[generate-pilot-xlsx] Lỗi:', err instanceof Error ? err.message : err);
  process.exit(1);
});
