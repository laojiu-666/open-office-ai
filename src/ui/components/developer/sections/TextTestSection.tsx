/**
 * 文字测试区块
 */

import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Input,
  Label,
  Button,
  SpinButton,
  Checkbox,
  Spinner,
} from '@fluentui/react-components';
import { TextTRegular } from '@fluentui/react-icons';
import { TestSectionCard } from './TestSectionCard';
import { PowerPointTestRunner } from '@adapters/powerpoint/test-runner';
import type { TestSectionProps, TextTestConfig } from '../types';
import { DEFAULT_TEXT_CONFIG } from '../types';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: '1 1 auto',
    minWidth: '80px',
  },
  fieldSmall: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '80px',
  },
  label: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
  checkboxRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
});

export function TextTestSection({ onAddLog, disabled }: TestSectionProps) {
  const styles = useStyles();
  const [config, setConfig] = useState<TextTestConfig>(DEFAULT_TEXT_CONFIG);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    onAddLog('info', '开始插入文本...');

    try {
      const result = await PowerPointTestRunner.insertText({
        text: config.text,
        x: config.x,
        y: config.y,
        width: config.width,
        height: config.height,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        color: config.color,
        bold: config.bold,
        italic: config.italic,
        underline: config.underline,
      });

      if (result.success) {
        onAddLog('success', `文本插入成功，位置: (${config.x}, ${config.y})`, {
          shapeId: result.shapeId,
        });
      } else {
        onAddLog('error', `文本插入失败: ${result.error}`);
      }
    } catch (error) {
      onAddLog('error', `异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = <K extends keyof TextTestConfig>(key: K, value: TextTestConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <TestSectionCard
      title="文字插入测试"
      actions={
        <Button
          appearance="primary"
          size="small"
          icon={loading ? <Spinner size="tiny" /> : <TextTRegular />}
          onClick={handleRun}
          disabled={disabled || loading || !config.text}
        >
          {loading ? '执行中...' : '插入文本'}
        </Button>
      }
    >
      {/* 文本内容 */}
      <div className={styles.field}>
        <Label className={styles.label}>文本内容</Label>
        <Input
          value={config.text}
          onChange={(_, data) => updateConfig('text', data.value)}
          placeholder="输入要插入的文本"
        />
      </div>

      {/* 位置和尺寸 */}
      <div className={styles.row}>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>X 坐标</Label>
          <SpinButton
            value={config.x}
            onChange={(_, data) => updateConfig('x', data.value ?? 0)}
            min={0}
            max={960}
            step={10}
          />
        </div>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>Y 坐标</Label>
          <SpinButton
            value={config.y}
            onChange={(_, data) => updateConfig('y', data.value ?? 0)}
            min={0}
            max={540}
            step={10}
          />
        </div>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>宽度</Label>
          <SpinButton
            value={config.width}
            onChange={(_, data) => updateConfig('width', data.value ?? 100)}
            min={50}
            max={960}
            step={10}
          />
        </div>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>高度</Label>
          <SpinButton
            value={config.height}
            onChange={(_, data) => updateConfig('height', data.value ?? 30)}
            min={20}
            max={540}
            step={10}
          />
        </div>
      </div>

      {/* 字体样式 */}
      <div className={styles.row}>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>字号</Label>
          <SpinButton
            value={config.fontSize}
            onChange={(_, data) => updateConfig('fontSize', data.value ?? 12)}
            min={8}
            max={144}
            step={2}
          />
        </div>
        <div className={styles.field}>
          <Label className={styles.label}>字体</Label>
          <Input
            value={config.fontFamily}
            onChange={(_, data) => updateConfig('fontFamily', data.value)}
            placeholder="Calibri"
          />
        </div>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>颜色</Label>
          <input
            type="color"
            value={config.color}
            onChange={(e) => updateConfig('color', e.target.value)}
            style={{ width: '100%', height: '32px', border: 'none', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* 文本样式 */}
      <div className={styles.checkboxRow}>
        <Checkbox
          label="粗体"
          checked={config.bold}
          onChange={(_, data) => updateConfig('bold', !!data.checked)}
        />
        <Checkbox
          label="斜体"
          checked={config.italic}
          onChange={(_, data) => updateConfig('italic', !!data.checked)}
        />
        <Checkbox
          label="下划线"
          checked={config.underline}
          onChange={(_, data) => updateConfig('underline', !!data.checked)}
        />
      </div>
    </TestSectionCard>
  );
}

export default TextTestSection;
