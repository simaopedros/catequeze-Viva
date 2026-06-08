import { useEffect } from 'react';
import { loadHimetricaScripts } from './himetrica';

export default function HimetricaScripts() {
  useEffect(() => {
    loadHimetricaScripts();
  }, []);

  return null;
}
