import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { writeAssessmentArtifacts } from '../excel/assessmentWriter.js';
import { readTestCasesWorkbook } from '../excel/reader.js';
import type { RunResultsPayload } from '../excel/schema.js';
import {
  AUTH_HOME_BLOCKER_DECISIONS,
  AUTH_HOME_FINDINGS,
} from '../pilot/authHomeMetadata.js';
import { getStringFlag, parseCliArgs } from './cliArgs.js';

function findLatestRunSummary(moduleName: string): RunResultsPayload | null {
  const evidenceRoot = path.resolve('evidence');
  if (!fs.existsSync(evidenceRoot)) return null;

  const dirs = fs
    .readdirSync(evidenceRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort()
    .reverse();

  for (const dir of dirs) {
    const summaryPath = path.join(evidenceRoot, dir, 'run-summary.json');
    if (fs.existsSync(summaryPath)) {
      const payload = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as RunResultsPayload;
      if (!moduleName || payload.moduleName.toLowerCase() === moduleName.toLowerCase()) {
        return payload;
      }
    }
  }

  return null;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const filePath = path.resolve(
    getStringFlag(args, 'file') || 'inputs/auth-home.testcases.xlsx'
  );
  const moduleName = getStringFlag(args, 'module') || 'auth-home';
  const runJsonFlag = getStringFlag(args, 'run-json');

  const workbook = await readTestCasesWorkbook(filePath);
  const runPayload = runJsonFlag && fs.existsSync(runJsonFlag)
    ? (JSON.parse(fs.readFileSync(runJsonFlag, 'utf-8')) as RunResultsPayload)
    : findLatestRunSummary(moduleName);

  const xlsxOut = path.resolve('assessments', `${moduleName}-assessment.xlsx`);
  const mdOut = path.resolve('assessments', `${moduleName}-assessment.md`);

  await writeAssessmentArtifacts({
    moduleName,
    workbook,
    runPayload,
    blockerDecisions: AUTH_HOME_BLOCKER_DECISIONS,
    findings: AUTH_HOME_FINDINGS,
    xlsxOutputPath: xlsxOut,
    mdOutputPath: mdOut,
  });

  console.log(`\n[Assessment] Đã xuất:`);
  console.log(`- Excel: ${xlsxOut}`);
  console.log(`- Markdown: ${mdOut}\n`);
}

main().catch((err) => {
  console.error('[generate-assessment] Lỗi:', err instanceof Error ? err.message : err);
  process.exit(1);
});
