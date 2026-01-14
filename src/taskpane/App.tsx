import { useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { TaskPane } from '@ui/components/layout/TaskPane';
import { ChatView } from '@ui/components/chat/ChatView';
import { SettingsView } from '@ui/components/settings/SettingsView';
import { useAppStore } from '@ui/store/appStore';

const useStyles = makeStyles({
  root: {
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

export default function App() {
  const styles = useStyles();
  const currentView = useAppStore((state) => state.currentView);

  return (
    <div className={styles.root}>
      <TaskPane>
        {currentView === 'chat' ? <ChatView /> : <SettingsView />}
      </TaskPane>
    </div>
  );
}
