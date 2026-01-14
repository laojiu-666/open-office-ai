import { makeStyles, tokens } from '@fluentui/react-components';
import { ContextIndicator } from '@ui/components/common/ContextIndicator';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { QuickActions } from './QuickActions';

const useStyles = makeStyles({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  messageArea: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  inputArea: {
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

export function ChatView() {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <ContextIndicator />
      <div className={styles.messageArea}>
        <MessageList />
      </div>
      <div className={styles.inputArea}>
        <QuickActions />
        <InputArea />
      </div>
    </div>
  );
}
