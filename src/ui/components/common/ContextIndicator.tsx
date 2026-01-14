import { makeStyles, tokens } from '@fluentui/react-components';
import { useOfficeSelection } from '@ui/hooks/useOfficeSelection';

const useStyles = makeStyles({
  container: {
    padding: '8px 16px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  icon: {
    fontSize: '14px',
  },
  text: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  empty: {
    fontStyle: 'italic',
  },
});

export function ContextIndicator() {
  const styles = useStyles();
  const { currentSelection, hasSelection } = useOfficeSelection();

  const displayText = hasSelection
    ? `已选中: "${currentSelection.slice(0, 50)}${currentSelection.length > 50 ? '...' : ''}"`
    : '未选中文本';

  return (
    <div className={styles.container}>
      <span className={styles.icon}>{hasSelection ? '📝' : '📄'}</span>
      <span className={`${styles.text} ${!hasSelection ? styles.empty : ''}`}>
        {displayText}
      </span>
    </div>
  );
}
