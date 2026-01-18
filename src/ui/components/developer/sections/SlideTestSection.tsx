/**
 * 幻灯片操作测试区块
 */

import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  Button,
  Spinner,
  SpinButton,
  Label,
  tokens,
} from '@fluentui/react-components';
import {
  SlideAddRegular,
  DeleteRegular,
  ArrowPreviousRegular,
  ArrowNextRegular,
  NavigationRegular,
  EraserRegular,
} from '@fluentui/react-icons';
import { TestSectionCard } from './TestSectionCard';
import { PowerPointTestRunner } from '@adapters/powerpoint/test-runner';
import type { TestSectionProps } from '../types';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  group: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  label: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
  info: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    fontWeight: 500,
  },
  fieldSmall: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '80px',
  },
});

export function SlideTestSection({ onAddLog, disabled }: TestSectionProps) {
  const styles = useStyles();
  const [loading, setLoading] = useState(false);
  const [slideInfo, setSlideInfo] = useState<{ count: number; current: number } | null>(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const refreshSlideInfo = async () => {
    try {
      const result = await PowerPointTestRunner.getSlideCount();
      if (result.success && result.data) {
        const data = result.data as { slideCount: number; currentIndex: number };
        setSlideInfo({ count: data.slideCount, current: data.currentIndex + 1 });
        setTargetIndex(data.currentIndex);
      }
    } catch (error) {
      // 静默失败
    }
  };

  useEffect(() => {
    refreshSlideInfo();
  }, []);

  const handleAction = async (action: string, method: () => Promise<any>) => {
    setLoading(true);
    onAddLog('info', `${action}...`);
    try {
      const result = await method();
      if (result.success) {
        onAddLog('success', `${action}成功`);
        await refreshSlideInfo();
      } else {
        onAddLog('error', `${action}失败: ${result.error}`);
      }
    } catch (error) {
      onAddLog('error', `异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = async (direction: 'prev' | 'next') => {
    if (!slideInfo) return;

    const newIndex = direction === 'prev' ? slideInfo.current - 2 : slideInfo.current;
    if (newIndex < 0 || newIndex >= slideInfo.count) {
      onAddLog('warning', '已到达边界');
      return;
    }

    await handleAction(
      direction === 'prev' ? '上一页' : '下一页',
      () => PowerPointTestRunner.navigateToSlide(newIndex)
    );
  };

  const handleJumpTo = async () => {
    if (!slideInfo) return;

    if (targetIndex < 0 || targetIndex >= slideInfo.count) {
      onAddLog('warning', `索引超出范围 (0-${slideInfo.count - 1})`);
      return;
    }

    await handleAction('跳转', () => PowerPointTestRunner.navigateToSlide(targetIndex));
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      onAddLog('warning', '再次点击删除按钮以确认删除');
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }

    setDeleteConfirm(false);
    await handleAction('删除幻灯片', () => PowerPointTestRunner.deleteSlide(false));
  };

  const handleClear = async () => {
    await handleAction('清除幻灯片内容', () => PowerPointTestRunner.clearSlide());
  };

  return (
    <TestSectionCard
      title="幻灯片操作"
      actions={
        <Button
          appearance="primary"
          size="small"
          icon={loading ? <Spinner size="tiny" /> : <SlideAddRegular />}
          onClick={() => handleAction('新建幻灯片', () => PowerPointTestRunner.addSlide())}
          disabled={disabled || loading}
        >
          新建幻灯片
        </Button>
      }
    >
      {/* 当前位置信息 */}
      {slideInfo && (
        <div className={styles.info}>
          当前位置: 第 {slideInfo.current} 页 / 共 {slideInfo.count} 页
        </div>
      )}

      {/* 导航控制 */}
      <div className={styles.row}>
        <div className={styles.group}>
          <Button
            icon={<ArrowPreviousRegular />}
            appearance="subtle"
            size="small"
            disabled={disabled || loading || !slideInfo || slideInfo.current <= 1}
            onClick={() => handleNavigate('prev')}
            title="上一页"
          />
          <Button
            icon={<ArrowNextRegular />}
            appearance="subtle"
            size="small"
            disabled={disabled || loading || !slideInfo || slideInfo.current >= slideInfo.count}
            onClick={() => handleNavigate('next')}
            title="下一页"
          />
        </div>

        <div className={styles.group}>
          <div className={styles.fieldSmall}>
            <Label className={styles.label}>跳转到</Label>
            <SpinButton
              value={targetIndex}
              onChange={(_, data) => setTargetIndex(data.value ?? 0)}
              min={0}
              max={slideInfo ? slideInfo.count - 1 : 0}
              disabled={disabled || loading}
            />
          </div>
          <Button
            icon={<NavigationRegular />}
            appearance="secondary"
            size="small"
            onClick={handleJumpTo}
            disabled={disabled || loading || !slideInfo}
          >
            跳转
          </Button>
        </div>

        <Button
          icon={<DeleteRegular />}
          appearance={deleteConfirm ? 'primary' : 'subtle'}
          size="small"
          onClick={handleDelete}
          disabled={disabled || loading || !slideInfo || slideInfo.count <= 1}
        >
          {deleteConfirm ? '确认删除?' : '删除当前幻灯片'}
        </Button>

        <Button
          icon={<EraserRegular />}
          appearance="subtle"
          size="small"
          onClick={handleClear}
          disabled={disabled || loading}
        >
          清除内容
        </Button>
      </div>
    </TestSectionCard>
  );
}
