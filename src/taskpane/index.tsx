import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import App from './App';
import { createDefaultRegistry, initializeRegistry } from '@core/providers';

Office.onReady((info) => {
  if (info.host === Office.HostType.PowerPoint) {
    // 初始化供应商注册表
    initializeRegistry(createDefaultRegistry());

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
