import { makeStyles, tokens } from '@fluentui/react-components';
import { useLLMStream } from '@ui/hooks/useLLMStream';
import { useAppStore } from '@ui/store/appStore';
import { layoutDimensions, createTransition, shadows } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  container: {
    padding: '8px 12px',
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    '::-webkit-scrollbar': {
      display: 'none',
    },
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
  },
  chip: {
    padding: '8px 14px',
    borderRadius: layoutDimensions.chipBorderRadius,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
    transition: createTransition(['all'], 'fast'),
    boxShadow: 'none',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      borderTopColor: tokens.colorBrandStroke1,
      borderRightColor: tokens.colorBrandStroke1,
      borderBottomColor: tokens.colorBrandStroke1,
      borderLeftColor: tokens.colorBrandStroke1,
      color: tokens.colorBrandForeground1,
      transform: 'translateY(-2px)',
      boxShadow: shadows.card,
    },
    ':active': {
      transform: 'translateY(0)',
    },
  },
  chipDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    ':hover': {
      transform: 'none',
      boxShadow: 'none',
      backgroundColor: tokens.colorNeutralBackground1,
      borderTopColor: tokens.colorNeutralStroke2,
      borderRightColor: tokens.colorNeutralStroke2,
      borderBottomColor: tokens.colorNeutralStroke2,
      borderLeftColor: tokens.colorNeutralStroke2,
      color: tokens.colorNeutralForeground2,
    },
  },
});

const quickPrompts = [
  { label: '总结', prompt: '请总结这段文字的核心内容' },
  { label: '翻译', prompt: '请将这段文字翻译成英文' },
];

export function QuickActions() {
  const styles = useStyles();
  const isStreaming = useAppStore((state) => state.isStreaming);
  const currentSelection = useAppStore((state) => state.currentSelection);
  const { sendMessage } = useLLMStream();

  const handleClick = async (prompt: string) => {
    if (isStreaming) return;
    await sendMessage(prompt, currentSelection ? { selectedText: currentSelection } : undefined);
  };

  return (
    <div className={styles.container}>
      {quickPrompts.map((item) => (
        <button
          key={item.label}
          className={`${styles.chip} ${isStreaming ? styles.chipDisabled : ''}`}
          onClick={() => handleClick(item.prompt)}
          disabled={isStreaming}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
