import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { loadLocatorRegistry } from '../src/engine/locatorResolver.js';
import { executeTestCase } from '../src/engine/stepRunner.js';
import type {
  TestCaseExecutionResult,
  TestCaseSpec,
  WorkbookSpec,
} from '../src/excel/schema.js';

function loadWorkbookSync(): {
  workbook: WorkbookSpec;
  runDir: string;
} {
  const excelFile = process.env.SRP_EXCEL_FILE || path.resolve('inputs/auth-home.testcases.xlsx');
  const runId = process.env.SRP_RUN_ID || 'manual-playwright-run';
  const runDir = path.resolve(process.env.SRP_RUN_DIR || path.join('evidence', runId));
  let parsedPath = process.env.SRP_PARSED_WORKBOOK;

  if (!parsedPath || !fs.existsSync(parsedPath)) {
    fs.mkdirSync(runDir, { recursive: true });
    parsedPath = path.join(runDir, '_parsed-workbook.json');
    const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs');
    execFileSync(
      process.execPath,
      [tsxCli, 'src/cli/export-parsed.ts', '--file', excelFile, '--out', parsedPath],
      {
        stdio: 'inherit',
        cwd: process.cwd(),
      }
    );
  }

  const workbook = JSON.parse(fs.readFileSync(parsedPath, 'utf-8')) as WorkbookSpec;
  return { workbook, runDir };
}

function shouldRunTestCase(tc: TestCaseSpec): boolean {
  const tcFilter = process.env.SRP_TC_FILTER?.trim();
  if (tcFilter) {
    const allowedIds = new Set(tcFilter.split(',').map((s) => s.trim().toUpperCase()));
    if (!allowedIds.has(tc.id.toUpperCase())) {
      return false;
    }
  }

  const tagFilter = process.env.SRP_TAG_FILTER?.trim().toLowerCase();
  if (tagFilter) {
    const hasTag = tc.tags.some((t) => t.toLowerCase() === tagFilter);
    if (!hasTag) {
      return false;
    }
  }

  return true;
}

function persistResult(resultsFile: string, result: TestCaseExecutionResult): void {
  fs.mkdirSync(path.dirname(resultsFile), { recursive: true });
  let existing: TestCaseExecutionResult[] = [];
  if (fs.existsSync(resultsFile)) {
    existing = JSON.parse(fs.readFileSync(resultsFile, 'utf-8')) as TestCaseExecutionResult[];
  }
  const filtered = existing.filter((r) => r.id !== result.id);
  filtered.push(result);
  fs.writeFileSync(resultsFile, JSON.stringify(filtered, null, 2), 'utf-8');
}

const { workbook, runDir } = loadWorkbookSync();
const registry = loadLocatorRegistry(path.resolve('locators'));
const rawResultsFile = path.join(runDir, '_raw-results.json');
const selectedCases = workbook.testCases.filter(shouldRunTestCase);

test.describe(`Excel Suite: ${workbook.overview.module || 'SmartRentalPlatform'}`, () => {
  for (const tc of selectedCases) {
    test(`${tc.id} | ${tc.title}`, async ({ page }) => {
      if (tc.automation === 'Manual') {
        const manualResult: TestCaseExecutionResult = {
          id: tc.id,
          module: tc.module,
          screenId: tc.screenId,
          title: tc.title,
          category: tc.category,
          priority: tc.priority,
          automation: tc.automation,
          role: tc.role,
          status: 'MANUAL',
          durationMs: 0,
          errorSummary: 'Đánh dấu Manual theo quyết định Blocker B3 (phụ thuộc 3rd-party ngoài).',
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
        persistResult(rawResultsFile, manualResult);
        test.skip(true, 'Manual test case — skipped during automated Playwright run.');
        return;
      }

      const baseUrl = process.env.BASE_URL || workbook.overview.baseUrl || 'http://localhost:5173';
      const captureEvidence = process.env.CAPTURE_STEP_EVIDENCE !== 'false';
      const highlightTarget = process.env.HIGHLIGHT_TARGET !== 'false';

      const result = await executeTestCase(page, tc, registry, {
        baseUrl,
        evidenceRootDir: runDir,
        captureEvidence,
        highlightTarget,
        testData: workbook.testData,
      });

      persistResult(rawResultsFile, result);

      if (result.status === 'FAIL') {
        throw new Error(result.errorSummary || `Test case ${tc.id} failed.`);
      }
    });
  }
});
