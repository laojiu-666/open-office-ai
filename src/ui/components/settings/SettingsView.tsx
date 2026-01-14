import { useId } from 'react';
import { makeStyles, tokens, Input, Label, Select, Button } from '@fluentui/react-components';
import { useAppStore } from '@ui/store/appStore';
import type { LLMProviderId } from '@/types';

const useStyles = makeStyles({
  container: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflow: 'auto',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
  },
  warning: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: tokens.colorPaletteYellowBackground2,
    fontSize: '12px',
    color: tokens.colorPaletteYellowForeground2,
    lineHeight: '1.5',
  },
  actions: {
    marginTop: '8px',
  },
});

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'custom', label: '自定义 (OpenAI 兼容)' },
];

export function SettingsView() {
  const styles = useStyles();
  const { activeProviderId, providers, setActiveProvider, updateProviderConfig, switchView } = useAppStore();
  const currentConfig = providers[activeProviderId];

  const providerId = useId();
  const apiKeyId = useId();
  const baseUrlId = useId();
  const modelId = useId();

  const handleProviderChange = (value: string) => {
    setActiveProvider(value as LLMProviderId);
  };

  const handleSave = () => {
    switchView('chat');
  };

  return (
    <div className={styles.container}>
      <div className={styles.warning} role="alert">
        API Key 存储在本地浏览器中。请勿在公共设备上使用，并确保使用支持 CORS 的 API 端点。
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>API 配置</div>

        <div className={styles.field}>
          <Label htmlFor={providerId} className={styles.label}>服务商</Label>
          <Select
            id={providerId}
            value={activeProviderId}
            onChange={(_, data) => handleProviderChange(data.value)}
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
          />
        </div>

        <div className={styles.field}>
          <Label htmlFor={baseUrlId} className={styles.label}>API 端点</Label>
          <Input
            id={baseUrlId}
            value={currentConfig.baseUrl}
            onChange={(_, data) => updateProviderConfig(activeProviderId, { baseUrl: data.value })}
            placeholder="https://api.openai.com/v1"
          />
        </div>

        <div className={styles.field}>
          <Label htmlFor={modelId} className={styles.label}>模型</Label>
          <Input
            id={modelId}
            value={currentConfig.model}
            onChange={(_, data) => updateProviderConfig(activeProviderId, { model: data.value })}
            placeholder="gpt-4o-mini"
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button appearance="primary" onClick={handleSave}>
          保存并返回
        </Button>
      </div>
    </div>
  );
}
