/**
 * AES-GCM 加解密模块
 * 使用 Web Crypto API 进行对称加密
 */

import type { EncryptionResult } from './types';

/**
 * 生成随机 IV（初始化向量）
 * AES-GCM 推荐使用 12 字节 IV
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * 加密数据
 * @param plaintext 明文字符串
 * @param key 加密密钥（由 deriveKey 生成）
 * @param salt 用于派生密钥的 salt（需要保存以便解密）
 * @param iterations PBKDF2 迭代次数
 * @returns 加密结果
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey,
  salt: Uint8Array,
  iterations: number
): Promise<EncryptionResult> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = generateIV();

  const cipherText = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    key,
    data
  );

  return {
    cipherText: new Uint8Array(cipherText),
    iv,
    salt,
    iterations,
  };
}

/**
 * 解密数据
 * @param cipherText 密文
 * @param key 解密密钥
 * @param iv 初始化向量
 * @returns 解密后的明文字符串
 */
export async function decrypt(
  cipherText: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    key,
    new Uint8Array(cipherText)
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * 将 Uint8Array 转换为 Base64 字符串
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

/**
 * 将 Base64 字符串转换为 Uint8Array
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
