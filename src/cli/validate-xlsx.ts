import 'dotenv/config';
import path from 'node:path';
import { loadLocatorRegistry } from '../engine/locatorResolver.js';
import { readTestCasesWorkbook, validateWorkbook } from '../excel/reader.js';
import { getStringFlag, parseCliArgs } from './cliArgs.js';

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const filePath = path.resolve(
    getStringFlag(args, 'file') ||
      args.positional[0] ||
      'inputs/auth-home.testcases.xlsx'
  );

  const registry = loadLocatorRegistry(path.resolve('locators'));
  const workbook = await readTestCasesWorkbook(filePath);
  const validation = validateWorkbook(workbook, registry);

  const autoCount = workbook.testCases.filter((tc) => tc.automation === 'Auto').length;
  const manualCount = workbook.testCases.filter((tc) => tc.automation === 'Manual').length;
  const totalSteps = workbook.testCases.reduce((sum, tc) => sum + tc.steps.length, 0);

  console.log(`\n[Validate Excel] File: ${filePath}`);
  console.log(`- Module: ${workbook.overview.module || '(chưa đặt)'}`);
  console.log(`- Test Cases: ${workbook.testCases.length} (Auto: ${autoCount}, Manual: ${manualCount})`);
  console.log(`- Tổng số bước (Steps): ${totalSteps}`);
  console.log(`- Locator keys đã nạp: ${Object.keys(registry).length}`);

  if (validation.warnings.length > 0) {
    console.log(`\n[Warnings (${validation.warnings.length})]:`);
    for (const w of validation.warnings) {
      console.log(`  ! ${w}`);
    }
  }

  if (!validation.valid) {
    console.error(`\n[Errors (${validation.errors.length})]:`);
    for (const err of validation.errors) {
      console.error(`  x ${err}`);
    }
    process.exit(1);
  }

  console.log('\n[Validate Excel] HỢP LỆ — 0 lỗi schema hoặc locator.\n');
}

main().catch((err) => {
  console.error('[validate-xlsx] Lỗi:', err instanceof Error ? err.message : err);
  process.exit(1);
});
