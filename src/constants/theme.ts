/**
 * Jellyboxd design system — Apple TV+ inspired.
 * Pure black canvas, white typography, translucent grays, no accent color:
 * primary actions are white pills with black labels.
 */
import { Platform, TextStyle } from 'react-native';

export const Palette = {
  background: '#000000',
  surface: '#1c1c1e',
  surfaceElevated: '#2c2c2e',
  surfacePressed: '#3a3a3c',
  separator: 'rgba(84, 84, 88, 0.6)',

  label: '#ffffff',
  labelSecondary: 'rgba(235, 235, 245, 0.6)',
  labelTertiary: 'rgba(235, 235, 245, 0.3)',

  fill: 'rgba(120, 120, 128, 0.36)',
  fillSecondary: 'rgba(120, 120, 128, 0.24)',
  glass: 'rgba(255, 255, 255, 0.18)',

  buttonPrimary: '#ffffff',
  buttonPrimaryLabel: '#000000',

  progressTrack: 'rgba(255, 255, 255, 0.3)',
  progressFill: '#ffffff',

  scrim: 'rgba(0, 0, 0, 0.55)',
  star: '#ffcc00',
  destructive: '#ff453a',
  warning: '#ff9f0a',
} as const;

/** Apple HIG-derived type scale, titles slightly tightened (SF Pro is the iOS system font). */
export const Typography = {
  largeTitle: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: 0.3 },
  title1: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: 0.3 },
  title2: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: 0.3 },
  title3: { fontSize: 18, lineHeight: 23, fontWeight: '600', letterSpacing: 0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400', letterSpacing: 0.07 },
} as const satisfies Record<string, TextStyle>;

export const Radius = {
  small: 6,
  card: 10,
  large: 14,
  pill: 999,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Horizontal page gutter used by every shelf and header. */
export const Gutter = 20;

// Legacy template tokens, kept for the themed-* helpers.
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: Palette.label,
    background: Palette.background,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.surfaceElevated,
    textSecondary: Palette.labelSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
