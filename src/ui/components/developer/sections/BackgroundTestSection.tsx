/**
 * 背景测试区块
 */

import React, { useState, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Label,
  Button,
  SpinButton,
  Spinner,
  Dropdown,
  Option,
  Slider,
} from '@fluentui/react-components';
import { ImageMultipleRegular, ArrowUploadRegular } from '@fluentui/react-icons';
import { TestSectionCard } from './TestSectionCard';
import { PowerPointTestRunner } from '@adapters/powerpoint/test-runner';
import type { TestSectionProps, BackgroundTestConfig } from '../types';
import { DEFAULT_BACKGROUND_CONFIG } from '../types';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: '1 1 auto',
  },
  fieldSmall: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '100px',
  },
  label: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
  uploadArea: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  preview: {
    width: '60px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  hiddenInput: {
    display: 'none',
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sliderValue: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    minWidth: '40px',
  },
});

export function BackgroundTestSection({ onAddLog, disabled }: TestSectionProps) {
  const styles = useStyles();
  const [config, setConfig] = useState<BackgroundTestConfig>(DEFAULT_BACKGROUND_CONFIG);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onAddLog('error', '请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setConfig((prev) => ({ ...prev, imageData: base64 }));
      onAddLog('info', `已加载背景图片: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.onerror = () => {
      onAddLog('error', '读取图片失败');
    };
    reader.readAsDataURL(file);
  };

  const handleRun = async () => {
    if (!config.imageData) {
      onAddLog('warning', '请先选择背景图片');
      return;
    }

    setLoading(true);
    onAddLog('info', `开始设置背景 (模式: ${config.mode === 'tile' ? '平铺' : '拉伸'})...`);

    try {
      const result = await PowerPointTestRunner.setBackground({
        imageData: config.imageData,
        mode: config.mode,
        tileWidth: config.tileWidth,
        tileHeight: config.tileHeight,
        transparency: config.transparency,
      });

      if (result.success) {
        onAddLog('success', `背景设置成功，方法: ${result.method}`, {
          mode: config.mode,
          transparency: config.transparency,
        });
      } else {
        onAddLog('error', `背景设置失败: ${result.error}`);
      }
    } catch (error) {
      onAddLog('error', `异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = <K extends keyof BackgroundTestConfig>(key: K, value: BackgroundTestConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <TestSectionCard
      title="背景设置测试"
      actions={
        <Button
          appearance="primary"
          size="small"
          icon={loading ? <Spinner size="tiny" /> : <ImageMultipleRegular />}
          onClick={handleRun}
          disabled={disabled || loading || !config.imageData}
        >
          {loading ? '执行中...' : '设置背景'}
        </Button>
      }
    >
      {/* 图片选择 */}
      <div className={styles.field}>
        <Label className={styles.label}>选择背景图片</Label>
        <div className={styles.uploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className={styles.hiddenInput}
          />
          <Button
            appearance="secondary"
            size="small"
            icon={<ArrowUploadRegular />}
            onClick={() => fileInputRef.current?.click()}
          >
            选择文件
          </Button>
          {config.imageData && (
            <img src={config.imageData} alt="预览" className={styles.preview} />
          )}
        </div>
      </div>

      {/* 模式选择 */}
      <div className={styles.row}>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>填充模式</Label>
          <Dropdown
            value={config.mode === 'tile' ? '平铺' : '拉伸'}
            onOptionSelect={(_, data) => {
              updateConfig('mode', data.optionValue as 'stretch' | 'tile');
            }}
          >
            <Option value="stretch">拉伸</Option>
            <Option value="tile">平铺</Option>
          </Dropdown>
        </div>

        {config.mode === 'tile' && (
          <>
            <div className={styles.fieldSmall}>
              <Label className={styles.label}>平铺宽度</Label>
              <SpinButton
                value={config.tileWidth}
                onChange={(_, data) => updateConfig('tileWidth', data.value ?? 100)}
                min={10}
                max={500}
                step={10}
              />
            </div>
            <div className={styles.fieldSmall}>
              <Label className={styles.label}>平铺高度</Label>
              <SpinButton
                value={config.tileHeight}
                onChange={(_, data) => updateConfig('tileHeight', data.value ?? 100)}
                min={10}
                max={500}
                step={10}
              />
            </div>
          </>
        )}
      </div>

      {/* 透明度 */}
      <div className={styles.field}>
        <Label className={styles.label}>透明度</Label>
        <div className={styles.sliderContainer}>
          <Slider
            value={config.transparency * 100}
            onChange={(_, data) => updateConfig('transparency', data.value / 100)}
            min={0}
            max={100}
            step={5}
            style={{ flex: 1 }}
          />
          <span className={styles.sliderValue}>{Math.round(config.transparency * 100)}%</span>
        </div>
      </div>
    </TestSectionCard>
  );
}

export default BackgroundTestSection;
