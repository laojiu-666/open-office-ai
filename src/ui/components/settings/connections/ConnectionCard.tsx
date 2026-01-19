/**
 * 连接卡片组件
 * 显示单个 AI 连接的信息，支持激活、编辑、删除操作
 */

import React from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Badge,
  makeStyles,
  mergeClasses,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  Edit16Regular,
  Delete16Regular,
  Checkmark16Filled,
  TextDescription20Regular,
  Image20Regular,
} from '@fluentui/react-icons';
import type { AIConnection } from '@/types';
import { PROVIDER_PRESETS } from '@core/llm/presets';

const useStyles = makeStyles({
  card: {
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  activeCard: {
    border: `2px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
  disabledCard: {
    opacity: 0.6,
  },
  header: {
    padding: '12px',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  name: {
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  capabilities: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
    marginBottom: '4px',
    alignItems: 'center',
  },
  details: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
  },
  activeBadge: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
  },
});

interface ConnectionCardProps {
  connection: AIConnection;
  isActive: boolean;
  onActivate: (id: string) => void;
  onEdit: (connection: AIConnection) => void;
  onDelete: (id: string) => void;
}

export function ConnectionCard({
  connection,
  isActive,
  onActivate,
  onEdit,
  onDelete,
}: ConnectionCardProps) {
  const styles = useStyles();

  const preset = PROVIDER_PRESETS[connection.providerId];

  const handleCardClick = () => {
    if (!connection.disabled) {
      onActivate(connection.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(connection);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(connection.id);
  };

  return (
    <Card
      className={mergeClasses(
        styles.card,
        isActive && styles.activeCard,
        connection.disabled && styles.disabledCard
      )}
      onClick={handleCardClick}
    >
      <CardHeader
        className={styles.header}
        header={
          <div className={styles.headerContent}>
            <div className={styles.leftSection}>
              {isActive && (
                <Checkmark16Filled primaryFill={tokens.colorPaletteGreenForeground1} />
              )}
              <div className={styles.info}>
                <Text className={styles.name}>{connection.name}</Text>

                {/* 能力标签 */}
                <div className={styles.capabilities}>
                  {/* Text Capability - 始终显示 */}
                  <Tooltip content={`文本模型: ${connection.model}`} relationship="label">
                    <Badge icon={<TextDescription20Regular />} appearance="tint" size="small">
                      文本
                    </Badge>
                  </Tooltip>

                  {/* Image Capability - 条件显示 */}
                  {preset?.capabilities?.includes('image') && (
                    <Tooltip
                      content={`图片模型: ${connection.imageModel || connection.capabilities?.image?.model || '未配置'}`}
                      relationship="label"
                    >
                      <Badge
                        icon={<Image20Regular />}
                        appearance={connection.imageModel || connection.capabilities?.image?.model ? "tint" : "outline"}
                        size="small"
                        style={{
                          opacity: connection.imageModel || connection.capabilities?.image?.model ? 1 : 0.6
                        }}
                      >
                        图片
                      </Badge>
                    </Tooltip>
                  )}
                </div>

                <div className={styles.details}>
                  <Badge appearance="outline" size="small">
                    {preset?.label || connection.providerId}
                  </Badge>
                  <Text>{connection.model}</Text>
                </div>
              </div>
            </div>
            <div className={styles.actions}>
              <Tooltip content="编辑" relationship="label">
                <Button
                  appearance="subtle"
                  icon={<Edit16Regular />}
                  size="small"
                  onClick={handleEdit}
                />
              </Tooltip>
              <Tooltip content="删除" relationship="label">
                <Button
                  appearance="subtle"
                  icon={<Delete16Regular />}
                  size="small"
                  onClick={handleDelete}
                />
              </Tooltip>
            </div>
          </div>
        }
      />
    </Card>
  );
}
