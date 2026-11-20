import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runDbReset } from '../engine/dbReset.js';
import { loadLocatorRegistry } from '../engine/locatorResolver.js';
import { writeAssessmentArtifacts } from '../excel/assessmentWriter.js';
import { readTestCasesWorkbook, validateWorkbook } from '../excel/reader.js';
import type {
  RunResultsPayload,
  TestCaseExecutionResult,
  TestCaseSpec,
} from '../excel/schema.js';
import { writeEvidenceWorkbook } from '../excel/writer.js';
import {
  AUTH_HOME_BLOCKER_DECISIONS,
  AUTH_HOME_FINDINGS,
} from '../pilot/authHomeMetadata.js';
import { getBoolFlag, getStringFlag, parseCliArgs } from './cliArgs.js';

function createRunId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

function filterSelectedTestCases(
  cases: TestCaseSpec[],
  tcFilter?: string,
  tagFilter?: string
): TestCaseSpec[] {
  return cases.filter((tc) => {
    if (tcFilter) {
      const allowed = new Set(tcFilter.split(',').map((s) => s.trim().toUpperCase()));
      if (!allowed.has(tc.id.toUpperCase())) return false;
    }
    if (tagFilter) {
      const tagLower = tagFilter.toLowerCase();
      if (!tc.tags.some((t) => t.toLowerCase() === tagLower)) return false;
    }
    return true;
  });
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const excelFile = path.resolve(
    getStringFlag(args, 'file') ||
      args.positional[0] ||
      'inputs/auth-home.testcases.xlsx'
  );
  const tcFilter = getStringFlag(args, 'tc');
  const tagFilter = getStringFlag(args, 'tag');
  const headed = getBoolFlag(args, 'headed');
  const resetDbFlag = getBoolFlag(args, 'reset-db');
  const noResetDbFlag = getBoolFlag(args, 'no-reset-db');
  const noAssessment = getBoolFlag(args, 'no-assessment') === true;
  const baseUrlOverride = getStringFlag(args, 'base-url');
  const runId = getStringFlag(args, 'run-id') || createRunId();

  const registry = loadLocatorRegistry(path.resolve('locators'));
  const workbook = await readTestCasesWorkbook(excelFile);
  const validation = validateWorkbook(workbook, registry);

  if (!validation.valid) {
    console.error('\n[run-excel] File Excel có lỗi, dừng chạy Playwright:');
    for (const err of validation.errors) {
      console.error(`  x ${err}`);
    }
    process.exit(1);
  }

  const moduleSlug =
    getStringFlag(args, 'module') ||
    path.basename(excelFile, '.xlsx').replace(/\.testcases$/i, '') ||
    'suite';

  const shouldResetDb =
    noResetDbFlag === true
      ? false
      : resetDbFlag === true
      ? true
      : process.env.RESET_DB_BEFORE_RUN === 'true';

  if (shouldResetDb) {
    const resetScript =
      process.env.RESET_DB_SCRIPT ||
      'D:\\Github\\SmartRentalPlatform\\scripts\\reset-demo-data.ps1';
    runDbReset(resetScript);
  }

  const runDir = path.resolve('evidence', runId);
  fs.mkdirSync(runDir, { recursive: true });
  const parsedWorkbookPath = path.join(runDir, '_parsed-workbook.json');
  fs.writeFileSync(parsedWorkbookPath, JSON.stringify(workbook, null, 2), 'utf-8');

  const effectiveBaseUrl =
    baseUrlOverride || process.env.BASE_URL || workbook.overview.baseUrl || 'http://localhost:5173';
  const startedAt = new Date().toISOString();

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    BASE_URL: effectiveBaseUrl,
    SRP_EXCEL_FILE: excelFile,
    SRP_RUN_ID: runId,
    SRP_RUN_DIR: runDir,
    SRP_PARSED_WORKBOOK: parsedWorkbookPath,
    SRP_TC_FILTER: tcFilter ?? '',
    SRP_TAG_FILTER: tagFilter ?? '',
    HEADLESS: headed ? 'false' : process.env.HEADLESS || 'true',
  };

  console.log(`\n[run-excel] Bắt đầu chạy Playwright`);
  console.log(`- Run ID    : ${runId}`);
  console.log(`- File Excel: ${excelFile}`);
  console.log(`- Base URL  : ${effectiveBaseUrl}`);
  console.log(`- DB Reset  : ${shouldResetDb ? 'Yes' : 'No'}`);
  if (tcFilter) console.log(`- Lọc TC    : ${tcFilter}`);
  if (tagFilter) console.log(`- Lọc Tag   : ${tagFilter}`);
  console.log('');

  const playwrightCli = path.resolve('node_modules/@playwright/test/cli.js');
  const pwResult = spawnSync(
    process.execPath,
    [playwrightCli, 'test', 'tests/excel-driven.spec.ts'],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: childEnv,
    }
  );

  const finishedAt = new Date().toISOString();
  const rawResultsFile = path.join(runDir, '_raw-results.json');
  const executedList: TestCaseExecutionResult[] = fs.existsSync(rawResultsFile)
    ? (JSON.parse(fs.readFileSync(rawResultsFile, 'utf-8')) as TestCaseExecutionResult[])
    : [];
  const executedMap = new Map(executedList.map((r) => [r.id, r]));

  const selectedCases = filterSelectedTestCases(workbook.testCases, tcFilter, tagFilter);
  const normalizedResults: TestCaseExecutionResult[] = selectedCases.map((tc) => {
    const found = executedMap.get(tc.id);
    if (found) return found;
    return {
      id: tc.id,
      module: tc.module,
      screenId: tc.screenId,
      title: tc.title,
      category: tc.category,
      priority: tc.priority,
      automation: tc.automation,
      role: tc.role,
      status: tc.automation === 'Manual' ? 'MANUAL' : 'SKIPPED',
      durationMs: 0,
      errorSummary:
        tc.automation === 'Manual'
          ? 'Manual test case'
          : 'Không thấy kết quả thực thi từ Playwright.',
      steps: tc.steps.map((s) => ({
        stepNo: s.stepNo,
        stepDesc: s.stepDesc,
        action: s.action,
        target: s.target,
        resolvedInput: s.inputData,
        expectedResult: s.expectedResult,
        status: 'SKIPPED',
        durationMs: 0,
      })),
    };
  });

  const payload: RunResultsPayload = {
    runId,
    moduleName: moduleSlug,
    sourceFile: path.relative(process.cwd(), excelFile).replaceAll('\\', '/'),
    baseUrl: effectiveBaseUrl,
    dbResetExecuted: shouldResetDb,
    startedAt,
    finishedAt,
    results: normalizedResults,
  };

  const runSummaryJsonPath = path.join(runDir, 'run-summary.json');
  fs.writeFileSync(runSummaryJsonPath, JSON.stringify(payload, null, 2), 'utf-8');

  const evidenceExcelPath = path.join(runDir, `Evidence_${moduleSlug}.xlsx`);
  await writeEvidenceWorkbook(evidenceExcelPath, workbook, payload);

  if (!noAssessment && moduleSlug === 'auth-home') {
    await writeAssessmentArtifacts({
      moduleName: moduleSlug,
      workbook,
      runPayload: payload,
      blockerDecisions: AUTH_HOME_BLOCKER_DECISIONS,
      findings: AUTH_HOME_FINDINGS,
      xlsxOutputPath: path.resolve('assessments', `${moduleSlug}-assessment.xlsx`),
      mdOutputPath: path.resolve('assessments', `${moduleSlug}-assessment.md`),
    });
  }

  const passCount = normalizedResults.filter((r) => r.status === 'PASS').length;
  const failCount = normalizedResults.filter((r) => r.status === 'FAIL').length;
  const manualCount = normalizedResults.filter((r) => r.status === 'MANUAL').length;

  console.log('\n============================================================');
  console.log(`[run-excel] KẾT QUẢ RUN ${runId}`);
  console.log(`- Tổng TC : ${normalizedResults.length} | PASS: ${passCount} | FAIL: ${failCount} | MANUAL: ${manualCount}`);
  console.log(`- Ảnh từng bước : ${runDir}`);
  console.log(`- Excel Evidence: ${evidenceExcelPath}`);
  if (!noAssessment && moduleSlug === 'auth-home') {
    console.log(`- Assessment    : ${path.resolve('assessments', `${moduleSlug}-assessment.xlsx`)}`);
  }
  console.log('============================================================\n');

  const exitCode = pwResult.status ?? (failCount > 0 ? 1 : 0);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('[run-excel] Lỗi:', err instanceof Error ? err.message : err);
  process.exit(1);
});
