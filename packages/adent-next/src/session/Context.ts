import { createContext } from 'react';

export type SessionContextProps = { 
  token: string|undefined,
  access: Record<string, string[]>,
  change: (token: string) => void
};

const SessionContext = createContext<SessionContextProps>({
  token: '', 
  access: {},
  change: (token?: string) => {}
});

export default SessionContext;