import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import React, { createContext, useContext } from 'react';

const FontsContext = createContext(false);

export function useBrandFontsLoaded() {
  return useContext(FontsContext);
}

export function BrandFontsProvider({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
  });

  return <FontsContext.Provider value={loaded}>{children}</FontsContext.Provider>;
}
