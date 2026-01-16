/**
 * 同步状态机
 * 管理同步状态转换和事件分发
 */

import type { SyncStatus } from '@/types';
import type { SyncEvent, SyncEventType, SyncEventListener } from './types';

/**
 * 状态转换规则
 */
const STATE_TRANSITIONS: Record<SyncStatus, SyncStatus[]> = {
  idle: ['checking', 'syncing', 'offline'],
  checking: ['idle', 'syncing', 'conflict', 'error', 'offline'],
  syncing: ['success', 'error', 'conflict', 'offline'],
  success: ['idle', 'checking', 'syncing', 'offline'],
  error: ['idle', 'checking', 'syncing', 'offline'],
  conflict: ['idle', 'syncing', 'error'],
  offline: ['idle', 'checking'],
};

/**
 * 同步状态机
 */
export class SyncStateMachine {
  private currentState: SyncStatus = 'idle';
  private listeners: Set<SyncEventListener> = new Set();

  /**
   * 获取当前状态
   */
  getState(): SyncStatus {
    return this.currentState;
  }

  /**
   * 检查是否可以转换到目标状态
   */
  canTransitionTo(targetState: SyncStatus): boolean {
    const allowedTransitions = STATE_TRANSITIONS[this.currentState];
    return allowedTransitions.includes(targetState);
  }

  /**
   * 转换到新状态
   */
  transitionTo(targetState: SyncStatus, data?: unknown): boolean {
    if (!this.canTransitionTo(targetState)) {
      console.warn(
        `Invalid state transition: ${this.currentState} -> ${targetState}`
      );
      return false;
    }

    const previousState = this.currentState;
    this.currentState = targetState;

    // 发送状态变更事件
    this.emit(this.getEventTypeForState(targetState), data);

    console.log(`Sync state: ${previousState} -> ${targetState}`);
    return true;
  }

  /**
   * 根据状态获取对应的事件类型
   */
  private getEventTypeForState(state: SyncStatus): SyncEventType {
    switch (state) {
      case 'checking':
      case 'syncing':
        return 'sync-start';
      case 'success':
        return 'sync-success';
      case 'error':
        return 'sync-error';
      case 'conflict':
        return 'sync-conflict';
      case 'offline':
        return 'sync-offline';
      default:
        return 'sync-progress';
    }
  }

  /**
   * 发送事件
   */
  private emit(type: SyncEventType, data?: unknown): void {
    const event: SyncEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Sync event listener error:', error);
      }
    });
  }

  /**
   * 添加事件监听器
   */
  addListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 移除事件监听器
   */
  removeListener(listener: SyncEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * 重置状态机
   */
  reset(): void {
    this.currentState = 'idle';
  }

  /**
   * 检查是否处于活动状态（正在同步）
   */
  isActive(): boolean {
    return this.currentState === 'checking' || this.currentState === 'syncing';
  }

  /**
   * 检查是否需要用户干预
   */
  needsUserAction(): boolean {
    return this.currentState === 'conflict' || this.currentState === 'error';
  }
}

/**
 * 创建同步状态机实例
 */
export function createSyncStateMachine(): SyncStateMachine {
  return new SyncStateMachine();
}
