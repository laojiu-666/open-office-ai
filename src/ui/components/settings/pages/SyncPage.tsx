/**
 * 云同步设置子页面
 */

import React, { useState } from 'react';
import { makeStyles, tokens, Button, Text } from '@fluentui/react-components';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';
import { CloudSyncCard, WebDavConfigDialog, ConflictResolver } from '../sync';
import { getSyncEngine } from '@core/sync/sync-engine';
import type { WebDavConfig } from '@/types';
import type { ConflictInfo, ConflictResolution } from '@core/sync/types';
import { shadows, layoutDimensions } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  backButton: {
    minWidth: 'auto',
  },
  title: {
    fontWeight: 600,
    fontSize: '16px',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: layoutDimensions.cardBorderRadius,
    padding: '16px',
    boxShadow: shadows.card,
  },
  description: {
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
    marginBottom: '16px',
  },
});

export function SyncPage() {
  const styles = useStyles();
  const { setSettingsPage, setSyncStatus, setLastSyncTime } = useAppStore();

  const [webDavDialogOpen, setWebDavDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  // WebDAV 连接测试
  const handleTestConnection = async (config: WebDavConfig, password: string): Promise<boolean> => {
    try {
      const syncEngine = getSyncEngine();
      syncEngine.configureWebDav({
        serverUrl: config.serverUrl,
        username: config.username,
        password: password,
        remotePath: config.remotePath,
      });
      return await syncEngine.testConnection();
    } catch {
      return false;
    }
  };

  // 手动同步
  const handleSync = async () => {
    const syncEngine = getSyncEngine();
    setSyncStatus('syncing');

    try {
      const result = await syncEngine.sync();
      setSyncStatus(result.status);

      if (result.status === 'success') {
        setLastSyncTime(Date.now());
      } else if (result.status === 'conflict') {
        const conflict = syncEngine.getPendingConflict();
        if (conflict) {
          setConflictInfo(conflict);
          setConflictDialogOpen(true);
        }
      }
    } catch (error) {
      setSyncStatus('error');
      console.error('Sync failed:', error);
    }
  };

  // 解决冲突
  const handleResolveConflict = async (resolution: ConflictResolution) => {
    const syncEngine = getSyncEngine();
    setSyncStatus('syncing');

    try {
      const result = await syncEngine.resolveConflict(resolution);
      setSyncStatus(result.status);

      if (result.status === 'success') {
        setLastSyncTime(Date.now());
      }
    } catch (error) {
      setSyncStatus('error');
      console.error('Conflict resolution failed:', error);
    }

    setConflictInfo(null);
  };

  // 打开冲突解决对话框
  const handleOpenConflictResolver = () => {
    const syncEngine = getSyncEngine();
    const conflict = syncEngine.getPendingConflict();
    if (conflict) {
      setConflictInfo(conflict);
      setConflictDialogOpen(true);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          icon={<ArrowLeft24Regular />}
          className={styles.backButton}
          onClick={() => setSettingsPage('main')}
        />
        <Text className={styles.title}>云同步</Text>
      </div>
      <div className={styles.content}>
        <Text className={styles.description}>
          使用 WebDAV 服务在多个设备之间同步你的 AI 连接配置。数据会在本地加密后上传。
        </Text>

        <CloudSyncCard
          onConfigureClick={() => setWebDavDialogOpen(true)}
          onSyncClick={handleSync}
          onResolveConflict={handleOpenConflictResolver}
        />
      </div>

      {/* WebDAV 配置对话框 */}
      <WebDavConfigDialog
        open={webDavDialogOpen}
        onOpenChange={setWebDavDialogOpen}
        onTestConnection={handleTestConnection}
      />

      {/* 冲突解决对话框 */}
      <ConflictResolver
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        conflictInfo={conflictInfo}
        onResolve={handleResolveConflict}
      />
    </div>
  );
}
