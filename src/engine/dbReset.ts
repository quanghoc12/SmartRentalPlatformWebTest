import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

export function runDbReset(scriptPath: string): void {
  if (!scriptPath) {
    throw new Error('RESET_DB_SCRIPT chưa được cấu hình.');
  }
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Không tìm thấy script reset DB: ${scriptPath}`);
  }

  console.log(`\n[DB Reset] Đang chạy: ${scriptPath}`);
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    }
  );

  if (result.error) {
    throw new Error(`Lỗi khi gọi PowerShell reset DB: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `Script reset DB kết thúc với mã lỗi ${result.status}. Hãy kiểm tra Docker Desktop & container postgres ở SmartRentalPlatform.`
    );
  }
  console.log('[DB Reset] Hoàn tất khôi phục database sạch.\n');
}
