import React from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowDownload20Regular, DocumentAdd20Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    maxWidth: '500px',
  },
  mediaContainer: {
    position: 'relative',
    borderRadius: tokens.borderRadiusSmall,
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  image: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  video: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  metadata: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
});

interface MediaResultCardProps {
  type: 'image' | 'video';
  content: string; // base64 data
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    provider?: string;
    model?: string;
  };
  onInsert?: () => void;
}

export function MediaResultCard({ type, content, metadata, onInsert }: MediaResultCardProps) {
  const styles = useStyles();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:${type}/${metadata?.format || 'png'};base64,${content}`;
    link.download = `generated-${type}-${Date.now()}.${metadata?.format || 'png'}`;
    link.click();
  };

  return (
    <div className={styles.card}>
      <div className={styles.mediaContainer}>
        {type === 'image' ? (
          <img
            src={`data:image/${metadata?.format || 'png'};base64,${content}`}
            alt="Generated image"
            className={styles.image}
          />
        ) : (
          <video
            src={`data:video/${metadata?.format || 'mp4'};base64,${content}`}
            controls
            className={styles.video}
          />
        )}
      </div>

      {metadata && (
        <div className={styles.metadata}>
          {metadata.width && metadata.height && `${metadata.width}×${metadata.height}`}
          {metadata.provider && ` · ${metadata.provider}`}
          {metadata.model && ` · ${metadata.model}`}
        </div>
      )}

      <div className={styles.actions}>
        <Button
          appearance="secondary"
          icon={<ArrowDownload20Regular />}
          onClick={handleDownload}
        >
          下载
        </Button>
        {onInsert && (
          <Button
            appearance="primary"
            icon={<DocumentAdd20Regular />}
            onClick={onInsert}
          >
            插入到幻灯片
          </Button>
        )}
      </div>
    </div>
  );
}
