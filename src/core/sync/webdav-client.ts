/**
 * WebDAV 客户端实现
 * 使用 fetch API 实现 WebDAV 协议的核心操作
 */

import type { WebDavConnectionConfig, WebDavFileInfo } from './types';

/**
 * WebDAV 客户端
 */
export class WebDavClient {
  private config: WebDavConnectionConfig;

  constructor(config: WebDavConnectionConfig) {
    this.config = config;
  }

  /**
   * 获取完整的远端 URL
   */
  private getFullUrl(path?: string): string {
    const base = this.config.serverUrl.replace(/\/+$/, '');
    const remotePath = path || this.config.remotePath;
    return `${base}${remotePath.startsWith('/') ? '' : '/'}${remotePath}`;
  }

  /**
   * 获取 Basic Auth 头
   */
  private getAuthHeader(): string {
    const credentials = `${this.config.username}:${this.config.password}`;
    return `Basic ${btoa(credentials)}`;
  }

  /**
   * 通用请求方法
   */
  private async request(
    method: string,
    path?: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = this.getFullUrl(path);
    const headers = new Headers(options.headers);
    headers.set('Authorization', this.getAuthHeader());

    const response = await fetch(url, {
      ...options,
      method,
      headers,
    });

    return response;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 使用 PROPFIND 测试连接（比 OPTIONS 更可靠）
      const response = await this.request('PROPFIND', '/', {
        headers: {
          'Depth': '0',
          'Content-Type': 'application/xml',
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`,
      });
      return response.ok || response.status === 207;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件信息 (PROPFIND)
   */
  async stat(path?: string): Promise<WebDavFileInfo> {
    try {
      const response = await this.request('PROPFIND', path, {
        headers: {
          'Depth': '0',
          'Content-Type': 'application/xml',
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:getetag/>
    <D:getlastmodified/>
    <D:getcontentlength/>
  </D:prop>
</D:propfind>`,
      });

      if (response.status === 404) {
        return { exists: false };
      }

      if (!response.ok && response.status !== 207) {
        throw new Error(`PROPFIND failed: ${response.status}`);
      }

      const xml = await response.text();
      return this.parsePropfindResponse(xml);
    } catch (error) {
      if (error instanceof TypeError) {
        // 网络错误
        throw new Error('Network error: Unable to connect to WebDAV server');
      }
      throw error;
    }
  }

  /**
   * 解析 PROPFIND 响应
   */
  private parsePropfindResponse(xml: string): WebDavFileInfo {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    // 提取 ETag
    const etagEl = doc.querySelector('getetag');
    const etag = etagEl?.textContent?.replace(/"/g, '') || undefined;

    // 提取 Last-Modified
    const lastModifiedEl = doc.querySelector('getlastmodified');
    const lastModified = lastModifiedEl?.textContent
      ? new Date(lastModifiedEl.textContent).getTime()
      : undefined;

    // 提取 Content-Length
    const contentLengthEl = doc.querySelector('getcontentlength');
    const contentLength = contentLengthEl?.textContent
      ? parseInt(contentLengthEl.textContent, 10)
      : undefined;

    return {
      exists: true,
      etag,
      lastModified,
      contentLength,
    };
  }

  /**
   * 读取文件内容 (GET)
   */
  async get(path?: string): Promise<string | null> {
    try {
      const response = await this.request('GET', path);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`GET failed: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to connect to WebDAV server');
      }
      throw error;
    }
  }

  /**
   * 写入文件内容 (PUT)
   * @param content 文件内容
   * @param path 文件路径
   * @param etag 可选的 ETag，用于条件更新
   */
  async put(
    content: string,
    path?: string,
    etag?: string
  ): Promise<WebDavFileInfo> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 条件更新：如果提供了 ETag，使用 If-Match
      if (etag) {
        headers['If-Match'] = `"${etag}"`;
      }

      const response = await this.request('PUT', path, {
        headers,
        body: content,
      });

      // 412 Precondition Failed 表示 ETag 不匹配（冲突）
      if (response.status === 412) {
        throw new Error('CONFLICT: Remote file has been modified');
      }

      if (!response.ok && response.status !== 201 && response.status !== 204) {
        throw new Error(`PUT failed: ${response.status}`);
      }

      // 获取新的 ETag
      const newEtag = response.headers.get('ETag')?.replace(/"/g, '');

      return {
        exists: true,
        etag: newEtag || undefined,
        lastModified: Date.now(),
      };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to connect to WebDAV server');
      }
      throw error;
    }
  }

  /**
   * 创建目录 (MKCOL)
   */
  async mkcol(path: string): Promise<boolean> {
    try {
      const response = await this.request('MKCOL', path);
      return response.ok || response.status === 201 || response.status === 405;
    } catch {
      return false;
    }
  }

  /**
   * 删除文件 (DELETE)
   */
  async delete(path?: string): Promise<boolean> {
    try {
      const response = await this.request('DELETE', path);
      return response.ok || response.status === 204 || response.status === 404;
    } catch {
      return false;
    }
  }

  /**
   * 确保远端目录存在
   */
  async ensureDirectory(): Promise<void> {
    const remotePath = this.config.remotePath;
    const parts = remotePath.split('/').filter(Boolean);

    // 移除文件名，只保留目录路径
    parts.pop();

    let currentPath = '';
    for (const part of parts) {
      currentPath += `/${part}`;
      await this.mkcol(currentPath);
    }
  }
}

/**
 * 创建 WebDAV 客户端实例
 */
export function createWebDavClient(config: WebDavConnectionConfig): WebDavClient {
  return new WebDavClient(config);
}
