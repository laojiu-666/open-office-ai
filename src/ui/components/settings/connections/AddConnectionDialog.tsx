/**
 * 添加连接对话框
 * 支持选择供应商预设，自动填充默认配置
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Label,
  Select,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Add16Regular } from '@fluentui/react-icons';
import type { LLMProviderId, AIConnection } from '@/types';
import { PROVIDER_PRESETS, getProviderOptions } from '@core/llm/presets';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontWeight: 500,
    fontSize: '13px',
  },
  input: {
    width: '100%',
  },
  hint: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
  },
  providerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: '12px',
    marginTop: '4px',
  },
});

interface AddConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (connection: Omit<AIConnection, 'id' | 'createdAt'>) => void;
  editingConnection?: AIConnection | null;
}

export function AddConnectionDialog({
  open,
  onOpenChange,
  onSave,
  editingConnection,
}: AddConnectionDialogProps) {
  const styles = useStyles();
  const providerOptions = getProviderOptions();

  const [name, setName] = useState('');
  const [providerId, setProviderId] = useState<LLMProviderId>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [imageModel, setImageModel] = useState('');

  // 当编辑连接或打开对话框时，初始化表单
  useEffect(() => {
    if (editingConnection) {
      setName(editingConnection.name);
      setProviderId(editingConnection.providerId);
      setApiKey(editingConnection.apiKey);
      setBaseUrl(editingConnection.baseUrl);
      setModel(editingConnection.model);
      setImageModel(editingConnection.imageModel || '');
    } else if (open) {
      // 新建时使用默认值
      const preset = PROVIDER_PRESETS['openai'];
      setName('');
      setProviderId('openai');
      setApiKey('');
      setBaseUrl(preset.defaultBaseUrl);
      setModel(preset.defaultModel);
      setImageModel('');
    }
  }, [editingConnection, open]);

  // 当供应商改变时，更新默认值
  const handleProviderChange = (newProviderId: LLMProviderId) => {
    setProviderId(newProviderId);
    const preset = PROVIDER_PRESETS[newProviderId];
    if (preset) {
      setBaseUrl(preset.defaultBaseUrl);
      setModel(preset.defaultModel);
      if (!name || name === `${PROVIDER_PRESETS[providerId]?.label} 连接`) {
        setName(`${preset.label} 连接`);
      }
    }
  };

  const handleSave = () => {
    const connection: Omit<AIConnection, 'id' | 'createdAt'> = {
      name: name || `${PROVIDER_PRESETS[providerId]?.label || providerId} 连接`,
      providerId,
      apiKey,
      baseUrl,
      model,
      ...(imageModel.trim() && { imageModel: imageModel.trim() }),
    };
    onSave(connection);
    onOpenChange(false);
  };

  const isValid = apiKey.trim().length > 0;
  const currentPreset = PROVIDER_PRESETS[providerId];

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            {editingConnection ? '编辑连接' : '添加 AI 连接'}
          </DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              {/* 供应商选择 */}
              <div className={styles.field}>
                <Label className={styles.label}>供应商</Label>
                <Select
                  className={styles.input}
                  value={providerId}
                  onChange={(_, data) =>
                    handleProviderChange(data.value as LLMProviderId)
                  }
                >
                  {providerOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                {currentPreset?.isOpenAICompatible && (
                  <span className={styles.providerBadge}>
                    OpenAI 兼容
                  </span>
                )}
              </div>

              {/* 连接名称 */}
              <div className={styles.field}>
                <Label className={styles.label}>连接名称</Label>
                <Input
                  className={styles.input}
                  value={name}
                  onChange={(_, data) => setName(data.value)}
                  placeholder={`${currentPreset?.label || ''} 连接`}
                />
              </div>

              {/* API Key */}
              <div className={styles.field}>
                <Label className={styles.label}>API Key *</Label>
                <Input
                  className={styles.input}
                  type="password"
                  value={apiKey}
                  onChange={(_, data) => setApiKey(data.value)}
                  placeholder="sk-..."
                />
              </div>

              {/* Base URL */}
              <div className={styles.field}>
                <Label className={styles.label}>Base URL</Label>
                <Input
                  className={styles.input}
                  value={baseUrl}
                  onChange={(_, data) => setBaseUrl(data.value)}
                  placeholder={currentPreset?.defaultBaseUrl}
                />
                <span className={styles.hint}>
                  只需填写基础 URL，无需添加 /v1
                </span>
              </div>

              {/* 模型 */}
              <div className={styles.field}>
                <Label className={styles.label}>文字模型</Label>
                <Input
                  className={styles.input}
                  value={model}
                  onChange={(_, data) => setModel(data.value)}
                  placeholder={currentPreset?.defaultModel}
                />
                <span className={styles.hint}>
                  用于聊天和文字生成
                </span>
              </div>

              {/* 图片模型 */}
              <div className={styles.field}>
                <Label className={styles.label}>图片模型（可选）</Label>
                <Input
                  className={styles.input}
                  value={imageModel}
                  onChange={(_, data) => setImageModel(data.value)}
                  placeholder="dall-e-3"
                />
                <span className={styles.hint}>
                  用于生成图片，留空则不支持生图
                </span>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">取消</Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={handleSave} disabled={!isValid}>
              {editingConnection ? '保存' : '添加'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

// 触发按钮组件
export function AddConnectionButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      appearance="primary"
      icon={<Add16Regular />}
      onClick={onClick}
    >
      添加连接
    </Button>
  );
}
