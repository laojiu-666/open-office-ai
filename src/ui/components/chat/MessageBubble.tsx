import { makeStyles, tokens, Spinner } from '@fluentui/react-components';
import { Copy24Regular, ArrowSwap24Regular, Add24Regular } from '@fluentui/react-icons';
import type { ChatMessage } from '@/types';
import { getPowerPointAdapter } from '@adapters/powerpoint';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    padding: '10px 14px',
    borderRadius: '12px',
    maxWidth: '90%',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  userBubble: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    borderBottomLeftRadius: '4px',
  },
  errorBubble: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
  },
  streamingIndicator: {
    display: 'inline-block',
    width: '8px',
    height: '16px',
    backgroundColor: tokens.colorBrandForeground1,
    marginLeft: '2px',
    animation: 'blink 1s infinite',
  },
  actions: {
    display: 'flex',
    gap: '4px',
    marginTop: '8px',
    paddingLeft: '4px',
  },
  actionButton: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    transition: 'all 0.15s',
  },
  actionButtonHover: {
    // Hover styles applied via JS
  },
  context: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    marginBottom: '4px',
    fontStyle: 'italic',
  },
});

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const styles = useStyles();
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
  };

  const handleReplace = async () => {
    const adapter = getPowerPointAdapter();
    await adapter.replaceSelection(message.content);
  };

  const handleInsert = async () => {
    const adapter = getPowerPointAdapter();
    await adapter.insertText(message.content);
  };

  return (
    <div
      className={`${styles.container} ${
        isUser ? styles.userContainer : styles.assistantContainer
      }`}
    >
      {message.context && (
        <div className={styles.context}>
          上下文: "{message.context.slice(0, 30)}..."
        </div>
      )}
      <div
        className={`${styles.bubble} ${
          isUser
            ? styles.userBubble
            : isError
            ? styles.errorBubble
            : styles.assistantBubble
        }`}
      >
        {message.content || (isStreaming && <Spinner size="tiny" />)}
        {isStreaming && message.content && (
          <span className={styles.streamingIndicator} />
        )}
      </div>
      {!isUser && message.status === 'completed' && message.content && (
        <div className={styles.actions}>
          <button className={styles.actionButton} onClick={handleCopy} title="复制">
            <Copy24Regular style={{ fontSize: '14px' }} />
            复制
          </button>
          <button className={styles.actionButton} onClick={handleReplace} title="替换选中">
            <ArrowSwap24Regular style={{ fontSize: '14px' }} />
            替换
          </button>
          <button className={styles.actionButton} onClick={handleInsert} title="插入">
            <Add24Regular style={{ fontSize: '14px' }} />
            插入
          </button>
        </div>
      )}
    </div>
  );
}
