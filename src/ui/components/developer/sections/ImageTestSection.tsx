/**
 * 图片测试区块
 */

import React, { useState, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Input,
  Label,
  Button,
  SpinButton,
  Spinner,
} from '@fluentui/react-components';
import { ImageRegular, ArrowUploadRegular } from '@fluentui/react-icons';
import { TestSectionCard } from './TestSectionCard';
import { PowerPointTestRunner } from '@adapters/powerpoint/test-runner';
import type { TestSectionProps, ImageTestConfig } from '../types';
import { DEFAULT_IMAGE_CONFIG } from '../types';

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
});

export function ImageTestSection({ onAddLog, disabled }: TestSectionProps) {
  const styles = useStyles();
  const [config, setConfig] = useState<ImageTestConfig>(DEFAULT_IMAGE_CONFIG);
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

      // 诊断信息
      const mimeMatch = base64.match(/^data:(image\/[^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';
      const base64Data = base64.split('base64,')[1] || '';
      const sizeKB = (file.size / 1024).toFixed(1);
      const base64Length = base64Data.length;

      onAddLog('info', `已加载图片: ${file.name}`);
      onAddLog('info', `  - 文件大小: ${sizeKB} KB`);
      onAddLog('info', `  - MIME 类型: ${mimeType}`);
      onAddLog('info', `  - Base64 长度: ${base64Length} 字符`);

      // 检查是否有潜在问题
      if (file.size > 5 * 1024 * 1024) {
        onAddLog('warning', '图片文件较大 (>5MB)，可能导致插入失败');
      }

      if (!['image/png', 'image/jpeg', 'image/jpg', 'image/gif'].includes(mimeType)) {
        onAddLog('warning', `不常见的图片格式: ${mimeType}`);
      }
    };
    reader.onerror = () => {
      onAddLog('error', '读取图片失败');
    };
    reader.readAsDataURL(file);
  };

  const handleRun = async () => {
    if (!config.imageData) {
      onAddLog('warning', '请先选择图片');
      return;
    }

    setLoading(true);
    onAddLog('info', '开始插入图片...');

    // 检查 API 支持
    const api18Supported = Office.context.requirements.isSetSupported('PowerPointApi', '1.8');
    if (!api18Supported) {
      onAddLog('error', '❌ 当前 PowerPoint 版本不支持图片插入功能');
      onAddLog('info', '📋 需要 PowerPoint API 1.8+（PowerPoint 2016 或更高版本）');
      onAddLog('info', '💡 建议：升级到 PowerPoint 2016 或 Microsoft 365 订阅版本');
      setLoading(false);
      return;
    }

    try {
      const result = await PowerPointTestRunner.insertImage({
        imageData: config.imageData,
        x: config.x,
        y: config.y,
        width: config.width,
        height: config.height,
      });

      if (result.success) {
        onAddLog('success', `图片插入成功，位置: (${config.x}, ${config.y})，尺寸: ${config.width}x${config.height}`, {
          shapeId: result.shapeId,
        });
      } else {
        onAddLog('error', `图片插入失败: ${result.error}`);
      }
    } catch (error) {
      onAddLog('error', `异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = <K extends keyof ImageTestConfig>(key: K, value: ImageTestConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <TestSectionCard
      title="图片插入测试"
      actions={
        <Button
          appearance="primary"
          size="small"
          icon={loading ? <Spinner size="tiny" /> : <ImageRegular />}
          onClick={handleRun}
          disabled={disabled || loading || !config.imageData}
        >
          {loading ? '执行中...' : '插入图片'}
        </Button>
      }
    >
      {/* 图片选择 */}
      <div className={styles.field}>
        <Label className={styles.label}>选择图片</Label>
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
            min={10}
            max={960}
            step={10}
          />
        </div>
        <div className={styles.fieldSmall}>
          <Label className={styles.label}>高度</Label>
          <SpinButton
            value={config.height}
            onChange={(_, data) => updateConfig('height', data.value ?? 100)}
            min={10}
            max={540}
            step={10}
          />
        </div>
      </div>
    </TestSectionCard>
  );
}

export default ImageTestSection;
