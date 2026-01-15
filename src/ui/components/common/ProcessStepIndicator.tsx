import { makeStyles, tokens } from '@fluentui/react-components';
import { Checkmark16Regular, SpinnerIos16Regular } from '@fluentui/react-icons';
import type { GenerationStep } from '@ui/hooks/useSlideGenerator';
import { createTransition, aiEffects } from '@ui/styles/designTokens';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    transition: createTransition(['color', 'opacity'], 'fast'),
  },
  stepActive: {
    color: tokens.colorBrandForeground1,
    fontWeight: 500,
  },
  stepCompleted: {
    color: tokens.colorPaletteGreenForeground1,
  },
  stepError: {
    color: tokens.colorPaletteRedForeground1,
  },
  icon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    backgroundColor: tokens.colorNeutralBackground3,
    transition: createTransition(['background-color', 'color'], 'fast'),
  },
  iconActive: {
    background: aiEffects.gradientBorder,
    color: 'white',
  },
  iconCompleted: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground1,
  },
  iconError: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  progressBar: {
    height: '3px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    background: aiEffects.gradientBorder,
    transition: createTransition(['width'], 'normal'),
    borderRadius: '2px',
  },
});

interface ProcessStepIndicatorProps {
  currentStep: GenerationStep;
  progress: number;
  error?: string | null;
}

const STEPS: Array<{ key: GenerationStep; label: string }> = [
  { key: 'analyzing', label: '分析上下文' },
  { key: 'generating_content', label: '生成内容' },
  { key: 'generating_image', label: '生成图片' },
  { key: 'rendering_slide', label: '渲染幻灯片' },
];

export function ProcessStepIndicator({ currentStep, progress, error }: ProcessStepIndicatorProps) {
  const styles = useStyles();

  const getStepStatus = (stepKey: GenerationStep): 'pending' | 'active' | 'completed' | 'error' => {
    if (currentStep === 'error' && error) return 'error';
    if (currentStep === 'completed') return 'completed';

    const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
    const stepIndex = STEPS.findIndex((s) => s.key === stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const renderIcon = (status: 'pending' | 'active' | 'completed' | 'error', index: number) => {
    if (status === 'completed') {
      return <Checkmark16Regular />;
    }
    if (status === 'active') {
      return <SpinnerIos16Regular className={styles.spinner} />;
    }
    if (status === 'error') {
      return '!';
    }
    return index + 1;
  };

  return (
    <div className={styles.container}>
      {STEPS.map((step, index) => {
        const status = getStepStatus(step.key);
        return (
          <div
            key={step.key}
            className={`${styles.step} ${
              status === 'active' ? styles.stepActive : ''
            } ${status === 'completed' ? styles.stepCompleted : ''} ${
              status === 'error' ? styles.stepError : ''
            }`}
          >
            <span
              className={`${styles.icon} ${
                status === 'active' ? styles.iconActive : ''
              } ${status === 'completed' ? styles.iconCompleted : ''} ${
                status === 'error' ? styles.iconError : ''
              }`}
            >
              {renderIcon(status, index)}
            </span>
            <span>{step.label}</span>
          </div>
        );
      })}

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
