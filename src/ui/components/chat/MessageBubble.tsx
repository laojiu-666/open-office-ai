import { useState, useCallback } from 'react';
import { makeStyles, tokens, Spinner } from '@fluentui/react-components';
import { Copy24Regular, ArrowSwap24Regular, Add24Regular, SlideAdd24Regular } from '@fluentui/react-icons';
import type { ChatMessage } from '@/types';
import { getPowerPointAdapter } from '@adapters/powerpoint';
import { aiEffects, shadows, createTransition, animation } from '@ui/styles/designTokens';
import { SlideGenerationCard } from './cards/SlideGenerationCard';
import { useSlideGenerator, type GenerationStep } from '@ui/hooks/useSlideGenerator';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
    animation: `fadeInUp ${animation.duration.normal} ${animation.easing.easeOut}`,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    padding: '12px 16px',
    maxWidth: '88%',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  userBubble: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderRadius: '16px 16px 4px 16px',
    boxShadow: shadows.card,
  },
  assistantBubble: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    borderRadius: '16px 16px 16px 4px',
    boxShadow: shadows.card,
    position: 'relative',
    // AI 渐变边框效果
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '8px',
      bottom: '8px',
      width: '3px',
      background: aiEffects.gradientBorder,
      borderRadius: '3px',
    },
  },
  errorBubble: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
    borderRadius: '16px 16px 16px 4px',
    '&::before': {
      display: 'none',
    },
  },
  streamingIndicator: {
    display: 'inline-block',
    width: '2px',
    height: '16px',
    backgroundColor: tokens.colorBrandForeground1,
    marginLeft: '2px',
    animation: 'blink 0.8s infinite',
    borderRadius: '1px',
  },
  actions: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
    paddingLeft: '4px',
  },
  actionButton: {
    padding: '6px 10px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    transition: createTransition(['all'], 'fast'),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      borderTopColor: tokens.colorNeutralStroke1Hover,
      borderRightColor: tokens.colorNeutralStroke1Hover,
      borderBottomColor: tokens.colorNeutralStroke1Hover,
      borderLeftColor: tokens.colorNeutralStroke1Hover,
      color: tokens.colorNeutralForeground1,
      transform: 'translateY(-1px)',
      boxShadow: shadows.card,
    },
    ':active': {
      transform: 'translateY(0)',
    },
  },
  context: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    marginBottom: '6px',
    fontStyle: 'italic',
    paddingLeft: '4px',
  },
  spinnerWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
  },
  slideSpecCard: {
    marginTop: '12px',
    maxWidth: '100%',
  },
  generateSlideButton: {
    marginTop: '8px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: tokens.colorBrandForeground1,
    transition: createTransition(['all'], 'fast'),
    ':hover': {
      backgroundColor: 'rgba(0, 120, 212, 0.08)',
      borderTopColor: tokens.colorBrandStroke1,
      borderRightColor: tokens.colorBrandStroke1,
      borderBottomColor: tokens.colorBrandStroke1,
      borderLeftColor: tokens.colorBrandStroke1,
      transform: 'translateY(-1px)',
      boxShadow: shadows.card,
    },
    ':active': {
      transform: 'translateY(0)',
    },
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

  // 幻灯片生成状态
  const [isGeneratingSlide, setIsGeneratingSlide] = useState(false);
  const [slideGenStep, setSlideGenStep] = useState<GenerationStep>('idle');
  const [slideGenProgress, setSlideGenProgress] = useState(0);
  const [slideGenError, setSlideGenError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState<number | undefined>(undefined);

  const { generateSlide, reset: resetSlideGen } = useSlideGenerator();

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

  // 生成幻灯片
  const handleGenerateSlide = useCallback(async () => {
    if (!message.slideSpec || isGeneratingSlide) return;

    setIsGeneratingSlide(true);
    setSlideGenStep('analyzing');
    setSlideGenProgress(10);
    setSlideGenError(null);

    try {
      // 模拟步骤进度
      setSlideGenStep('generating_content');
      setSlideGenProgress(30);

      const result = await generateSlide(message.slideSpec);

      if (result?.success) {
        setSlideGenStep('completed');
        setSlideGenProgress(100);
        setSlideIndex(result.slideIndex);
      } else {
        setSlideGenStep('error');
        setSlideGenError(result?.error || '生成失败');
      }
    } catch (err) {
      setSlideGenStep('error');
      setSlideGenError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsGeneratingSlide(false);
    }
  }, [message.slideSpec, isGeneratingSlide, generateSlide]);

  // 重试生成
  const handleRetry = useCallback(() => {
    resetSlideGen();
    setSlideGenStep('idle');
    setSlideGenProgress(0);
    setSlideGenError(null);
    handleGenerateSlide();
  }, [resetSlideGen, handleGenerateSlide]);

  // 关闭卡片
  const handleDismiss = useCallback(() => {
    setSlideGenStep('idle');
    setSlideGenProgress(0);
    setSlideGenError(null);
  }, []);

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
        {message.content || (isStreaming && (
          <div className={styles.spinnerWrapper}>
            <Spinner size="tiny" />
            <span>思考中...</span>
          </div>
        ))}
        {isStreaming && message.content && (
          <span className={styles.streamingIndicator} />
        )}
      </div>

      {/* SlideSpec 生成卡片 */}
      {!isUser && message.slideSpec && slideGenStep !== 'idle' && (
        <div className={styles.slideSpecCard}>
          <SlideGenerationCard
            spec={message.slideSpec}
            currentStep={slideGenStep}
            progress={slideGenProgress}
            error={slideGenError}
            slideIndex={slideIndex}
            onRetry={handleRetry}
            onDismiss={handleDismiss}
          />
        </div>
      )}

      {/* 生成幻灯片按钮 */}
      {!isUser && message.status === 'completed' && message.slideSpec && slideGenStep === 'idle' && (
        <button
          className={styles.generateSlideButton}
          onClick={handleGenerateSlide}
          title="生成幻灯片"
        >
          <SlideAdd24Regular style={{ fontSize: '16px' }} />
          生成幻灯片
        </button>
      )}

      {!isUser && message.status === 'completed' && message.content && !message.slideSpec && (
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
