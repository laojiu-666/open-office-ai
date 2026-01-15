import { makeStyles, tokens } from '@fluentui/react-components';
import { Settings24Regular, ArrowLeft24Regular } from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';
import { glassEffect, layoutDimensions, createTransition } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    height: layoutDimensions.headerHeight,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: glassEffect.background,
    backdropFilter: glassEffect.backdropFilter,
    WebkitBackdropFilter: glassEffect.backdropFilter,
    borderBottom: `1px solid rgba(0, 0, 0, 0.06)`,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  logo: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #0078D4, #a855f7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(0, 120, 212, 0.25)',
  },
  settingsButton: {
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground2,
    transition: createTransition(['background-color', 'color', 'transform'], 'fast'),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
    ':active': {
      transform: 'scale(0.95)',
    },
  },
});

export function Header() {
  const styles = useStyles();
  const { currentView, switchView } = useAppStore();

  const handleSettingsClick = () => {
    switchView(currentView === 'settings' ? 'chat' : 'settings');
  };

  return (
    <header className={styles.header}>
      <div className={styles.title}>
        <div className={styles.logo}>AI</div>
        <span>Open Office AI</span>
      </div>
      <button
        className={styles.settingsButton}
        onClick={handleSettingsClick}
        title={currentView === 'settings' ? '返回聊天' : '设置'}
      >
        {currentView === 'settings' ? <ArrowLeft24Regular /> : <Settings24Regular />}
      </button>
    </header>
  );
}
