/**
 * 幻灯片信息测试区块
 */

import React, { useState, useEffect } from 'react';
import { makeStyles, Button, Spinner, Badge, tokens } from '@fluentui/react-components';
import { InfoRegular } from '@fluentui/react-icons';
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

interface BackgroundInfo {
  isMasterBackgroundFollowed: boolean;
  hasCustomBackground: boolean;
}

interface SlideData {
  shapes: SelectedShapeInfo[];
  background: BackgroundInfo | null;
  shapeCount: number;
}

export function SelectionTestSection({ onAddLog, disabled }: TestSectionProps) {
  const styles = useStyles();
  const [loading, setLoading] = useState(false);
  const [shapes, setShapes] = useState<SelectedShapeInfo[]>([]);
  const [background, setBackground] = useState<BackgroundInfo | null>(null);

  const handleReadSlide = async () => {
    setLoading(true);
    onAddLog('info', '读取当前幻灯片所有形状...');
    try {
      const result = await PowerPointTestRunner.getAllShapes();

      if (result.success) {
        const slideData = result.data as SlideData;
        const shapesData = slideData?.shapes || [];
        const backgroundData = slideData?.background || null;

        setShapes(shapesData);
        setBackground(backgroundData);

        if (shapesData.length === 0 && !backgroundData?.hasCustomBackground) {
          onAddLog('info', '当前幻灯片没有任何形状和自定义背景');
        } else {
          const parts = [];
          if (shapesData.length > 0) parts.push(`${shapesData.length} 个形状`);
          if (backgroundData?.hasCustomBackground) parts.push('自定义背景');
          onAddLog('success', `读取成功: ${parts.join(', ')}`);
        }
      } else {
        onAddLog('error', `读取失败: ${result.error}`);
        setShapes([]);
        setBackground(null);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '未知错误';
      onAddLog('error', `异常: ${msg}`);
      setShapes([]);
      setBackground(null);
    } finally {
      setLoading(false);
    }
  };

  // 自动加载
  useEffect(() => {
    handleReadSlide();
  }, []);

  return (
    <TestSectionCard
      title="幻灯片信息"
      actions={
        <Button
          size="small"
          appearance="secondary"
          icon={loading ? <Spinner size="tiny" /> : <InfoRegular />}
          onClick={handleReadSlide}
          disabled={disabled || loading}
        >
          刷新
        </Button>
      }
    >
      <div className={styles.content}>
        {(shapes.length > 0 || background?.hasCustomBackground) && (
          <div className={styles.badge}>
            {shapes.length > 0 && (
              <Badge appearance="filled" color="brand">
                {shapes.length} 个形状
              </Badge>
            )}
            {background?.hasCustomBackground && (
              <Badge appearance="filled" color="success" style={{ marginLeft: '8px' }}>
                自定义背景
              </Badge>
            )}
          </div>
        )}

        <div className={styles.resultArea}>
          {shapes.length === 0 && !background?.hasCustomBackground ? (
            <span style={{ color: tokens.colorNeutralForeground3 }}>
              {loading ? '加载中...' : '当前幻灯片没有形状和自定义背景'}
            </span>
          ) : (
            <>
              {background?.hasCustomBackground && (
                <div className={styles.shapeItem}>
                  <div className={styles.shapeHeader}>背景 (Background)</div>
                  <div className={styles.shapeDetail}>
                    <div>类型: 自定义背景</div>
                    <div>使用母版: {background.isMasterBackgroundFollowed ? '是' : '否'}</div>
                  </div>
                </div>
              )}
              {shapes.map((shape, index) => (
                <div key={shape.id} className={styles.shapeItem}>
                  <div className={styles.shapeHeader}>Shape {index + 1}: {shape.type}</div>
                  <div className={styles.shapeDetail}>
                    <div>ID: {shape.id}</div>
                    {shape.hasText && <div>Text: "{shape.text}"</div>}
                    {!shape.hasText && <div>Text: (无文本)</div>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </TestSectionCard>
  );
}
