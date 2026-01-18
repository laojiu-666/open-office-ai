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
  Switch,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Add16Regular, TextDescription20Regular, Image20Regular } from '@fluentui/react-icons';
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
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    marginTop: '8px',
  },
  icon: {
    verticalAlign: 'text-bottom',
    marginRight: '4px',
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

  // 能力配置状态
  const [capabilities, setCapabilities] = useState({
    text: true,
    image: false,
  });
  const [capabilityModels, setCapabilityModels] = useState({
    text: '',
    image: '',
  });

  // 当编辑连接或打开对话框时，初始化表单
  useEffect(() => {
    if (editingConnection) {
      setName(editingConnection.name);
      setProviderId(editingConnection.providerId);
      setApiKey(editingConnection.apiKey);
      setBaseUrl(editingConnection.baseUrl);
      setModel(editingConnection.model);
      setImageModel(editingConnection.imageModel || '');

      // 初始化能力配置
      const caps = editingConnection.capabilities;
      setCapabilities({
        text: true,
        image: !!caps?.image,
      });
      setCapabilityModels({
        text: caps?.text?.model || editingConnection.model,
        image: caps?.image?.model || editingConnection.imageModel || '',
      });
    } else if (open) {
      // 新建时使用默认值
      const preset = PROVIDER_PRESETS['openai'];
      setName('');
      setProviderId('openai');
      setApiKey('');
      setBaseUrl(preset.defaultBaseUrl);
      setModel(preset.defaultModel);
      setImageModel(preset.defaultImageModel || '');
      setCapabilities({ text: true, image: !!preset.defaultImageModel });
      setCapabilityModels({ text: '', image: preset.defaultImageModel || '' });
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
    const textModel = capabilityModels.text || model;
    const connection: Omit<AIConnection, 'id' | 'createdAt'> = {
      name: name || `${PROVIDER_PRESETS[providerId]?.label || providerId} 连接`,
      providerId,
      apiKey,
      baseUrl,
      model: textModel,
      // 构建 capabilities 对象
      capabilities: {
        text: { model: textModel },
        ...(capabilities.image && capabilityModels.image.trim() && {
          image: { model: capabilityModels.image.trim() }
        }),
      },
      // 向后兼容
      ...(capabilities.image && capabilityModels.image.trim() && {
        imageModel: capabilityModels.image.trim()
      }),
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
            {editingConnection ? '编辑供应商配置' : '添加供应商配置'}
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

              {/* 配置名称 */}
              <div className={styles.field}>
                <Label className={styles.label}>配置名称</Label>
                <Input
                  className={styles.input}
                  value={name}
                  onChange={(_, data) => setName(data.value)}
                  placeholder={`${currentPreset?.label || ''} 配置`}
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

              {/* 能力配置区域 */}
              <div className={styles.sectionTitle}>模型能力</div>

              {/* 文本生成（默认启用） */}
              <div className={styles.field}>
                <Label className={styles.label}>
                  <TextDescription20Regular className={styles.icon} />
                  文字生成
                </Label>
                <Input
                  className={styles.input}
                  value={capabilityModels.text || model}
                  onChange={(_, data) => setCapabilityModels({ ...capabilityModels, text: data.value })}
                  placeholder={currentPreset?.defaultModel}
                />
              </div>

              {/* 图片生成（默认启用） */}
              <div className={styles.field}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Switch
                    checked={capabilities.image}
                    onChange={(_, data) => setCapabilities({ ...capabilities, image: data.checked })}
                  />
                  <Label className={styles.label}>
                    <Image20Regular className={styles.icon} />
                    图片生成
                  </Label>
                </div>
                {capabilities.image && (
                  <Input
                    className={styles.input}
                    value={capabilityModels.image}
                    onChange={(_, data) => setCapabilityModels({ ...capabilityModels, image: data.value })}
                    placeholder={currentPreset?.defaultImageModel || 'dall-e-3'}
                  />
                )}
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
      添加供应商
    </Button>
  );
}
