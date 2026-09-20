import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import React, { createContext, useContext } from 'react';

const FontsContext = createContext(false);

export function useBrandFontsLoaded() {
  return useContext(FontsContext);
}

export function BrandFontsProvider({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
  });

  return <FontsContext.Provider value={loaded}>{children}</FontsContext.Provider>;
}
