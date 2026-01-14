import { ReactNode } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { Header } from './Header';

const useStyles = makeStyles({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
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
      <main className={styles.content}>{children}</main>
    </div>
  );
}
