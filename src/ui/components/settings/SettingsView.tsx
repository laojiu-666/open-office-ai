import { useId } from 'react';
import { makeStyles, tokens, Input, Label, Select, Button, Switch } from '@fluentui/react-components';
import { useAppStore } from '@ui/store/appStore';
import type { LLMProviderId } from '@/types';
import { shadows, layoutDimensions, createTransition, aiEffects } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  container: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'auto',
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: layoutDimensions.cardBorderRadius,
    padding: '16px',
    boxShadow: shadows.card,
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, rgba(0, 120, 212, 0.1), rgba(168, 85, 247, 0.1))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
    ':last-child': {
      marginBottom: 0,
    },
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: tokens.colorNeutralForeground2,
  },
  input: {
    transition: createTransition(['border-color', 'box-shadow'], 'fast'),
    ':focus-within': {
      borderTopColor: tokens.colorBrandStroke1,
      borderRightColor: tokens.colorBrandStroke1,
      borderBottomColor: tokens.colorBrandStroke1,
      borderLeftColor: tokens.colorBrandStroke1,
      boxShadow: aiEffects.brandGlow,
    },
  },
  actions: {
    marginTop: '4px',
  },
  saveButton: {
    width: '100%',
    height: '40px',
    borderRadius: '10px',
    fontWeight: 600,
    transition: createTransition(['transform', 'box-shadow'], 'fast'),
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0, 120, 212, 0.25)',
    },
    ':active': {
      transform: 'translateY(0)',
    },
  },
  disabledFields: {
    opacity: 0.5,
    pointerEvents: 'none' as const,
  },
});

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'custom', label: '自定义 (OpenAI 兼容)' },
];

const imageSizeOptions = [
  { value: '512x512', label: '512x512' },
  { value: '1024x1024', label: '1024x1024' },
];

export function SettingsView() {
  const styles = useStyles();
  const {
    activeProviderId,
    providers,
    setActiveProvider,
    updateProviderConfig,
    imageGenConfig,
    updateImageGenConfig,
    switchView,
  } = useAppStore();
  const currentConfig = providers[activeProviderId];

  const providerId = useId();
  const apiKeyId = useId();
  const baseUrlId = useId();
  const modelId = useId();
  const imageApiKeyId = useId();
  const imageBaseUrlId = useId();
  const imageModelId = useId();
  const imageSizeId = useId();

  const handleProviderChange = (value: string) => {
    setActiveProvider(value as LLMProviderId);
  };

  const handleSave = () => {
    switchView('chat');
  };

  return (
    <div className={styles.container}>
      {/* LLM API 配置 */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🔑</span>
          LLM API 配置
        </div>

        <div className={styles.field}>
          <Label htmlFor={providerId} className={styles.label}>服务商</Label>
          <Select
            id={providerId}
            value={activeProviderId}
            onChange={(_, data) => handleProviderChange(data.value)}
            className={styles.input}
          >
            {providerOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className={styles.field}>
          <Label htmlFor={apiKeyId} className={styles.label}>API Key</Label>
          <Input
            id={apiKeyId}
            type="password"
            value={currentConfig.apiKey}
            onChange={(_, data) => updateProviderConfig(activeProviderId, { apiKey: data.value })}
            placeholder="sk-..."
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <Label htmlFor={baseUrlId} className={styles.label}>API 端点</Label>
          <Input
            id={baseUrlId}
            value={currentConfig.baseUrl}
            onChange={(_, data) => updateProviderConfig(activeProviderId, { baseUrl: data.value })}
            placeholder="https://api.openai.com/v1"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <Label htmlFor={modelId} className={styles.label}>模型</Label>
          <Input
            id={modelId}
            value={currentConfig.model}
            onChange={(_, data) => updateProviderConfig(activeProviderId, { model: data.value })}
            placeholder="gpt-4o-mini"
            className={styles.input}
          />
        </div>
      </div>

      {/* 图片生成 API 配置 */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🎨</span>
          图片生成 API
        </div>

        <div className={styles.fieldRow}>
          <Label className={styles.label}>启用图片生成</Label>
          <Switch
            checked={imageGenConfig.enabled}
            onChange={(_, data) => updateImageGenConfig({ enabled: data.checked })}
          />
        </div>

        <div className={imageGenConfig.enabled ? '' : styles.disabledFields}>
          <div className={styles.field}>
            <Label htmlFor={imageApiKeyId} className={styles.label}>API Key</Label>
            <Input
              id={imageApiKeyId}
              type="password"
              value={imageGenConfig.apiKey}
              onChange={(_, data) => updateImageGenConfig({ apiKey: data.value })}
              placeholder="sk-..."
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor={imageBaseUrlId} className={styles.label}>API 端点</Label>
            <Input
              id={imageBaseUrlId}
              value={imageGenConfig.baseUrl}
              onChange={(_, data) => updateImageGenConfig({ baseUrl: data.value })}
              placeholder="https://api.openai.com/v1"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor={imageModelId} className={styles.label}>模型</Label>
            <Input
              id={imageModelId}
              value={imageGenConfig.model}
              onChange={(_, data) => updateImageGenConfig({ model: data.value })}
              placeholder="dall-e-3"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor={imageSizeId} className={styles.label}>默认尺寸</Label>
            <Select
              id={imageSizeId}
              value={imageGenConfig.defaultSize}
              onChange={(_, data) => updateImageGenConfig({ defaultSize: data.value as '512x512' | '1024x1024' })}
              className={styles.input}
            >
              {imageSizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          appearance="primary"
          onClick={handleSave}
          className={styles.saveButton}
        >
          保存并返回
        </Button>
      </div>
    </div>
  );
}
