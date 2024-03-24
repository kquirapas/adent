import type { ReactNode } from 'react';
//components
import { R22nProvider } from 'r22n';
import { SessionProvider } from '../session';
import { ThemeProvider } from '../theme';
import { ModalProvider } from '../modal';

export default function DentProvider({ access, children }: { 
  access: Record<string, string[]>,
  children: ReactNode
}) {
  const modal = [
    'border-2 p-4 bg-[#EBF0F6] border-[#C8D5E0] text-[#222222]',
    'dark:bg-[#090D14] dark:border-[#1F2937] dark:text-[#DDDDDD]'
  ];
  return (
    <SessionProvider access={access}>
      <R22nProvider>
        <ThemeProvider>
          <ModalProvider className={modal.join(' ')}>
            {children}
          </ModalProvider>
        </ThemeProvider>
      </R22nProvider>
    </SessionProvider>
  );
}
