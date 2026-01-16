/**
 * Developer 测试页面主容器
 */

import React from 'react';
import {
  makeStyles,
  tokens,
  Button,
  MessageBar,
  MessageBarBody,
  Spinner,
  Badge,
} from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  DeleteRegular,
  InfoRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
} from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';
import { useTestConsole } from './useTestConsole';
import { TestLogConsole } from './TestLogConsole';
import { TextTestSection } from './sections/TextTestSection';
import { ImageTestSection } from './sections/ImageTestSection';
import { BackgroundTestSection } from './sections/BackgroundTestSection';
import { PowerPointTestRunner } from '@adapters/powerpoint/test-runner';

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
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    flex: 1,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  warning: {
    marginBottom: '16px',
  },
  apiStatus: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  apiStatusTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    marginBottom: '8px',
  },
  apiStatusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  console: {
    marginTop: '16px',
  },
});

// 检测 API 支持情况
function checkApiSupport() {
  const api14 = Office.context.requirements.isSetSupported('PowerPointApi', '1.4');
  const api18 = Office.context.requirements.isSetSupported('PowerPointApi', '1.8');
  const api110 = Office.context.requirements.isSetSupported('PowerPointApi', '1.10');
  return { api14, api18, api110 };
}

export function DeveloperPage() {
  const styles = useStyles();
  const { setSettingsPage } = useAppStore();
  const { logs, addLog, clearLogs } = useTestConsole();
  const [clearing, setClearing] = React.useState(false);
  const [apiSupport, setApiSupport] = React.useState({ api14: false, api18: false, api110: false });

  React.useEffect(() => {
    // 检测 API 支持
    try {
      setApiSupport(checkApiSupport());
    } catch {
      // Office API 不可用
    }
  }, []);

  const handleBack = () => {
    setSettingsPage('main');
  };

  const handleClearSlide = async () => {
    setClearing(true);
    addLog('info', '开始清除幻灯片内容...');

    try {
      const result = await PowerPointTestRunner.clearSlide();
      if (result.success) {
        addLog('success', `幻灯片已清除: ${result.method}`);
      } else {
        addLog('error', `清除失败: ${result.error}`);
      }
    } catch (error) {
      addLog('error', `异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setClearing(false);
    }
  };

  const handleGetInfo = async () => {
    addLog('info', '获取幻灯片信息...');

    try {
      const result = await PowerPointTestRunner.getSlideInfo();
      if (result.success) {
        addLog('success', `当前幻灯片: 第 ${(result.slideIndex ?? 0) + 1} 页，包含 ${result.shapeCount} 个形状`);
      } else {
        addLog('error', `获取信息失败: ${result.error}`);
      }
    } catch (error) {
      addLog('error', `异常: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const ApiStatusIcon = ({ supported }: { supported: boolean }) =>
    supported ? (
      <CheckmarkCircleRegular style={{ color: '#4ade80' }} />
    ) : (
      <DismissCircleRegular style={{ color: '#f87171' }} />
    );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          icon={<ArrowLeftRegular />}
          onClick={handleBack}
        />
        <span className={styles.title}>开发者工具</span>
      </div>

      <div className={styles.content}>
        {/* API 支持状态 */}
        <div className={styles.apiStatus}>
          <div className={styles.apiStatusTitle}>PowerPoint API 支持状态</div>
          <div className={styles.apiStatusRow}>
            <ApiStatusIcon supported={apiSupport.api14} />
            <span>1.4 (形状操作)</span>
            {apiSupport.api14 && <Badge appearance="filled" color="success" size="small">文字插入可用</Badge>}
          </div>
          <div className={styles.apiStatusRow}>
            <ApiStatusIcon supported={apiSupport.api18} />
            <span>1.8 (图片填充)</span>
            {apiSupport.api18 ? (
              <Badge appearance="filled" color="success" size="small">图片/背景可用</Badge>
            ) : (
              <Badge appearance="filled" color="danger" size="small">图片/背景不可用</Badge>
            )}
          </div>
          <div className={styles.apiStatusRow}>
            <ApiStatusIcon supported={apiSupport.api110} />
            <span>1.10 (原生背景)</span>
            {apiSupport.api110 && <Badge appearance="filled" color="informative" size="small">原生背景 API</Badge>}
          </div>
        </div>

        {/* 警告提示 */}
        {!apiSupport.api18 && (
          <MessageBar intent="error" className={styles.warning}>
            <MessageBarBody>
              您的 PowerPoint 版本不支持图片填充功能（需要 PowerPointApi 1.8+）。
              图片插入和背景设置功能将不可用。请更新 Office 到最新版本。
            </MessageBarBody>
          </MessageBar>
        )}

        <MessageBar intent="warning" className={styles.warning}>
          <MessageBarBody>
            <InfoRegular style={{ marginRight: '8px' }} />
            测试操作将直接修改当前选中的幻灯片，请确保已选择正确的幻灯片。
          </MessageBarBody>
        </MessageBar>

        {/* 快捷操作 */}
        <div className={styles.actions}>
          <Button
            appearance="secondary"
            size="small"
            icon={clearing ? <Spinner size="tiny" /> : <DeleteRegular />}
            onClick={handleClearSlide}
            disabled={clearing}
          >
            清除幻灯片
          </Button>
          <Button
            appearance="secondary"
            size="small"
            icon={<InfoRegular />}
            onClick={handleGetInfo}
          >
            获取信息
          </Button>
        </div>

        {/* 测试区块 */}
        <TextTestSection onAddLog={addLog} />
        <ImageTestSection onAddLog={addLog} disabled={!apiSupport.api18} />
        <BackgroundTestSection onAddLog={addLog} disabled={!apiSupport.api18} />

        {/* 日志控制台 */}
        <div className={styles.console}>
          <TestLogConsole logs={logs} onClear={clearLogs} />
        </div>
      </div>
    </div>
  );
}

export default DeveloperPage;
