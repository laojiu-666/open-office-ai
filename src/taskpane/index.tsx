import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import App from './App';

Office.onReady((info) => {
  if (info.host === Office.HostType.PowerPoint) {
    const container = document.getElementById('root');
    if (container) {
      const root = createRoot(container);
      root.render(
        <FluentProvider theme={webLightTheme} style={{ height: '100%' }}>
          <App />
        </FluentProvider>
      );
    }
  }
});
