import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const generateTotpSecret = (bytes = 20): string => {
  const buffer = crypto.randomBytes(bytes);
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let secret = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
};

const base32Decode = (secret: string): Buffer => {
  const normalized = secret.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const char of normalized) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new Error('Secret TOTP tidak valid.');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

const hotp = (secret: string, counter: number, digits = 6): string => {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter % 0x100000000, 4);
  const digest = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, '0');
};

export const totpCode = (secret: string, at = Date.now(), step = 30, digits = 6): string =>
  hotp(secret, Math.floor(at / 1000 / step), digits);

export const verifyTotp = (secret: string, token: string, window = 1, step = 30): boolean => {
  const candidate = String(token || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(candidate) || !secret) return false;
  const counter = Math.floor(Date.now() / 1000 / step);
  for (let drift = -window; drift <= window; drift += 1) {
    if (hotp(secret, counter + drift) === candidate) return true;
  }
  return false;
};

export const buildOtpAuthUrl = (secret: string, label: string, issuer = 'Talenta+'): string =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;