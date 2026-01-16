/**
 * WebDAV 配置对话框
 * 配置 WebDAV 服务器连接信息
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Label,
  Switch,
  Spinner,
  MessageBar,
  MessageBarBody,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  Checkmark16Regular,
  Dismiss16Regular,
} from '@fluentui/react-icons';
import type { WebDavConfig } from '@/types';
import { useAppStore } from '@ui/store/appStore';

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
  switchField: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  testButton: {
    marginTop: '8px',
  },
  testResult: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    fontSize: '13px',
  },
  testSuccess: {
    color: tokens.colorPaletteGreenForeground1,
  },
  testError: {
    color: tokens.colorPaletteRedForeground1,
  },
  presetButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '4px',
  },
  presetButton: {
    fontSize: '12px',
  },
});

// WebDAV 服务预设
const WEBDAV_PRESETS = [
  { name: '坚果云', url: 'https://dav.jianguoyun.com/dav' },
  { name: 'NextCloud', url: 'https://your-server.com/remote.php/dav/files/username' },
  { name: 'Alist', url: 'https://your-server.com/dav' },
];

interface WebDavConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestConnection: (config: WebDavConfig, password: string) => Promise<boolean>;
}

export function WebDavConfigDialog({
  open,
  onOpenChange,
  onTestConnection,
}: WebDavConfigDialogProps) {
  const styles = useStyles();
  const { webDavConfig, updateWebDavConfig } = useAppStore();

  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remotePath, setRemotePath] = useState('/open-office-ai/vault.json');
  const [autoSync, setAutoSync] = useState(true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState('');

  // 初始化表单
  useEffect(() => {
    if (open) {
      setServerUrl(webDavConfig.serverUrl || '');
      setUsername(webDavConfig.username || '');
      setPassword('');
      setRemotePath(webDavConfig.remotePath || '/open-office-ai/vault.json');
      setAutoSync(webDavConfig.autoSync);
      setTestResult(null);
      setTestError('');
    }
  }, [open, webDavConfig]);

  const handlePresetClick = (url: string) => {
    setServerUrl(url);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError('');

    try {
      const config: WebDavConfig = {
        enabled: true,
        serverUrl,
        username,
        remotePath,
        autoSync,
      };

      const success = await onTestConnection(config, password);
      setTestResult(success ? 'success' : 'error');
      if (!success) {
        setTestError('连接失败，请检查服务器地址和凭据');
      }
    } catch (error) {
      setTestResult('error');
      setTestError(error instanceof Error ? error.message : '连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    updateWebDavConfig({
      enabled: true,
      serverUrl,
      username,
      remotePath,
      autoSync,
    });
    onOpenChange(false);
  };

  const handleDisable = () => {
    updateWebDavConfig({
      enabled: false,
    });
    onOpenChange(false);
  };

  const isValid = serverUrl.trim() && username.trim() && password.trim();
  const canSave = isValid && testResult === 'success';

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>配置 WebDAV 同步</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              {/* 服务器地址 */}
              <div className={styles.field}>
                <Label className={styles.label}>服务器地址 *</Label>
                <Input
                  className={styles.input}
                  value={serverUrl}
                  onChange={(_, data) => {
                    setServerUrl(data.value);
                    setTestResult(null);
                  }}
                  placeholder="https://dav.example.com/dav"
                />
                <div className={styles.presetButtons}>
                  {WEBDAV_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      appearance="subtle"
                      size="small"
                      className={styles.presetButton}
                      onClick={() => handlePresetClick(preset.url)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 用户名 */}
              <div className={styles.field}>
                <Label className={styles.label}>用户名 *</Label>
                <Input
                  className={styles.input}
                  value={username}
                  onChange={(_, data) => {
                    setUsername(data.value);
                    setTestResult(null);
                  }}
                  placeholder="your-username"
                />
              </div>

              {/* 密码 */}
              <div className={styles.field}>
                <Label className={styles.label}>密码 / 应用密码 *</Label>
                <Input
                  className={styles.input}
                  type="password"
                  value={password}
                  onChange={(_, data) => {
                    setPassword(data.value);
                    setTestResult(null);
                  }}
                  placeholder="••••••••"
                />
                <span className={styles.hint}>
                  建议使用应用专用密码（如坚果云的第三方应用密码）
                </span>
              </div>

              {/* 远端路径 */}
              <div className={styles.field}>
                <Label className={styles.label}>存储路径</Label>
                <Input
                  className={styles.input}
                  value={remotePath}
                  onChange={(_, data) => setRemotePath(data.value)}
                  placeholder="/open-office-ai/vault.json"
                />
                <span className={styles.hint}>
                  配置文件在 WebDAV 服务器上的存储位置
                </span>
              </div>

              {/* 自动同步 */}
              <div className={styles.switchField}>
                <div>
                  <Label className={styles.label}>自动同步</Label>
                  <span className={styles.hint} style={{ display: 'block' }}>
                    配置变更时自动同步到云端
                  </span>
                </div>
                <Switch
                  checked={autoSync}
                  onChange={(_, data) => setAutoSync(data.checked)}
                />
              </div>

              {/* 测试连接 */}
              <Button
                appearance="secondary"
                className={styles.testButton}
                onClick={handleTestConnection}
                disabled={!isValid || testing}
              >
                {testing ? <Spinner size="tiny" /> : '测试连接'}
              </Button>

              {testResult && (
                <div
                  className={mergeClasses(
                    styles.testResult,
                    testResult === 'success' ? styles.testSuccess : styles.testError
                  )}
                >
                  {testResult === 'success' ? (
                    <>
                      <Checkmark16Regular />
                      <span>连接成功</span>
                    </>
                  ) : (
                    <>
                      <Dismiss16Regular />
                      <span>{testError || '连接失败'}</span>
                    </>
                  )}
                </div>
              )}

              {webDavConfig.enabled && (
                <MessageBar intent="warning">
                  <MessageBarBody>
                    修改配置后需要重新测试连接
                  </MessageBarBody>
                </MessageBar>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            {webDavConfig.enabled && (
              <Button appearance="secondary" onClick={handleDisable}>
                禁用同步
              </Button>
            )}
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              appearance="primary"
              onClick={handleSave}
              disabled={!canSave}
            >
              保存
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
