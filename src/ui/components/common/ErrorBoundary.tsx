import { Component, ReactNode } from 'react';
import { makeStyles, tokens, Button } from '@fluentui/react-components';
import { ErrorCircle24Regular, ArrowClockwise24Regular } from '@fluentui/react-icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    minHeight: '300px',
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    color: tokens.colorPaletteRedForeground1,
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    marginBottom: '8px',
  },
  message: {
    fontSize: '14px',
    color: tokens.colorNeutralForeground2,
    marginBottom: '24px',
    maxWidth: '400px',
    lineHeight: '1.5',
  },
  details: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '24px',
    maxWidth: '500px',
    textAlign: 'left',
    fontFamily: 'monospace',
    overflowX: 'auto',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
});

/**
 * Error Boundary 组件
 * 捕获子组件树中的 JavaScript 错误，防止整个应用崩溃
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({
      errorInfo: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}

/**
 * 默认错误回退 UI
 */
function ErrorFallback({
  error,
  onReset,
  onReload,
}: {
  error?: Error;
  onReset: () => void;
  onReload: () => void;
}) {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <ErrorCircle24Regular className={styles.icon} />
      <h2 className={styles.title}>出错了</h2>
      <p className={styles.message}>应用遇到了一个错误。你可以尝试重试或重新加载页面。</p>

      {error && (
        <div className={styles.details}>
          <strong>错误详情：</strong>
          <br />
          {error.message}
        </div>
      )}

      <div className={styles.actions}>
        <Button appearance="primary" icon={<ArrowClockwise24Regular />} onClick={onReset}>
          重试
        </Button>
        <Button appearance="secondary" onClick={onReload}>
          重新加载页面
        </Button>
      </div>
    </div>
  );
}
