import type { IDocumentAdapter, DocumentSelection, TextFormat, DocumentCapabilities } from '@/types';

export class PowerPointAdapter implements IDocumentAdapter {
  readonly host = 'powerpoint' as const;
  readonly capabilities: DocumentCapabilities = {
    selectionText: true,
    replaceText: true,
    insertText: true,
    deleteText: true,
  };

  async getSelection(): Promise<DocumentSelection> {
    return new Promise((resolve, reject) => {
      Office.context.document.getSelectedDataAsync(
        Office.CoercionType.Text,
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            const text = result.value as string;
            resolve({
              text: text || '',
              isEmpty: !text || text.trim() === '',
              context: {},
            });
          } else {
            reject(new Error(result.error?.message || '获取选区失败'));
          }
        }
      );
    });
  }

  async replaceSelection(text: string, _format?: TextFormat): Promise<void> {
    return new Promise((resolve, reject) => {
      Office.context.document.setSelectedDataAsync(
        text,
        { coercionType: Office.CoercionType.Text },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve();
          } else {
            reject(new Error(result.error?.message || '替换选区失败'));
          }
        }
      );
    });
  }

  async insertText(text: string, _format?: TextFormat): Promise<void> {
    // In PowerPoint, insert behaves the same as replace for selected text
    return this.replaceSelection(text, _format);
  }

  async deleteSelection(): Promise<void> {
    return this.replaceSelection('');
  }

  // Listen for selection changes
  onSelectionChange(callback: (selection: DocumentSelection) => void): () => void {
    const handler = () => {
      this.getSelection()
        .then(callback)
        .catch(() => {
          callback({ text: '', isEmpty: true, context: {} });
        });
    };

    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      handler
    );

    return () => {
      Office.context.document.removeHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        { handler }
      );
    };
  }
}

// Singleton instance
let instance: PowerPointAdapter | null = null;

export function getPowerPointAdapter(): PowerPointAdapter {
  if (!instance) {
    instance = new PowerPointAdapter();
  }
  return instance;
}
