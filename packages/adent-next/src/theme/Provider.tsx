'use client';
//types
import type { ReactNode } from 'react';
//hooks
import { useState, useEffect } from 'react';
//components
import ThemeContext from './Context';
//helpers
import { getCookie, setCookie } from 'cookies-next';

export type ThemeProviderProps = { 
  children: ReactNode 
};

// (this is what to put in app.tsx)
const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [ theme, setTheme ] = useState('light');
  const toggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setCookie('theme', newTheme);
  };
  const value = { theme, toggle };
  useEffect(() => {
    setTheme(getCookie('theme') as string || 'light');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;