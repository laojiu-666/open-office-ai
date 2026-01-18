import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Input,
  Badge,
} from '@fluentui/react-components';
import {
  DeleteRegular,
  ArrowDownloadRegular,
  SearchRegular,
  TimerRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';
import { TestSectionCard } from './TestSectionCard';

const useStyles = makeStyles({
  controls: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  searchInput: {
    flexGrow: 1,
  },
  tableContainer: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerRow: {
    display: 'flex',
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
  },
  row: {
    display: 'flex',
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '12px',
    alignItems: 'center',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':last-child': {
      borderBottom: 'none',
    },
  },
  colTime: { width: '80px', flexShrink: 0 },
  colTool: { width: '120px', flexShrink: 0, fontWeight: 600 },
  colArgs: {
    flex: 1,
    minWidth: 0,
    fontFamily: tokens.fontFamilyMonospace,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  colDuration: { width: '80px', flexShrink: 0, textAlign: 'right' },
  colStatus: { width: '80px', flexShrink: 0, display: 'flex', justifyContent: 'center' },

  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
  },
});

export function ToolHistorySection() {
  const styles = useStyles();
  const { toolHistory, clearToolHistory } = useAppStore();
  const [filter, setFilter] = useState('');

  const filteredHistory = toolHistory.filter(
    log =>
      log.toolName.toLowerCase().includes(filter.toLowerCase()) ||
      JSON.stringify(log.arguments).includes(filter)
  );

  const handleExport = () => {
    const dataStr = JSON.stringify(toolHistory, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <TestSectionCard title="工具调用历史">
      <div className={styles.controls}>
        <Input
          className={styles.searchInput}
          placeholder="搜索工具名或参数..."
          contentBefore={<SearchRegular />}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="small"
        />
        <Button
          icon={<ArrowDownloadRegular />}
          size="small"
          onClick={handleExport}
          disabled={toolHistory.length === 0}
        >
          导出
        </Button>
        <Button
          icon={<DeleteRegular />}
          size="small"
          onClick={clearToolHistory}
          disabled={toolHistory.length === 0}
        >
          清空
        </Button>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.headerRow}>
          <div className={styles.colTime}>时间</div>
          <div className={styles.colTool}>工具</div>
          <div className={styles.colArgs}>参数</div>
          <div className={styles.colDuration}>耗时</div>
          <div className={styles.colStatus}>状态</div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className={styles.emptyState}>
            {toolHistory.length === 0 ? '暂无调用记录' : '无匹配记录'}
          </div>
        ) : (
          filteredHistory.map((log) => (
            <div key={log.id} className={styles.row}>
              <div className={styles.colTime}>{formatTime(log.timestamp)}</div>
              <div className={styles.colTool} title={log.toolName}>{log.toolName}</div>
              <div className={styles.colArgs} title={JSON.stringify(log.arguments, null, 2)}>
                {JSON.stringify(log.arguments)}
              </div>
              <div className={styles.colDuration}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  <TimerRegular fontSize={12} />
                  {log.durationMs}ms
                </span>
              </div>
              <div className={styles.colStatus}>
                {log.success ? (
                  <Badge
                    color="success"
                    shape="rounded"
                    size="extra-small"
                    icon={<CheckmarkCircleRegular />}
                  >
                    成功
                  </Badge>
                ) : (
                  <Badge
                    color="danger"
                    shape="rounded"
                    size="extra-small"
                    icon={<ErrorCircleRegular />}
                  >
                    失败
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </TestSectionCard>
  );
}
