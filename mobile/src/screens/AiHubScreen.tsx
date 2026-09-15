import React from 'react';
import { EmptyState, Screen, ScreenTitle } from '../components/ui';

export function AiHubScreen() {
  return (
    <Screen testID="ai-hub-screen">
      <ScreenTitle
        title="Assistência editorial"
        subtitle="A geração com IA está desativada nesta fase de lançamento da plataforma."
      />
      <EmptyState
        title="Disponível na web"
        body="Quando a assistência editorial for reativada, os planos de encontro e o chat abrem na Catequese Viva web — não há fluxo móvel paralelo."
      />
    </Screen>
  );
}
