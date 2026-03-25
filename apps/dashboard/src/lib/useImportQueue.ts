import { useCallback, useState } from "react";

export interface ImportConflict<T> {
  item: T;
  remaining: T[];
  imported: number;
}

interface UseImportQueueOptions<T> {
  mutate: (
    data: T & { overwrite: boolean },
    callbacks: {
      onSuccess: () => void;
      onError: (err: unknown) => void;
    },
  ) => void;
  messages: {
    importSuccess: string;
    importError: string;
  };
}

export function useImportQueue<T extends { name: string }>({
  mutate,
  messages,
}: UseImportQueueOptions<T>) {
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ImportConflict<T> | null>(null);

  const processQueue = useCallback(
    function process(queue: T[], imported: number) {
      if (queue.length === 0) {
        if (imported > 0) {
          setAlertMessage(messages.importSuccess.replace("{n}", String(imported)));
        }
        return;
      }

      const [current, ...remaining] = queue;
      mutate(
        { ...current, overwrite: false },
        {
          onSuccess: () => process(remaining, imported + 1),
          onError: (err: unknown) => {
            const status =
              err && typeof err === "object" && "status" in err
                ? (err as { status: number }).status
                : 0;
            if (status === 409) {
              setConflict({ item: current, remaining, imported });
            } else {
              setAlertMessage(messages.importError);
              process(remaining, imported);
            }
          },
        },
      );
    },
    [mutate, messages],
  );

  const handleConflictOverwrite = useCallback(() => {
    if (!conflict) return;
    const { item, remaining, imported } = conflict;
    setConflict(null);
    mutate(
      { ...item, overwrite: true },
      {
        onSuccess: () => processQueue(remaining, imported + 1),
        onError: () => {
          setAlertMessage(messages.importError);
          processQueue(remaining, imported);
        },
      },
    );
  }, [conflict, mutate, processQueue, messages]);

  const handleConflictRename = useCallback(
    (newName: string) => {
      if (!conflict) return;
      const { item, remaining, imported } = conflict;
      setConflict(null);
      processQueue([{ ...item, name: newName }, ...remaining], imported);
    },
    [conflict, processQueue],
  );

  const handleConflictSkip = useCallback(() => {
    if (!conflict) return;
    const { remaining, imported } = conflict;
    setConflict(null);
    processQueue(remaining, imported);
  }, [conflict, processQueue]);

  return {
    alertMessage,
    setAlertMessage,
    conflict,
    processQueue,
    handleConflictOverwrite,
    handleConflictRename,
    handleConflictSkip,
  };
}
