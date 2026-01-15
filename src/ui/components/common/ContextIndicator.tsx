import { makeStyles, tokens, Tooltip } from '@fluentui/react-components';
import { useOfficeSelection } from '@ui/hooks/useOfficeSelection';
import { useAppStore } from '@ui/store/appStore';
import { createTransition } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  container: {
    padding: '6px 12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: createTransition(['background-color'], 'fast'),
  },
  containerActive: {
    backgroundColor: 'rgba(0, 120, 212, 0.04)',
    borderBottomColor: 'rgba(0, 120, 212, 0.15)',
  },
  icon: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    backgroundColor: tokens.colorNeutralBackground3,
    transition: createTransition(['background-color'], 'fast'),
  },
  iconActive: {
    backgroundColor: 'rgba(0, 120, 212, 0.1)',
  },
  text: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    fontWeight: 500,
  },
  empty: {
    fontStyle: 'italic',
    fontWeight: 400,
    color: tokens.colorNeutralForeground3,
  },
  badge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  slideBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 500,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
});

export function ContextIndicator() {
  const styles = useStyles();
  const { currentSelection, hasSelection } = useOfficeSelection();
  const presentationContext = useAppStore((state) => state.presentationContext);

  const slideInfo = presentationContext.slideCount > 0
    ? `幻灯片 ${presentationContext.currentSlideIndex + 1}/${presentationContext.slideCount}`
    : '';

  const displayText = hasSelection
    ? `"${currentSelection.slice(0, 40)}${currentSelection.length > 40 ? '...' : ''}"`
    : slideInfo || '未选中文本';

  const tooltipContent = hasSelection
    ? `选中内容: ${currentSelection.slice(0, 200)}${currentSelection.length > 200 ? '...' : ''}`
    : slideInfo
    ? `当前位于 ${slideInfo}`
    : '在 PPT 中选择文本以获取上下文';

  return (
    <Tooltip content={tooltipContent} relationship="description" positioning="below">
      <div className={`${styles.container} ${hasSelection ? styles.containerActive : ''}`}>
        <span className={`${styles.icon} ${hasSelection ? styles.iconActive : ''}`}>
          {hasSelection ? '📝' : '📊'}
        </span>
        <span className={`${styles.text} ${!hasSelection && !slideInfo ? styles.empty : ''}`}>
          {displayText}
        </span>
        {slideInfo && !hasSelection && (
          <span className={styles.slideBadge}>{slideInfo}</span>
        )}
        {hasSelection && <span className={styles.badge}>已选中</span>}
      </div>
    </Tooltip>
  );
}
