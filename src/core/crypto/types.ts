/**
 * 加密模块类型定义
 */

/**
 * 密钥派生参数
 */
export interface KeyDerivationParams {
  salt: Uint8Array;
  iterations: number;
}

/**
 * 加密结果
 */
export interface EncryptionResult {
  cipherText: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
  iterations: number;
}

/**
 * 加密配置
 */
export interface CryptoConfig {
  iterations: number; // PBKDF2 迭代次数，推荐 100000+
  keyLength: number; // 密钥长度（位），256 for AES-256
  algorithm: 'AES-GCM';
}

/**
 * 默认加密配置
 */
export const DEFAULT_CRYPTO_CONFIG: CryptoConfig = {
  iterations: 100000,
  keyLength: 256,
  algorithm: 'AES-GCM',
};
