import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@ui/store/appStore';
import { getPowerPointAdapter } from '@adapters/powerpoint';

export function useOfficeSelection() {
  const setCurrentSelection = useAppStore((state) => state.setCurrentSelection);
  const currentSelection = useAppStore((state) => state.currentSelection);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const adapter = getPowerPointAdapter();

    // Initial selection
    adapter.getSelection().then((selection) => {
      setCurrentSelection(selection.text);
    }).catch(() => {
      setCurrentSelection('');
    });

    // Listen for changes
    cleanupRef.current = adapter.onSelectionChange((selection) => {
      setCurrentSelection(selection.text);
    });

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [setCurrentSelection]);

  const refreshSelection = useCallback(async () => {
    const adapter = getPowerPointAdapter();
    try {
      const selection = await adapter.getSelection();
      setCurrentSelection(selection.text);
      return selection.text;
    } catch {
      setCurrentSelection('');
      return '';
    }
  }, [setCurrentSelection]);

  return {
    currentSelection,
    refreshSelection,
    hasSelection: currentSelection.trim().length > 0,
  };
}
