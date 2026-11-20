import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { readTestCasesWorkbook } from '../excel/reader.js';
import { getStringFlag, parseCliArgs } from './cliArgs.js';

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const filePath = path.resolve(
    getStringFlag(args, 'file') || 'inputs/auth-home.testcases.xlsx'
  );
  const outPath = path.resolve(
    getStringFlag(args, 'out') || 'evidence/_parsed-workbook.json'
  );

  const workbook = await readTestCasesWorkbook(filePath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(workbook, null, 2), 'utf-8');
}

main().catch((err) => {
  console.error('[export-parsed] Lỗi:', err instanceof Error ? err.message : err);
  process.exit(1);
});
