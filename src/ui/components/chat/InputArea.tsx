import { useState, useRef, KeyboardEvent } from 'react';
import { makeStyles, tokens, Textarea, Button } from '@fluentui/react-components';
import { Send24Regular, Stop24Regular } from '@fluentui/react-icons';
import { useAppStore } from '@ui/store/appStore';
import { useLLMStream } from '@ui/hooks/useLLMStream';
import { usePresentationContext } from '@ui/hooks/usePresentationContext';
import { shadows, layoutDimensions, createTransition } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  wrapper: {
    padding: '0 12px 12px 12px',
    display: 'flex',
    justifyContent: 'center',
  },
  container: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
    padding: '10px 12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: layoutDimensions.inputBorderRadius,
    boxShadow: shadows.floating,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    transition: createTransition(['box-shadow', 'border-color'], 'normal'),
    width: '100%',
    maxWidth: '600px',
    ':focus-within': {
      borderTopColor: tokens.colorBrandStroke1,
      borderRightColor: tokens.colorBrandStroke1,
      borderBottomColor: tokens.colorBrandStroke1,
      borderLeftColor: tokens.colorBrandStroke1,
      boxShadow: `${shadows.floating}, 0 0 0 2px rgba(0, 120, 212, 0.1)`,
    },
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  textarea: {
    width: '100%',
    minHeight: '24px',
    maxHeight: '100px',
    resize: 'none',
    border: 'none !important',
    backgroundColor: 'transparent',
    fontSize: '14px',
    lineHeight: '1.5',
    '& textarea': {
      border: 'none !important',
      outline: 'none !important',
      backgroundColor: 'transparent !important',
      padding: '0 !important',
    },
    // 覆盖 Fluent UI Textarea 的所有边框样式
    '&::after': {
      display: 'none !important',
      border: 'none !important',
    },
    '&::before': {
      display: 'none !important',
      border: 'none !important',
    },
    '& > span': {
      border: 'none !important',
    },
    '& > span::after': {
      display: 'none !important',
    },
    '& > span::before': {
      display: 'none !important',
    },
  },
  sendButton: {
    minWidth: '36px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    padding: 0,
    transition: createTransition(['transform', 'background-color'], 'fast'),
    ':hover': {
      transform: 'scale(1.05)',
    },
    ':active': {
      transform: 'scale(0.95)',
    },
  },
  stopButton: {
    minWidth: '36px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    padding: 0,
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    transition: createTransition(['transform', 'background-color'], 'fast'),
    ':hover': {
      backgroundColor: tokens.colorPaletteRedForeground1,
      transform: 'scale(1.05)',
    },
    ':active': {
      transform: 'scale(0.95)',
    },
  },
});

export function InputArea() {
  const styles = useStyles();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = useAppStore((state) => state.isStreaming);
  const currentSelection = useAppStore((state) => state.currentSelection);
  const { sendMessage, stopStream } = useLLMStream();
  const { getFullAIContext } = usePresentationContext();

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput('');

    // 获取完整的 PPT 上下文
    const aiContext = await getFullAIContext();
    console.log('[InputArea] aiContext:', aiContext);

    const contextToSend = {
      selectedText: currentSelection || undefined,
      slideText: aiContext.slideText || undefined,
      theme: aiContext.theme
        ? {
            fonts: aiContext.theme.fonts,
            colors: aiContext.theme.colors,
          }
        : undefined,
    };
    console.log('[InputArea] contextToSend:', contextToSend);

    await sendMessage(trimmed, contextToSend);
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
    <div className={styles.wrapper}>
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
            appearance="filled-darker"
            resize="none"
          />
        </div>
        {isStreaming ? (
          <Button
            className={styles.stopButton}
            appearance="primary"
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
    </div>
  );
}
