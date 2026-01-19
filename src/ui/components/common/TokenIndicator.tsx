import { makeStyles, tokens, Tooltip } from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: '12px',
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  green: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
  yellow: {
    backgroundColor: tokens.colorPaletteYellowBackground3,
  },
  red: {
    backgroundColor: tokens.colorPaletteRedBackground3,
  },
  text: {
    color: tokens.colorNeutralForeground2,
  },
  icon: {
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
  },
});

interface TokenIndicatorProps {
  usedTokens: number;
  totalTokens: number;
  breakdown?: {
    system?: number;
    user?: number;
    pptContext?: number;
    selectedText?: number;
    history?: number;
  };
}

export function TokenIndicator({ usedTokens, totalTokens, breakdown }: TokenIndicatorProps) {
  const styles = useStyles();

  // 计算使用百分比
  const percentage = (usedTokens / totalTokens) * 100;

  // 确定状态颜色
  let statusClass = styles.green;
  let statusText = '正常';
  if (percentage >= 90) {
    statusClass = styles.red;
    statusText = '接近上限';
  } else if (percentage >= 50) {
    statusClass = styles.yellow;
    statusText = '压缩中';
  }

  // 构建详细信息
  const detailLines: string[] = [
    `已使用: ${usedTokens.toLocaleString()} / ${totalTokens.toLocaleString()} tokens (${percentage.toFixed(1)}%)`,
    '',
    '分配详情:',
  ];

  if (breakdown) {
    if (breakdown.system) {
      detailLines.push(`• 系统提示: ${breakdown.system.toLocaleString()} tokens`);
    }
    if (breakdown.user) {
      detailLines.push(`• 用户输入: ${breakdown.user.toLocaleString()} tokens`);
    }
    if (breakdown.pptContext) {
      detailLines.push(`• PPT 上下文: ${breakdown.pptContext.toLocaleString()} tokens`);
    }
    if (breakdown.selectedText) {
      detailLines.push(`• 选中文本: ${breakdown.selectedText.toLocaleString()} tokens`);
    }
    if (breakdown.history) {
      detailLines.push(`• 历史消息: ${breakdown.history.toLocaleString()} tokens`);
    }
  }

  const tooltipContent = detailLines.join('\n');

  return (
    <div className={styles.container}>
      <div className={styles.indicator}>
        <div className={`${styles.dot} ${statusClass}`} />
        <span className={styles.text}>{statusText}</span>
      </div>
      <Tooltip content={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{tooltipContent}</pre>} relationship="description">
        <Info16Regular className={styles.icon} />
      </Tooltip>
    </div>
  );
}
