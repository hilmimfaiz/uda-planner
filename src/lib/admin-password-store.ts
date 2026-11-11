import fs from 'fs';
import path from 'path';

const CREDENTIALS_FILE = path.join(process.cwd(), '.admin-credentials.json');
const DEFAULT_ADMIN_PASSWORD = 'admin123';

let inMemoryPassword = DEFAULT_ADMIN_PASSWORD;

function loadStoredPassword(): string {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
      const json = JSON.parse(data);
      if (json && typeof json.adminPassword === 'string' && json.adminPassword.length >= 6) {
        inMemoryPassword = json.adminPassword;
        return inMemoryPassword;
      }
    }
  } catch (err) {
    console.warn('[admin-password-store] Failed to read credentials file:', err);
  }
  return inMemoryPassword;
}

export function getValidAdminPassword(): string {
  return loadStoredPassword();
}

export function setValidAdminPassword(newPassword: string): boolean {
  if (!newPassword || newPassword.length < 6) {
    return false;
  }
  inMemoryPassword = newPassword;
  try {
    fs.writeFileSync(
      CREDENTIALS_FILE,
      JSON.stringify(
        {
          adminPassword: newPassword,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    );
    return true;
  } catch (err) {
    console.warn('[admin-password-store] Failed to save credentials file:', err);
    return false;
  }
}

export function verifyAdminPassword(candidate: string): boolean {
  if (!candidate) return false;
  const valid = getValidAdminPassword();
  return candidate === valid;
}

