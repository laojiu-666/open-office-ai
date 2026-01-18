/**
 * 供应商配置管理器组件
 * 使用 Accordion 按供应商分组显示配置列表
 */

import React, { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Badge,
  Text,
  Button,
  makeStyles,
  tokens,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { Cloud16Regular } from '@fluentui/react-icons';
import type { AIConnection, LLMProviderId } from '@/types';
import { PROVIDER_PRESETS } from '@core/llm/presets';
import { useAppStore } from '@ui/store/appStore';
import { ConnectionCard } from './ConnectionCard';
import { AddConnectionDialog, AddConnectionButton } from './AddConnectionDialog';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontWeight: 600,
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  accordion: {
    backgroundColor: 'transparent',
  },
  accordionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  providerLabel: {
    fontWeight: 500,
  },
  countBadge: {
    marginLeft: '8px',
  },
  panel: {
    padding: '8px 0',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
});

interface ConnectionManagerProps {
  onConfigureSync?: () => void;
  showSyncButton?: boolean;
}

export function ConnectionManager({ onConfigureSync, showSyncButton }: ConnectionManagerProps) {
  const styles = useStyles();

  const {
    connections,
    activeConnectionId,
    addConnection,
    updateConnection,
    removeConnection,
    activateConnection,
  } = useAppStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<AIConnection | null>(null);

  // 按供应商分组连接
  const groupedConnections = useMemo(() => {
    const groups: Record<LLMProviderId, AIConnection[]> = {} as Record<LLMProviderId, AIConnection[]>;

    for (const conn of connections) {
      if (!groups[conn.providerId]) {
        groups[conn.providerId] = [];
      }
      groups[conn.providerId].push(conn);
    }

    // 按预设顺序排序
    const orderedProviders = Object.keys(PROVIDER_PRESETS) as LLMProviderId[];
    const sortedGroups: Array<{ providerId: LLMProviderId; connections: AIConnection[] }> = [];

    for (const providerId of orderedProviders) {
      if (groups[providerId] && groups[providerId].length > 0) {
        sortedGroups.push({
          providerId,
          connections: groups[providerId],
        });
      }
    }

    return sortedGroups;
  }, [connections]);

  const handleAddConnection = () => {
    setEditingConnection(null);
    setDialogOpen(true);
  };

  const handleEditConnection = (connection: AIConnection) => {
    setEditingConnection(connection);
    setDialogOpen(true);
  };

  const handleSaveConnection = (connectionData: Omit<AIConnection, 'id' | 'createdAt'>) => {
    if (editingConnection) {
      // 更新现有连接
      updateConnection(editingConnection.id, connectionData);
    } else {
      // 添加新连接
      const newId = addConnection(connectionData);
      // 如果是第一个连接，自动激活
      if (connections.length === 0) {
        activateConnection(newId);
      }
    }
    setEditingConnection(null);
  };

  const handleDeleteConnection = (id: string) => {
    if (confirm('确定要删除这个供应商配置吗？')) {
      removeConnection(id);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text className={styles.title}>供应商配置</Text>
        <div className={styles.actions}>
          {showSyncButton && onConfigureSync && (
            <Button
              appearance="subtle"
              icon={<Cloud16Regular />}
              size="small"
              onClick={onConfigureSync}
            >
              云同步
            </Button>
          )}
          <AddConnectionButton onClick={handleAddConnection} />
        </div>
      </div>

      {connections.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔌</div>
          <Text>还没有配置任何供应商</Text>
          <Text size={200} style={{ display: 'block', marginTop: '4px' }}>
            点击上方按钮添加你的第一个供应商配置
          </Text>
        </div>
      ) : (
        <>
          {!activeConnectionId && (
            <MessageBar intent="warning">
              <MessageBarBody>
                请选择一个供应商配置作为当前使用的 AI 服务
              </MessageBarBody>
            </MessageBar>
          )}

          {groupedConnections.length === 1 ? (
            // 只有一个供应商时，不使用 Accordion
            <div>
              {groupedConnections[0].connections.map((conn) => (
                <ConnectionCard
                  key={conn.id}
                  connection={conn}
                  isActive={conn.id === activeConnectionId}
                  onActivate={activateConnection}
                  onEdit={handleEditConnection}
                  onDelete={handleDeleteConnection}
                />
              ))}
            </div>
          ) : (
            // 多个供应商时，使用 Accordion 分组
            <Accordion
              className={styles.accordion}
              multiple
              defaultOpenItems={groupedConnections.map((g) => g.providerId)}
            >
              {groupedConnections.map(({ providerId, connections: conns }) => {
                const preset = PROVIDER_PRESETS[providerId];
                const activeCount = conns.filter((c) => c.id === activeConnectionId).length;

                return (
                  <AccordionItem key={providerId} value={providerId}>
                    <AccordionHeader>
                      <div className={styles.accordionHeader}>
                        <Text className={styles.providerLabel}>
                          {preset?.label || providerId}
                        </Text>
                        <Badge
                          appearance="filled"
                          color={activeCount > 0 ? 'brand' : 'informative'}
                          size="small"
                          className={styles.countBadge}
                        >
                          {conns.length}
                        </Badge>
                      </div>
                    </AccordionHeader>
                    <AccordionPanel className={styles.panel}>
                      {conns.map((conn) => (
                        <ConnectionCard
                          key={conn.id}
                          connection={conn}
                          isActive={conn.id === activeConnectionId}
                          onActivate={activateConnection}
                          onEdit={handleEditConnection}
                          onDelete={handleDeleteConnection}
                        />
                      ))}
                    </AccordionPanel>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </>
      )}

      <AddConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveConnection}
        editingConnection={editingConnection}
      />
    </div>
  );
}
