/**
 * PBKDF2 密钥派生模块
 * 使用 Web Crypto API 从用户密码派生加密密钥
 */

import type { KeyDerivationParams } from './types';
import { DEFAULT_CRYPTO_CONFIG } from './types';

/**
 * 生成随机 salt
 * @param length salt 长度（字节），默认 16
 */
export function generateSalt(length: number = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * 从密码派生加密密钥
 * @param password 用户密码
 * @param params 派生参数（salt, iterations）
 * @returns CryptoKey 用于 AES-GCM 加解密
 */
export async function deriveKey(
  password: string,
  params: KeyDerivationParams
): Promise<CryptoKey> {
  // 将密码转换为 ArrayBuffer
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // 导入密码作为原始密钥材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // 使用 PBKDF2 派生 AES-GCM 密钥
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(params.salt),
      iterations: params.iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: DEFAULT_CRYPTO_CONFIG.keyLength,
    },
    false, // 不可导出
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * 创建新的密钥派生参数
 * @param iterations 迭代次数，默认使用配置值
 */
export function createKeyDerivationParams(
  iterations: number = DEFAULT_CRYPTO_CONFIG.iterations
): KeyDerivationParams {
  return {
    salt: generateSalt(),
    iterations,
  };
}
