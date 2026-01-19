import React from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Switch,
  Select,
  Badge,
} from '@fluentui/react-components';
import {
  ArrowLeft24Regular,
  TextDescription24Regular,
  Image24Regular,
} from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';
import { layoutDimensions, shadows } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  title: {
    fontWeight: 600,
    fontSize: '16px',
  },
  content: {
    flex: 1,
    padding: '20px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    fontSize: '13px',
  },
  card: {
    padding: '16px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: layoutDimensions.cardBorderRadius,
    boxShadow: shadows.card,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  capabilityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  capabilityItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  capabilityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  capabilityIcon: {
    color: tokens.colorBrandForeground1,
  },
  capabilityName: {
    fontWeight: 600,
    flex: 1,
  },
  select: {
    minWidth: '200px',
  },
  description: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    marginTop: '4px',
  },
});

interface CapabilityCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  value: string;
  options: { label: string; value: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

function CapabilityCard({ id, icon, title, description, value, options, disabled, onChange }: CapabilityCardProps) {
  const styles = useStyles();
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;

  return (
    <div className={styles.capabilityItem}>
      <div className={styles.capabilityHeader}>
        <div className={styles.capabilityIcon}>{icon}</div>
        <Text id={labelId} className={styles.capabilityName}>{title}</Text>
        {disabled && <Badge appearance="tint" color="brand">自动托管</Badge>}
      </div>
      <Text id={descId} className={styles.description}>{description}</Text>
      <Select
        className={styles.select}
        aria-labelledby={labelId}
        aria-describedby={descId}
        value={value}
        onChange={(_, data) => onChange(data.value)}
        disabled={disabled}
      >
        <option value="">自动选择（最佳可用）</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </Select>
    </div>
  );
}

export function GenerationProfileSettings() {
  const styles = useStyles();
  const {
    setSettingsPage,
    connections,
    generationProfile,
    updateGenerationProfile
  } = useAppStore();

  const isAutoMode = generationProfile.mode === 'auto';

  const handleModeChange = (checked: boolean) => {
    updateGenerationProfile({ mode: checked ? 'auto' : 'manual' });
  };

  const handleTextProviderChange = (value: string) => {
    updateGenerationProfile({ textProvider: value || undefined });
  };

  const handleImageProviderChange = (value: string) => {
    updateGenerationProfile({ imageProvider: value || undefined });
  };

  const connectionOptions = connections.map(c => ({ label: c.name, value: c.id }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          icon={<ArrowLeft24Regular />}
          onClick={() => setSettingsPage('main')}
        />
        <Text className={styles.title}>生成能力配置</Text>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.row}>
            <div>
              <Text id="auto-mode-label" block weight="semibold">智能托管模式</Text>
              <Text className={styles.description}>
                系统将根据任务需求，自动选择最适合的 AI 模型
              </Text>
            </div>
            <Switch aria-labelledby="auto-mode-label" checked={isAutoMode} onChange={(_, data) => handleModeChange(data.checked)} />
          </div>
        </div>

        <div className={styles.section}>
          <Text className={styles.sectionTitle}>能力路由表</Text>
          <div className={styles.capabilityList}>
            <CapabilityCard
              id="cap-text"
              icon={<TextDescription24Regular />}
              title="文本智能"
              description="负责大纲生成、内容扩写和逻辑推演"
              value={generationProfile.textProvider || ''}
              options={connectionOptions}
              disabled={isAutoMode}
              onChange={handleTextProviderChange}
            />
            <CapabilityCard
              id="cap-image"
              icon={<Image24Regular />}
              title="视觉引擎"
              description="负责配图生成、图表美化和背景设计"
              value={generationProfile.imageProvider || ''}
              options={connectionOptions}
              disabled={isAutoMode}
              onChange={handleImageProviderChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
