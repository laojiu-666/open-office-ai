/**
 * 几何形状插入测试区块
 */

import React, { useState } from 'react';
import {
  makeStyles,
  Button,
  Spinner,
  Dropdown,
  Option,
  Label,
  Input,
  tokens,
} from '@fluentui/react-components';
import { ShapesRegular } from '@fluentui/react-icons';
import { TestSectionCard } from './TestSectionCard';
import { GeometryInputs } from './GeometryInputs';
import { PowerPointTestRunner } from '@adapters/powerpoint/test-runner';
import type { TestSectionProps } from '../types';
import type { ShapeTestOptions } from '@adapters/powerpoint/test-runner';

const useStyles = makeStyles({
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  row: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  colorField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '120px',
  },
  colorInputWrapper: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  colorPreview: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
  },
  label: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
});

type ShapeType = 'rectangle' | 'ellipse' | 'triangle' | 'line';

export function ShapeTestSection({ onAddLog, disabled }: TestSectionProps) {
  const styles = useStyles();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    shapeType: 'rectangle' as ShapeType,
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    fillColor: '#4F6BED',
    lineColor: '#000000',
    lineWeight: 1,
  });

  const handleRun = async () => {
    setLoading(true);
    onAddLog('info', `插入形状: ${config.shapeType}...`);
    try {
      const options: ShapeTestOptions = {
        shapeType: config.shapeType,
        x: config.x,
        y: config.y,
        width: config.width,
        height: config.height,
        fillColor: config.fillColor,
        lineColor: config.lineColor,
        lineWeight: config.lineWeight,
      };

      const result = await PowerPointTestRunner.insertShape(options);

      if (result.success) {
        onAddLog('success', `形状插入成功`, { shapeId: result.shapeId });
      } else {
        onAddLog('error', `插入失败: ${result.error}`);
      }
    } catch (error) {
      onAddLog('error', `异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <TestSectionCard
      title="形状插入"
      actions={
        <Button
          appearance="primary"
          size="small"
          icon={loading ? <Spinner size="tiny" /> : <ShapesRegular />}
          onClick={handleRun}
          disabled={disabled || loading}
        >
          插入形状
        </Button>
      }
    >
      {/* 形状类型 */}
      <div className={styles.field}>
        <Label className={styles.label}>形状类型</Label>
        <Dropdown
          value={config.shapeType}
          selectedOptions={[config.shapeType]}
          onOptionSelect={(_, data) => updateConfig('shapeType', data.optionValue as ShapeType)}
          disabled={disabled || loading}
        >
          <Option value="rectangle">矩形 (Rectangle)</Option>
          <Option value="ellipse">圆形 (Ellipse)</Option>
          <Option value="triangle">三角形 (Triangle)</Option>
          <Option value="line">直线 (Line)</Option>
        </Dropdown>
      </div>

      {/* 位置和尺寸 */}
      <GeometryInputs
        x={config.x}
        y={config.y}
        width={config.width}
        height={config.height}
        onChange={(k, v) => updateConfig(k, v)}
        disabled={disabled || loading}
      />

      {/* 颜色设置 */}
      <div className={styles.row}>
        <div className={styles.colorField}>
          <Label className={styles.label}>填充颜色</Label>
          <div className={styles.colorInputWrapper}>
            <div
              className={styles.colorPreview}
              style={{ backgroundColor: config.fillColor }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = config.fillColor;
                input.onchange = (e) => updateConfig('fillColor', (e.target as HTMLInputElement).value);
                input.click();
              }}
              title="点击选择颜色"
            />
            <Input
              value={config.fillColor}
              onChange={(_, data) => updateConfig('fillColor', data.value)}
              size="small"
              disabled={disabled || loading}
            />
          </div>
        </div>

        <div className={styles.colorField}>
          <Label className={styles.label}>边框颜色</Label>
          <div className={styles.colorInputWrapper}>
            <div
              className={styles.colorPreview}
              style={{ backgroundColor: config.lineColor }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = config.lineColor;
                input.onchange = (e) => updateConfig('lineColor', (e.target as HTMLInputElement).value);
                input.click();
              }}
              title="点击选择颜色"
            />
            <Input
              value={config.lineColor}
              onChange={(_, data) => updateConfig('lineColor', data.value)}
              size="small"
              disabled={disabled || loading}
            />
          </div>
        </div>
      </div>
    </TestSectionCard>
  );
}
