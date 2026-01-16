/**
 * 冲突解决对话框
 * 当本地和远端数据冲突时，让用户选择保留哪个版本
 */

import React from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Card,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  Desktop24Regular,
  Cloud24Regular,
  Checkmark16Regular,
} from '@fluentui/react-icons';
import type { ConflictInfo, ConflictResolution } from '@core/sync/types';
import { getConflictSummary } from '@core/sync/conflict-resolver';

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  description: {
    color: tokens.colorNeutralForeground2,
    fontSize: '14px',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  optionCard: {
    cursor: 'pointer',
    padding: '16px',
    border: `2px solid ${tokens.colorNeutralStroke2}`,
    transition: 'all 0.2s ease',
  },
  optionCardSelected: {
    border: `2px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
  optionCardRecommended: {
    position: 'relative' as const,
  },
  recommendedBadge: {
    position: 'absolute' as const,
    top: '-10px',
    right: '12px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  optionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  optionIcon: {
    fontSize: '24px',
    color: tokens.colorBrandForeground1,
  },
  optionTitle: {
    fontWeight: 600,
    fontSize: '14px',
  },
  optionInfo: {
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
    marginLeft: '36px',
  },
  warning: {
    backgroundColor: tokens.colorPaletteYellowBackground1,
    padding: '12px',
    borderRadius: '4px',
    fontSize: '13px',
    color: tokens.colorPaletteYellowForeground1,
  },
});

interface ConflictResolverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictInfo: ConflictInfo | null;
  onResolve: (resolution: ConflictResolution) => void;
}

export function ConflictResolver({
  open,
  onOpenChange,
  conflictInfo,
  onResolve,
}: ConflictResolverProps) {
  const styles = useStyles();
  const [selectedResolution, setSelectedResolution] = React.useState<ConflictResolution | null>(null);

  // 获取冲突摘要
  const summary = conflictInfo ? getConflictSummary(conflictInfo) : null;

  // 重置选择
  React.useEffect(() => {
    if (open && summary) {
      setSelectedResolution(summary.recommendation);
    }
  }, [open, summary]);

  const handleResolve = () => {
    if (selectedResolution) {
      onResolve(selectedResolution);
      onOpenChange(false);
    }
  };

  if (!conflictInfo || !summary) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>数据同步冲突</DialogTitle>
          <DialogContent>
            <div className={styles.content}>
              <Text className={styles.description}>
                检测到本地数据和云端数据存在冲突，请选择要保留的版本：
              </Text>

              <div className={styles.options}>
                {/* 保留远端 */}
                <Card
                  className={mergeClasses(
                    styles.optionCard,
                    selectedResolution === 'keep-remote' && styles.optionCardSelected,
                    summary.recommendation === 'keep-remote' && styles.optionCardRecommended
                  )}
                  onClick={() => setSelectedResolution('keep-remote')}
                >
                  {summary.recommendation === 'keep-remote' && (
                    <span className={styles.recommendedBadge}>推荐</span>
                  )}
                  <div className={styles.optionHeader}>
                    <Cloud24Regular className={styles.optionIcon} />
                    <Text className={styles.optionTitle}>使用云端版本</Text>
                    {selectedResolution === 'keep-remote' && (
                      <Checkmark16Regular primaryFill={tokens.colorBrandForeground1} />
                    )}
                  </div>
                  <Text className={styles.optionInfo}>{summary.remoteInfo}</Text>
                </Card>

                {/* 保留本地 */}
                <Card
                  className={mergeClasses(
                    styles.optionCard,
                    selectedResolution === 'keep-local' && styles.optionCardSelected,
                    summary.recommendation === 'keep-local' && styles.optionCardRecommended
                  )}
                  onClick={() => setSelectedResolution('keep-local')}
                >
                  {summary.recommendation === 'keep-local' && (
                    <span className={styles.recommendedBadge}>推荐</span>
                  )}
                  <div className={styles.optionHeader}>
                    <Desktop24Regular className={styles.optionIcon} />
                    <Text className={styles.optionTitle}>使用本地版本</Text>
                    {selectedResolution === 'keep-local' && (
                      <Checkmark16Regular primaryFill={tokens.colorBrandForeground1} />
                    )}
                  </div>
                  <Text className={styles.optionInfo}>{summary.localInfo}</Text>
                </Card>
              </div>

              <div className={styles.warning}>
                ⚠️ 未选择的版本将被覆盖，此操作不可撤销
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              稍后处理
            </Button>
            <Button
              appearance="primary"
              onClick={handleResolve}
              disabled={!selectedResolution}
            >
              确认选择
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
