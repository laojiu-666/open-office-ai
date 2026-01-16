/**
 * 测试日志控制台 Hook
 */

import { useState, useCallback } from 'react';
import type { TestLogEntry } from './types';

export function useTestConsole() {
  const [logs, setLogs] = useState<TestLogEntry[]>([]);

  const addLog = useCallback(
    (type: TestLogEntry['type'], message: string, details?: unknown) => {
      const entry: TestLogEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type,
        message,
        details,
      };
      setLogs((prev) => [...prev, entry]);
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs };
}

export default useTestConsole;
