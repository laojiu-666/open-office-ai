/**
 * 设置主页面 - 列表导航
 */

import React from 'react';
import { makeStyles, tokens, Text, Button } from '@fluentui/react-components';
import {
  PlugConnected24Regular,
  ChevronRight20Regular,
  CodeRegular,
  BrainCircuit24Regular,
} from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';
import { shadows, layoutDimensions, createTransition } from '@ui/styles/designTokens';
import { ConnectionsPage } from './pages';
import { DeveloperPage } from '../developer';
import { GenerationProfileSettings } from './GenerationProfileSettings';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  title: {
    fontWeight: 600,
    fontSize: '16px',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: layoutDimensions.cardBorderRadius,
    boxShadow: shadows.card,
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    transition: createTransition(['background-color', 'transform'], 'fast'),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':active': {
      transform: 'scale(0.99)',
    },
  },
  menuIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuIconConnections: {
    background: 'linear-gradient(135deg, #0078D4 0%, #106EBE 100%)',
    color: 'white',
  },
  menuIconProfile: {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    color: 'white',
  },
  menuIconDeveloper: {
    background: 'linear-gradient(135deg, #6B7280 0%, #374151 100%)',
    color: 'white',
  },
  menuContent: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    fontWeight: 600,
    fontSize: '14px',
    display: 'block',
  },
  menuDescription: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    display: 'block',
    marginTop: '2px',
  },
  menuArrow: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  footer: {
    padding: '16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  backButton: {
    width: '100%',
  },
});

interface MenuItemProps {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  description: string;
  onClick: () => void;
}

function MenuItem({ icon, iconClass, title, description, onClick }: MenuItemProps) {
  const styles = useStyles();

  return (
    <button className={styles.menuItem} onClick={onClick}>
      <div className={`${styles.menuIcon} ${iconClass}`}>
        {icon}
      </div>
      <div className={styles.menuContent}>
        <Text className={styles.menuTitle}>{title}</Text>
        <Text className={styles.menuDescription}>{description}</Text>
      </div>
      <ChevronRight20Regular className={styles.menuArrow} />
    </button>
  );
}

function SettingsMain() {
  const styles = useStyles();
  const { switchView, setSettingsPage, connections, activeConnectionId } = useAppStore();

  const activeConnection = connections.find(c => c.id === activeConnectionId);
  const connectionDesc = activeConnection
    ? `当前：${activeConnection.name}`
    : `${connections.length} 个连接`;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text className={styles.title}>设置</Text>
      </div>
      <div className={styles.content}>
        <div className={styles.menuList}>
          <MenuItem
            icon={<PlugConnected24Regular />}
            iconClass={styles.menuIconConnections}
            title="AI 连接"
            description={connectionDesc}
            onClick={() => setSettingsPage('connections')}
          />
          <MenuItem
            icon={<BrainCircuit24Regular />}
            iconClass={styles.menuIconProfile}
            title="生成能力"
            description="配置文本、图片和视频生成的默认模型"
            onClick={() => setSettingsPage('profile')}
          />
          <MenuItem
            icon={<CodeRegular />}
            iconClass={styles.menuIconDeveloper}
            title="开发者工具"
            description="测试 PPT 核心功能"
            onClick={() => setSettingsPage('developer')}
          />
          {/* TODO: 云同步功能暂时禁用，待解决 CORS 问题后恢复 */}
        </div>
      </div>
      <div className={styles.footer}>
        <Button
          appearance="primary"
          className={styles.backButton}
          onClick={() => switchView('chat')}
        >
          返回聊天
        </Button>
      </div>
    </div>
  );
}

export function SettingsView() {
  const settingsPage = useAppStore((state) => state.settingsPage);

  switch (settingsPage) {
    case 'connections':
      return <ConnectionsPage />;
    case 'profile':
      return <GenerationProfileSettings />;
    case 'developer':
      return <DeveloperPage />;
    default:
      return <SettingsMain />;
  }
}
