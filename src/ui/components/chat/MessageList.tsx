import { useRef, useEffect } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { useAppStore } from '@ui/store/appStore';
import { MessageBubble } from './MessageBubble';
import { aiEffects } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  container: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    paddingBottom: '140px', // 为浮动输入框留空间
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: '32px',
    paddingBottom: '100px',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(0, 120, 212, 0.1), rgba(168, 85, 247, 0.1))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    fontSize: '28px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
    color: tokens.colorNeutralForeground1,
  },
  emptyText: {
    fontSize: '13px',
    lineHeight: '1.6',
    maxWidth: '260px',
    color: tokens.colorNeutralForeground3,
  },
});

export function MessageList() {
  const styles = useStyles();
  const messages = useAppStore((state) => state.messages);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>✨</div>
        <div className={styles.emptyTitle}>开始对话</div>
        <div className={styles.emptyText}>
          选中 PPT 中的文本，然后输入指令让 AI 帮你改写、优化或生成内容
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      ref={containerRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
