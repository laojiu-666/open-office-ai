/**
 * 云同步状态卡片
 * 显示同步状态，提供同步操作入口
 */

import React from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Badge,
  Spinner,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  Cloud24Regular,
  CloudSync24Regular,
  CloudOff24Regular,
  CloudCheckmark24Regular,
  CloudDismiss24Regular,
  Warning24Regular,
  Settings16Regular,
  ArrowSync16Regular,
} from '@fluentui/react-icons';
import type { SyncStatus } from '@/types';
import { useAppStore } from '@ui/store/appStore';

const useStyles = makeStyles({
  card: {
    marginBottom: '16px',
    borderLeft: `4px solid ${tokens.colorBrandStroke1}`,
  },
  cardNotConfigured: {
    borderLeftColor: tokens.colorNeutralStroke2,
  },
  cardError: {
    borderLeftColor: tokens.colorPaletteRedBorder1,
  },
  cardConflict: {
    borderLeftColor: tokens.colorPaletteYellowBorder1,
  },
  header: {
    padding: '16px',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  icon: {
    fontSize: '24px',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontWeight: 600,
    fontSize: '14px',
  },
  subtitle: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  statusBadge: {
    marginLeft: '8px',
  },
});

interface CloudSyncCardProps {
  onConfigureClick: () => void;
  onSyncClick: () => void;
  onResolveConflict: () => void;
}

export function CloudSyncCard({
  onConfigureClick,
  onSyncClick,
  onResolveConflict,
}: CloudSyncCardProps) {
  const styles = useStyles();
  const { webDavConfig, syncStatus, lastSyncTime } = useAppStore();

  const isConfigured = webDavConfig.enabled && webDavConfig.serverUrl;
  const isSyncing = syncStatus === 'syncing' || syncStatus === 'checking';

  // 获取状态图标
  const getStatusIcon = () => {
    if (!isConfigured) return <Cloud24Regular />;

    switch (syncStatus) {
      case 'syncing':
      case 'checking':
        return <Spinner size="small" />;
      case 'success':
        return <CloudCheckmark24Regular primaryFill={tokens.colorPaletteGreenForeground1} />;
      case 'error':
        return <CloudDismiss24Regular primaryFill={tokens.colorPaletteRedForeground1} />;
      case 'conflict':
        return <Warning24Regular primaryFill={tokens.colorPaletteYellowForeground1} />;
      case 'offline':
        return <CloudOff24Regular primaryFill={tokens.colorNeutralForeground3} />;
      default:
        return <CloudSync24Regular />;
    }
  };

  // 获取状态文本
  const getStatusText = (): string => {
    if (!isConfigured) return '未配置';

    switch (syncStatus) {
      case 'syncing':
        return '同步中...';
      case 'checking':
        return '检查中...';
      case 'success':
        return lastSyncTime
          ? `已同步 · ${formatTime(lastSyncTime)}`
          : '已同步';
      case 'error':
        return '同步失败';
      case 'conflict':
        return '存在冲突';
      case 'offline':
        return '离线模式';
      default:
        return '就绪';
    }
  };

  // 获取卡片样式
  const getCardClass = () => {
    if (!isConfigured) return mergeClasses(styles.card, styles.cardNotConfigured);
    if (syncStatus === 'error') return mergeClasses(styles.card, styles.cardError);
    if (syncStatus === 'conflict') return mergeClasses(styles.card, styles.cardConflict);
    return styles.card;
  };

  // 获取状态徽章
  const getStatusBadge = () => {
    if (!isConfigured) return null;

    const badgeProps = {
      success: { color: 'success' as const, children: '已同步' },
      error: { color: 'danger' as const, children: '错误' },
      conflict: { color: 'warning' as const, children: '冲突' },
      offline: { color: 'informative' as const, children: '离线' },
      syncing: { color: 'brand' as const, children: '同步中' },
      checking: { color: 'brand' as const, children: '检查中' },
      idle: { color: 'informative' as const, children: '就绪' },
    };

    const props = badgeProps[syncStatus] || badgeProps.idle;
    return (
      <Badge
        appearance="filled"
        color={props.color}
        size="small"
        className={styles.statusBadge}
      >
        {props.children}
      </Badge>
    );
  };

  return (
    <Card className={getCardClass()}>
      <CardHeader
        className={styles.header}
        header={
          <div className={styles.content}>
            <div className={styles.leftSection}>
              <span className={styles.icon}>{getStatusIcon()}</span>
              <div className={styles.info}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Text className={styles.title}>数据备份与同步</Text>
                  {getStatusBadge()}
                </div>
                <Text className={styles.subtitle}>
                  {isConfigured
                    ? getStatusText()
                    : '使用 WebDAV 跨设备同步你的配置'}
                </Text>
              </div>
            </div>
            <div className={styles.actions}>
              {isConfigured ? (
                <>
                  {syncStatus === 'conflict' ? (
                    <Button
                      appearance="primary"
                      size="small"
                      onClick={onResolveConflict}
                    >
                      解决冲突
                    </Button>
                  ) : (
                    <Button
                      appearance="subtle"
                      icon={<ArrowSync16Regular />}
                      size="small"
                      onClick={onSyncClick}
                      disabled={isSyncing}
                    >
                      {isSyncing ? '同步中' : '立即同步'}
                    </Button>
                  )}
                  <Button
                    appearance="subtle"
                    icon={<Settings16Regular />}
                    size="small"
                    onClick={onConfigureClick}
                  />
                </>
              ) : (
                <Button
                  appearance="primary"
                  size="small"
                  onClick={onConfigureClick}
                >
                  配置同步
                </Button>
              )}
            </div>
          </div>
        }
      />
    </Card>
  );
}

// 格式化时间
function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;

  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
