import { makeStyles, tokens, Button } from '@fluentui/react-components';
import { Checkmark24Regular, Dismiss24Regular, ArrowRedo24Regular } from '@fluentui/react-icons';
import { ProcessStepIndicator } from '@ui/components/common/ProcessStepIndicator';
import type { GenerationStep } from '@ui/hooks/useSlideGenerator';
import type { SlideSpec } from '@/types';
import { shadows, layoutDimensions, glassEffect, createTransition } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  container: {
    backgroundColor: glassEffect.background,
    backdropFilter: glassEffect.backdropFilter,
    WebkitBackdropFilter: glassEffect.backdropFilter,
    borderRadius: layoutDimensions.cardBorderRadius,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: shadows.card,
    overflow: 'hidden',
    animation: 'fadeInUp 0.3s ease-out',
  },
  header: {
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #0078D4, #A855F7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
  },
  headerTitle: {
    flex: 1,
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  content: {
    padding: '12px 16px',
  },
  slideTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: tokens.colorNeutralForeground1,
    marginBottom: '8px',
  },
  slidePreview: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: '8px',
    padding: '16px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    lineHeight: 1.5,
  },
  actions: {
    padding: '12px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  actionButton: {
    minWidth: 'auto',
    padding: '6px 12px',
    fontSize: '12px',
    transition: createTransition(['transform'], 'fast'),
    ':hover': {
      transform: 'translateY(-1px)',
    },
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    color: tokens.colorPaletteGreenForeground1,
    fontSize: '13px',
    fontWeight: 500,
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: tokens.colorPaletteRedForeground1,
    fontSize: '13px',
  },
});

interface SlideGenerationCardProps {
  spec: SlideSpec;
  currentStep: GenerationStep;
  progress: number;
  error?: string | null;
  slideIndex?: number;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function SlideGenerationCard({
  spec,
  currentStep,
  progress,
  error,
  slideIndex,
  onRetry,
  onDismiss,
}: SlideGenerationCardProps) {
  const styles = useStyles();

  const isGenerating = currentStep !== 'idle' && currentStep !== 'completed' && currentStep !== 'error';
  const isCompleted = currentStep === 'completed';
  const isError = currentStep === 'error';

  // 获取标题
  const titleBlock = spec.blocks.find((b) => b.kind === 'text' && b.slotId === 'title');
  const title = titleBlock?.kind === 'text' ? titleBlock.content : '新幻灯片';

  // 获取内容预览
  const bodyBlock = spec.blocks.find((b) => b.kind === 'text' && b.slotId === 'body');
  const bodyPreview = bodyBlock?.kind === 'text'
    ? bodyBlock.content.slice(0, 100) + (bodyBlock.content.length > 100 ? '...' : '')
    : '';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>📊</span>
        <span className={styles.headerTitle}>
          {isGenerating ? '正在生成幻灯片...' : isCompleted ? '幻灯片已生成' : '生成幻灯片'}
        </span>
      </div>

      {isGenerating && (
        <ProcessStepIndicator currentStep={currentStep} progress={progress} error={error} />
      )}

      {isCompleted && (
        <div className={styles.successMessage}>
          <Checkmark24Regular />
          <span>幻灯片 {(slideIndex ?? 0) + 1} 已创建</span>
        </div>
      )}

      {isError && (
        <div className={styles.errorMessage}>
          <Dismiss24Regular />
          <span>{error || '生成失败'}</span>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.slideTitle}>{title}</div>
        {bodyPreview && <div className={styles.slidePreview}>{bodyPreview}</div>}
      </div>

      {(isCompleted || isError) && (
        <div className={styles.actions}>
          {isError && onRetry && (
            <Button
              className={styles.actionButton}
              appearance="primary"
              icon={<ArrowRedo24Regular />}
              onClick={onRetry}
            >
              重试
            </Button>
          )}
          {onDismiss && (
            <Button className={styles.actionButton} appearance="subtle" onClick={onDismiss}>
              关闭
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
