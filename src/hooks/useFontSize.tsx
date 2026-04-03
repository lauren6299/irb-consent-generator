import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_KEY = 'app-font-size';

const FontSizeContext = createContext<{
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}>({ fontSize: 'small', setFontSize: () => {} });

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    try {
      const stored = localStorage.getItem(FONT_SIZE_KEY);
      if (stored === 'small' || stored === 'medium' || stored === 'large') return stored;
    } catch {}
    return 'small';
  });

  useEffect(() => {
    try { localStorage.setItem(FONT_SIZE_KEY, fontSize); } catch {}
    const root = document.documentElement;
    root.classList.remove('font-scale-small', 'font-scale-medium', 'font-scale-large');
    root.classList.add(`font-scale-${fontSize}`);
  }, [fontSize]);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export const useFontSize = () => useContext(FontSizeContext);
