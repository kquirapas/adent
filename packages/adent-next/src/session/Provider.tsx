'use client';
//types
import type { ReactNode } from 'react';
//hooks
import { useState } from 'react';
//components
import SessionContext from './Context';
//helpers
import { getCookie, setCookie, deleteCookie } from 'cookies-next';

export type SessionProviderProps = { 
  access: Record<string, string[]>,
  children: ReactNode
};

// (this is what to put in app.tsx)
const SessionProvider: React.FC<SessionProviderProps> = (props) => {
  //extract config from props
  const { children, ...config } = props;
  const [ token, setToken ] = useState<string|undefined>(
    getCookie('session') || undefined
  );
  const change = (token?: string) => {
    if (token) {
      setCookie('token', token);
      setToken(token);
    } else {
      deleteCookie('token');
      setToken(undefined);
    }
  };
  const value = { token, change, access: config.access || {} };
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export default SessionProvider;