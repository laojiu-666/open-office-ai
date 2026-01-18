/**
 * 选区获取内容测试区块
 */

import React, { useState } from 'react';
import { makeStyles, Button, Spinner, Badge, tokens } from '@fluentui/react-components';
import { CursorHoverRegular } from '@fluentui/react-icons';
import { TestSectionCard } from './TestSectionCard';
import { PowerPointTestRunner } from '@adapters/powerpoint/test-runner';
import type { TestSectionProps } from '../types';

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  badge: {
    marginBottom: '8px',
  },
  resultArea: {
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '11px',
    minHeight: '80px',
    maxHeight: '200px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground1,
  },
  shapeItem: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    '&:last-child': {
      borderBottom: 'none',
      marginBottom: 0,
      paddingBottom: 0,
    },
  },
  shapeHeader: {
    fontWeight: 600,
    marginBottom: '4px',
    color: tokens.colorBrandForeground1,
  },
  shapeDetail: {
    marginLeft: '12px',
    lineHeight: '1.6',
  },
});

interface SelectedShapeInfo {
  id: string;
  type: string;
  hasText: boolean;
  text?: string;
}

export function SelectionInfoSection({ onAddLog, disabled }: TestSectionProps) {
  const styles = useStyles();
  const [loading, setLoading] = useState(false);
  const [shapes, setShapes] = useState<SelectedShapeInfo[]>([]);

  const handleReadSelection = async () => {
    setLoading(true);
    onAddLog('info', '读取当前选区...');
    try {
      const result = await PowerPointTestRunner.getSelectedShapes();

      if (result.success) {
        const shapesData = (result.data as SelectedShapeInfo[]) || [];
        setShapes(shapesData);

        if (shapesData.length === 0) {
          onAddLog('info', '当前没有选中任何形状');
        } else {
          onAddLog('success', `读取选区成功: ${shapesData.length} 个形状`);
        }
      } else {
        onAddLog('error', `读取失败: ${result.error}`);
        setShapes([]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '未知错误';
      onAddLog('error', `异常: ${msg}`);
      setShapes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TestSectionCard
      title="选区获取内容"
      actions={
        <Button
          size="small"
          appearance="primary"
          icon={loading ? <Spinner size="tiny" /> : <CursorHoverRegular />}
          onClick={handleReadSelection}
          disabled={disabled || loading}
        >
          读取选区
        </Button>
      }
    >
      <div className={styles.content}>
        {shapes.length > 0 && (
          <div className={styles.badge}>
            <Badge appearance="filled" color="brand">
              {shapes.length} 个选中形状
            </Badge>
          </div>
        )}

        <div className={styles.resultArea}>
          {shapes.length === 0 ? (
            <span style={{ color: tokens.colorNeutralForeground3 }}>
              {loading ? '加载中...' : '请先选中形状，然后点击"读取选区"'}
            </span>
          ) : (
            shapes.map((shape, index) => (
              <div key={shape.id} className={styles.shapeItem}>
                <div className={styles.shapeHeader}>Shape {index + 1}: {shape.type}</div>
                <div className={styles.shapeDetail}>
                  <div>ID: {shape.id}</div>
                  {shape.hasText && <div>Text: "{shape.text}"</div>}
                  {!shape.hasText && <div>Text: (无文本)</div>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </TestSectionCard>
  );
}
