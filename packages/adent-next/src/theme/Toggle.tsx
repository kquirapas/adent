'use client';
//hooks
import { useState, useEffect } from 'react';
import { useTheme } from './hooks';

export default function ThemeToggle({ theme: defaults }: { theme: string }) {
  const [ current, setCurrent ] = useState(defaults);
  const { theme, toggle } = useTheme();
  useEffect(() => {
    setCurrent(theme);
  }, [ theme ]);
  return (
    <div 
      className={`flex justify-center items-center w-7 h-7 rounded-full text-white ${current === 'dark' ? 'bg-gray-600': 'bg-orange-600'} mr-1`}
      onClick={() => toggle()}
    >
      <i className={`fas fa-${current === 'dark' ? 'moon': 'sun'}`}></i>
    </div>
  );
};