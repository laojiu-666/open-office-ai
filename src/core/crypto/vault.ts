/**
 * Vault 加密封装模块
 * 提供高层 API 用于加密/解密配置数据
 */

import type { EncryptedPayload, VaultPayload, SyncSnapshot, SyncMetadata } from '@/types';
import { deriveKey, createKeyDerivationParams } from './key-derivation';
import { encrypt, decrypt, arrayBufferToBase64, base64ToArrayBuffer } from './cipher';

const VAULT_VERSION = 1;

/**
 * 加密 Vault 数据
 * @param payload 明文配置数据
 * @param password 用户主密码
 * @returns 加密后的同步快照
 */
export async function encryptVault(
  payload: VaultPayload,
  password: string
): Promise<SyncSnapshot> {
  // 序列化数据
  const plaintext = JSON.stringify(payload);

  // 创建密钥派生参数
  const params = createKeyDerivationParams();

  // 派生密钥
  const key = await deriveKey(password, params);

  // 加密
  const result = await encrypt(plaintext, key, params.salt, params.iterations);

  // 构建加密载荷
  const encryptedPayload: EncryptedPayload = {
    cipherText: arrayBufferToBase64(result.cipherText),
    iv: arrayBufferToBase64(result.iv),
    salt: arrayBufferToBase64(result.salt),
    iterations: result.iterations,
    alg: 'AES-GCM',
  };

  // 构建同步快照
  const metadata: SyncMetadata = {
    revision: 1,
    updatedAt: Date.now(),
  };

  return {
    vaultVersion: VAULT_VERSION,
    metadata,
    encryptedPayload,
  };
}

/**
 * 解密 Vault 数据
 * @param snapshot 加密的同步快照
 * @param password 用户主密码
 * @returns 解密后的配置数据
 */
export async function decryptVault(
  snapshot: SyncSnapshot,
  password: string
): Promise<VaultPayload> {
  const { encryptedPayload } = snapshot;

  // 解码 Base64
  const cipherText = base64ToArrayBuffer(encryptedPayload.cipherText);
  const iv = base64ToArrayBuffer(encryptedPayload.iv);
  const salt = base64ToArrayBuffer(encryptedPayload.salt);

  // 派生密钥
  const key = await deriveKey(password, {
    salt,
    iterations: encryptedPayload.iterations,
  });

  // 解密
  const plaintext = await decrypt(cipherText, key, iv);

  // 解析 JSON
  return JSON.parse(plaintext) as VaultPayload;
}

/**
 * 更新 Vault 快照（重新加密并更新元数据）
 * @param payload 新的明文数据
 * @param password 用户主密码
 * @param previousMetadata 之前的元数据（用于递增 revision）
 */
export async function updateVault(
  payload: VaultPayload,
  password: string,
  previousMetadata?: SyncMetadata
): Promise<SyncSnapshot> {
  const snapshot = await encryptVault(payload, password);

  // 递增 revision
  if (previousMetadata) {
    snapshot.metadata.revision = previousMetadata.revision + 1;
  }

  return snapshot;
}

/**
 * 验证密码是否正确
 * @param snapshot 加密的同步快照
 * @param password 待验证的密码
 * @returns 密码是否正确
 */
export async function verifyPassword(
  snapshot: SyncSnapshot,
  password: string
): Promise<boolean> {
  try {
    await decryptVault(snapshot, password);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建空的 Vault 快照
 * @param password 用户主密码
 */
export async function createEmptyVault(password: string): Promise<SyncSnapshot> {
  const emptyPayload: VaultPayload = {
    connections: [],
    activeConnectionId: null,
  };

  return encryptVault(emptyPayload, password);
}
