import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Snackbar } from 'react-native-paper';
import { colors } from '../theme';

type Tone = 'info' | 'success' | 'error';

type FeedbackValue = {
  notify: (message: string, tone?: Tone) => void;
};

const FeedbackContext = createContext<FeedbackValue>({ notify: () => undefined });

const toneColors: Record<Tone, string> = {
  info: colors.ink,
  success: colors.success,
  error: colors.danger,
};

/** Snackbar global para feedback de mutações (guardado, erro, etc.). */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ message: string; tone: Tone } | null>(null);
  const notify = useCallback((message: string, tone: Tone = 'info') => {
    setState({ message, tone });
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        visible={Boolean(state)}
        onDismiss={() => setState(null)}
        duration={3000}
        style={{ backgroundColor: state ? toneColors[state.tone] : colors.ink }}
        action={{ label: 'OK', textColor: colors.goldLight, onPress: () => setState(null) }}
      >
        {state?.message ?? ''}
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
