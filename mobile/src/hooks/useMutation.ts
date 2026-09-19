import { useCallback, useState } from 'react';
import { useFeedback } from '../components/Feedback';

type Options<TResult> = {
  successMessage?: string | ((result: TResult) => string);
  errorMessage?: string;
  onSuccess?: (result: TResult) => void | Promise<void>;
};

/** Executa uma mutação com estado de busy/erro e feedback global (Snackbar). */
export function useMutation<TArgs extends unknown[], TResult>(
  mutation: (...args: TArgs) => Promise<TResult>,
  options: Options<TResult> = {},
) {
  const { notify } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setBusy(true);
      setError(null);
      try {
        const result = await mutation(...args);
        if (options.successMessage) {
          notify(typeof options.successMessage === 'function' ? options.successMessage(result) : options.successMessage, 'success');
        }
        await options.onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : options.errorMessage || 'Não foi possível concluir a ação.';
        setError(message);
        notify(message, 'error');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation, options.successMessage, options.onSuccess, notify],
  );

  return { run, busy, error, clearError: () => setError(null) };
}
