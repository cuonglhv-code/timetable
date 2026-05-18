import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

function getKey(encryptionKey: string): Buffer {
  const salt = Buffer.alloc(SALT_LENGTH);
  salt.fill('timetable-salt');
  return scryptSync(encryptionKey, salt, 32);
}

export function encrypt(plainText: string, encryptionKey?: string): string {
  const key = getKey(encryptionKey ?? process.env.ENCRYPTION_KEY ?? '');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();
  const salt = Buffer.alloc(SALT_LENGTH).fill('timetable-salt');

  return `${salt.toString('base64')}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(encryptedText: string, encryptionKey?: string): string {
  const [saltB64, ivB64, authTagB64, encrypted] = encryptedText.split(':');

  if (!saltB64 || !ivB64 || !authTagB64 || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  const key = getKey(encryptionKey ?? process.env.ENCRYPTION_KEY ?? '');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}
