import { useState, useRef, KeyboardEvent } from 'react';
import { makeStyles, tokens, Textarea, Button } from '@fluentui/react-components';
import { Send24Regular, Stop24Regular } from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';
import { useLLMStream } from '@ui/hooks/useLLMStream';

const useStyles = makeStyles({
  container: {
    padding: '12px 16px',
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  textarea: {
    width: '100%',
    minHeight: '40px',
    maxHeight: '120px',
    resize: 'none',
  },
  sendButton: {
    minWidth: '40px',
    height: '40px',
  },
});

export function InputArea() {
  const styles = useStyles();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = useAppStore((state) => state.isStreaming);
  const currentSelection = useAppStore((state) => state.currentSelection);
  const { sendMessage, stopStream } = useLLMStream();

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput('');
    await sendMessage(trimmed, currentSelection || undefined);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    stopStream();
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <Textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="输入指令，如：让这段话更专业..."
          value={input}
          onChange={(_, data) => setInput(data.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
        />
      </div>
      {isStreaming ? (
        <Button
          className={styles.sendButton}
          appearance="secondary"
          icon={<Stop24Regular />}
          onClick={handleStop}
          title="停止生成"
        />
      ) : (
        <Button
          className={styles.sendButton}
          appearance="primary"
          icon={<Send24Regular />}
          onClick={handleSend}
          disabled={!input.trim()}
          title="发送"
        />
      )}
    </div>
  );
}
