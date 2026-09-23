import React from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export function BrandLogo({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="bg" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#153A63" />
          <Stop offset="0.55" stopColor="#0D2745" />
          <Stop offset="1" stopColor="#071A2D" />
        </LinearGradient>
        <LinearGradient id="gold" x1="20" y1="14" x2="44" y2="50" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#F4CF7A" />
          <Stop offset="1" stopColor="#D39A2B" />
        </LinearGradient>
      </Defs>
      <Rect x="4" y="4" width="56" height="56" rx="18" fill="url(#bg)" />
      <Path
        d="M20 50V26.5C20 18 25.2 13 32 13C38.8 13 44 18 44 26.5V50H20Z"
        stroke="url(#gold)"
        strokeWidth={4}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M25.5 49.5V29.5C25.5 24 28.2 21 32 21C35.8 21 38.5 24 38.5 29.5V49.5H25.5Z" fill="#081728" />
      <Rect x="30.5" y="16" width="3" height="17" rx="1.5" fill="#FFF7E7" />
      <Rect x="25" y="21.5" width="14" height="3" rx="1.5" fill="#FFF7E7" />
      <Path
        d="M19 47.5C23.1 43.6 27.5 41.6 32 41.6C36.5 41.6 40.9 43.6 45 47.5"
        stroke="#F6D08A"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M21.5 50.2C25.1 48.1 28.6 47 32 47C35.4 47 38.9 48.1 42.5 50.2"
        stroke="#FFF7E7"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
