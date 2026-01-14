import { makeStyles, tokens } from '@fluentui/react-components';
import { useLLMStream } from '@ui/hooks/useLLMStream';
import { useAppStore } from '@ui/store/appStore';

const useStyles = makeStyles({
  container: {
    padding: '8px 16px',
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    '::-webkit-scrollbar': {
      display: 'none',
    },
  },
  chip: {
    padding: '6px 12px',
    borderRadius: '16px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  chipDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

const quickPrompts = [
  { label: '润色', prompt: '请润色这段文字，使其更加流畅专业' },
  { label: '精简', prompt: '请精简这段文字，保留核心内容' },
  { label: '扩展', prompt: '请扩展这段文字，增加更多细节' },
  { label: '翻译成英文', prompt: '请将这段文字翻译成英文' },
  { label: '生成要点', prompt: '请将这段文字整理成要点列表' },
];

export function QuickActions() {
  const styles = useStyles();
  const isStreaming = useAppStore((state) => state.isStreaming);
  const currentSelection = useAppStore((state) => state.currentSelection);
  const { sendMessage } = useLLMStream();

  const handleClick = async (prompt: string) => {
    if (isStreaming) return;
    await sendMessage(prompt, currentSelection || undefined);
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
