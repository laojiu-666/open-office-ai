/**
 * 几何位置/尺寸输入组件
 * 复用的 X/Y/Width/Height 输入控件
 */

import React from 'react';
import { makeStyles, Label, SpinButton, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    gap: '12px',
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

export interface GeometryInputsProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onChange: (key: 'x' | 'y' | 'width' | 'height', value: number) => void;
  disabled?: boolean;
}

export function GeometryInputs({ x, y, width, height, onChange, disabled }: GeometryInputsProps) {
  const styles = useStyles();

  return (
    <div className={styles.row}>
      <div className={styles.fieldSmall}>
        <Label className={styles.label}>X 坐标</Label>
        <SpinButton
          value={x}
          onChange={(_, data) => onChange('x', data.value ?? 0)}
          min={0}
          max={960}
          step={10}
          disabled={disabled}
        />
      </div>
      <div className={styles.fieldSmall}>
        <Label className={styles.label}>Y 坐标</Label>
        <SpinButton
          value={y}
          onChange={(_, data) => onChange('y', data.value ?? 0)}
          min={0}
          max={540}
          step={10}
          disabled={disabled}
        />
      </div>
      <div className={styles.fieldSmall}>
        <Label className={styles.label}>宽度</Label>
        <SpinButton
          value={width}
          onChange={(_, data) => onChange('width', data.value ?? 100)}
          min={10}
          max={960}
          step={10}
          disabled={disabled}
        />
      </div>
      <div className={styles.fieldSmall}>
        <Label className={styles.label}>高度</Label>
        <SpinButton
          value={height}
          onChange={(_, data) => onChange('height', data.value ?? 100)}
          min={10}
          max={540}
          step={10}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
