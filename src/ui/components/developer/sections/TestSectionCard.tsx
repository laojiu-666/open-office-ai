/**
 * 测试区块卡片包装组件
 */

import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: tokens.shadow4,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
});

interface TestSectionCardProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function TestSectionCard({ title, children, actions }: TestSectionCardProps) {
  const styles = useStyles();

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {actions}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

export default TestSectionCard;
