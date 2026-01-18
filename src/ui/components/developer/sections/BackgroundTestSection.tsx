/**
 * 背景测试区块
 */

import React, { useState, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Label,
  Button,
  Spinner,
  Slider,
} from '@fluentui/react-components';
import { ImageMultipleRegular, ArrowUploadRegular } from '@fluentui/react-icons';
import { TestSectionCard } from './TestSectionCard';
import { PowerPointTestRunner } from '@adapters/powerpoint/test-runner';
import type { TestSectionProps } from '../types';

const useStyles = makeStyles({
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: '1 1 auto',
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

interface BackgroundConfig {
  imageData: string;
  transparency: number;
}

const DEFAULT_CONFIG: BackgroundConfig = {
  imageData: '',
  transparency: 0,
};

export function BackgroundTestSection({ onAddLog, disabled }: TestSectionProps) {
  const styles = useStyles();
  const [config, setConfig] = useState<BackgroundConfig>(DEFAULT_CONFIG);
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
    onAddLog('info', '开始设置背景...');

    try {
      const result = await PowerPointTestRunner.setBackground({
        imageData: config.imageData,
        transparency: config.transparency,
      });

      if (result.success) {
        onAddLog('success', `背景设置成功，方法: ${result.method}`, {
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

  const updateConfig = <K extends keyof BackgroundConfig>(key: K, value: BackgroundConfig[K]) => {
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
