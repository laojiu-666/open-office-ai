import { makeStyles, tokens } from '@fluentui/react-components';
import { Settings24Regular } from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  logo: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: tokens.colorBrandBackground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: 700,
  },
  settingsButton: {
    padding: '6px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground2,
    transition: 'background-color 0.15s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
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
        <Settings24Regular />
      </button>
    </header>
  );
}
