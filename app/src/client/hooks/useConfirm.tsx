import { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  confirmPhrase?: string;
};

/**
 * Promise-based wrapper around `ConfirmDialog`.
 *
 * Replaces the native `confirm()` (blocking, unstyled) without forcing call
 * sites to hold their own open/pending state:
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ title, variant: "destructive" }))) return;
 *   ...
 *   return <>{confirmDialog}</>;
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    // A pending request is superseded rather than left dangling.
    resolveRef.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      open={options !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      title={options?.title ?? ""}
      description={options?.description}
      confirmLabel={options?.confirmLabel}
      cancelLabel={options?.cancelLabel}
      variant={options?.variant}
      confirmPhrase={options?.confirmPhrase}
      onConfirm={() => settle(true)}
    />
  );

  return { confirm, confirmDialog };
}
