import React, { useState } from 'react';
import { makeStyles, tokens, Spinner, Button, Tooltip } from '@fluentui/react-components';
import {
  CheckmarkCircle20Regular,
  ErrorCircle20Regular,
  Wrench20Regular,
  ChevronDown20Regular,
  ChevronRight20Regular,
  Copy16Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '8px',
    marginTop: '8px',
    boxShadow: tokens.shadow2,
    width: '100%',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  toolIcon: {
    color: tokens.colorNeutralForeground3,
  },
  title: {
    fontWeight: 600,
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    flexGrow: 1,
  },
  statusIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    color: tokens.colorPaletteGreenForeground1,
  },
  errorIcon: {
    color: tokens.colorPaletteRedForeground1,
  },
  content: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
    backgroundColor: tokens.colorNeutralBackground2,
    padding: '8px',
    borderRadius: '4px',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    maxHeight: '200px',
    overflowY: 'auto',
    position: 'relative',
  },
  errorContent: {
    color: tokens.colorPaletteRedForeground1,
    backgroundColor: tokens.colorPaletteRedBackground1,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
  },
  toggleButton: {
    marginLeft: 'auto',
    minWidth: 'auto',
    padding: '4px',
    height: '24px',
  },
  copyButton: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    padding: '4px',
    minWidth: 'auto',
    height: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
  },
  parsingErrorBox: {
    marginBottom: '8px',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: tokens.colorPaletteRedBackground1,
    color: tokens.colorPaletteRedForeground1,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
  },
});

interface ToolExecutionCardProps {
  toolName: string;
  status: 'pending' | 'success' | 'error';
  result?: any;
  errorMessage?: string;
  parsingError?: string;
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  toolName,
  status,
  result,
  errorMessage,
  parsingError,
}) => {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);

  const renderStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Spinner size="tiny" aria-label="执行中" />;
      case 'success':
        return (
          <div className={`${styles.statusIcon} ${styles.successIcon}`} role="status" aria-label="执行成功">
            <CheckmarkCircle20Regular />
          </div>
        );
      case 'error':
        return (
          <div className={`${styles.statusIcon} ${styles.errorIcon}`} role="status" aria-label="执行失败">
            <ErrorCircle20Regular />
          </div>
        );
    }
  };

  const formatResult = (data: any) => {
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const contentText = status === 'error' ? errorMessage : formatResult(result);
  const hasContent = !!(result || errorMessage);

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contentText) {
      navigator.clipboard.writeText(contentText);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Wrench20Regular className={styles.toolIcon} />
        <span className={styles.title}>执行工具: {toolName}</span>
        {renderStatusIcon()}
        {hasContent && (
          <Button
            appearance="subtle"
            className={styles.toggleButton}
            icon={expanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "收起详情" : "展开详情"}
          />
        )}
      </div>

      {parsingError && (
        <div className={styles.parsingErrorBox}>
          <strong>参数解析错误:</strong> {parsingError}
        </div>
      )}

      {hasContent && expanded && (
        <div className={`${styles.content} ${status === 'error' ? styles.errorContent : ''}`}>
          {contentText}
          <Tooltip content="复制内容" relationship="label">
            <Button
              appearance="subtle"
              className={styles.copyButton}
              icon={<Copy16Regular />}
              onClick={copyToClipboard}
              aria-label="复制"
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
};
