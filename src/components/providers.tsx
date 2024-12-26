'use client';

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { DayPickerProvider } from 'react-day-picker';

export interface ProvidersProps {
  children: React.ReactNode;
  theme?: ThemeProviderProps;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <DayPickerProvider
          initialProps={{
            mode: "single",
            fromYear: 2020,
            toYear: 2030,
            captionLayout: "dropdown"
          }}
        >
          {children}
        </DayPickerProvider>
      </SessionProvider>
    </NextThemesProvider>
  );
}