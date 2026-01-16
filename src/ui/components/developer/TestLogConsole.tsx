/**
 * 测试日志控制台组件
 */

import React from 'react';
import { makeStyles, tokens, Button } from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import type { TestLogEntry } from './types';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  title: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
  },
  logArea: {
    height: '200px',
    overflowY: 'auto',
    padding: '8px',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '11px',
    backgroundColor: tokens.colorNeutralBackgroundInverted,
    color: tokens.colorNeutralForegroundInverted,
  },
  logEntry: {
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  timestamp: {
    color: tokens.colorNeutralForeground4,
    marginRight: '8px',
  },
  success: {
    color: '#4ade80',
  },
  error: {
    color: '#f87171',
  },
  warning: {
    color: '#fbbf24',
  },
  info: {
    color: '#60a5fa',
  },
  empty: {
    color: tokens.colorNeutralForeground4,
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '20px',
  },
});

interface TestLogConsoleProps {
  logs: TestLogEntry[];
  onClear: () => void;
}

export function TestLogConsole({ logs, onClear }: TestLogConsoleProps) {
  const styles = useStyles();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTypeIcon = (type: TestLogEntry['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getTypeClass = (type: TestLogEntry['type']) => {
    switch (type) {
      case 'success':
        return styles.success;
      case 'error':
        return styles.error;
      case 'warning':
        return styles.warning;
      case 'info':
      default:
        return styles.info;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>测试日志</span>
        <Button
          appearance="subtle"
          size="small"
          icon={<DeleteRegular />}
          onClick={onClear}
          disabled={logs.length === 0}
        >
          清除
        </Button>
      </div>
      <div className={styles.logArea} role="log" aria-live="polite">
        {logs.length === 0 ? (
          <div className={styles.empty}>暂无日志，执行测试后将在此显示结果</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={styles.logEntry}>
              <span className={styles.timestamp}>[{formatTime(log.timestamp)}]</span>
              <span className={getTypeClass(log.type)}>
                {getTypeIcon(log.type)} {log.message}
              </span>
              {log.details !== undefined && (
                <pre style={{ marginLeft: '24px', opacity: 0.7, margin: '4px 0 4px 24px', whiteSpace: 'pre-wrap' }}>
                  {typeof log.details === 'string'
                    ? log.details
                    : JSON.stringify(log.details as object, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TestLogConsole;
