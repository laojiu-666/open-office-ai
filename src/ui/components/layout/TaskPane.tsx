import { ReactNode } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { Header } from './Header';
import { ErrorBoundary } from '../common/ErrorBoundary';

const useStyles = makeStyles({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground3,
    position: 'relative',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
});

interface TaskPaneProps {
  children: ReactNode;
}

export function TaskPane({ children }: TaskPaneProps) {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Header />
      <ErrorBoundary>
        <main className={styles.content}>{children}</main>
      </ErrorBoundary>
    </div>
  );
}
