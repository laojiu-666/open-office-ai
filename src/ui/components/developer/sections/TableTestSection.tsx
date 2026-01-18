/**
 * 表格插入测试区块
 */

import React, { useState } from 'react';
import { makeStyles, Button, Spinner, Label, SpinButton, tokens } from '@fluentui/react-components';
import { TableAddRegular } from '@fluentui/react-icons';
import { TestSectionCard } from './TestSectionCard';
import { GeometryInputs } from './GeometryInputs';
import { PowerPointTestRunner } from '@adapters/powerpoint/test-runner';
import type { TestSectionProps } from '../types';
import type { TableTestOptions } from '@adapters/powerpoint/test-runner';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap',
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
});

export function TableTestSection({ onAddLog, disabled }: TestSectionProps) {
  const styles = useStyles();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    rows: 3,
    columns: 4,
    x: 50,
    y: 100,
    width: 800,
    height: 200,
  });

  const handleRun = async () => {
    setLoading(true);
    onAddLog('info', `插入表格 (${config.rows}x${config.columns})...`);
    try {
      const options: TableTestOptions = {
        rows: config.rows,
        columns: config.columns,
        x: config.x,
        y: config.y,
        width: config.width,
        height: config.height,
      };

      const result = await PowerPointTestRunner.insertTable(options);

      if (result.success) {
        onAddLog('success', `表格插入成功`, { shapeId: result.shapeId });
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
      title="表格插入"
      actions={
        <Button
          appearance="primary"
          size="small"
          icon={loading ? <Spinner size="tiny" /> : <TableAddRegular />}
          onClick={handleRun}
          disabled={disabled || loading}
        >
          插入表格
        </Button>
      }
    >
      {/* 行列配置 */}
      <div className={styles.row}>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>行数</Label>
          <SpinButton
            value={config.rows}
            onChange={(_, data) => updateConfig('rows', data.value ?? 1)}
            min={1}
            max={20}
            disabled={disabled || loading}
          />
        </div>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>列数</Label>
          <SpinButton
            value={config.columns}
            onChange={(_, data) => updateConfig('columns', data.value ?? 1)}
            min={1}
            max={20}
            disabled={disabled || loading}
          />
        </div>
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
    </TestSectionCard>
  );
}
