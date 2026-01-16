/**
 * AI 连接管理子页面
 */

import React from 'react';
import { makeStyles, tokens, Button, Text } from '@fluentui/react-components';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';
import { ConnectionManager } from '../connections';
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
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: layoutDimensions.cardBorderRadius,
    padding: '16px',
    boxShadow: shadows.card,
  },
});

export function ConnectionsPage() {
  const styles = useStyles();
  const setSettingsPage = useAppStore((state) => state.setSettingsPage);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          icon={<ArrowLeft24Regular />}
          className={styles.backButton}
          onClick={() => setSettingsPage('main')}
        />
        <Text className={styles.title}>AI 连接</Text>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <ConnectionManager />
        </div>
      </div>
    </div>
  );
}
