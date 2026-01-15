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
    backgroundColor: tokens.colorNeutralBackground3,
    position: 'relative',
  },
  messageArea: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  inputArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingTop: '8px',
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
