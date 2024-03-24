import type { FormEvent } from 'react';
export type ResponsePayload<T = any> = {
  error: boolean,
  code?: number,
  message?: string, 
  errors?: Record<string, any>,
  results?: T,
  total?: number
};
export type FieldProps = {
  className?: string,
  error?: boolean,
  value: any,
  change: (name: string, value: any) => void
};

export type ControlProps = {
  className?: string,
  error?: string,
  value: any,
  change: (name: string, value: any) => void
}

export type FormProps = { 
  change: (name: string, value: any) => void, 
  action: (e: FormEvent<Element>) => boolean, 
  data: Record<string, any>, 
  processing: boolean, 
  errors: Record<string, string>
};

export type PermissionList = Record<string, string[]>;
export type SessionData = Record<string, any> & { 
  id: string, 
  roles: string[]
};
export type Session = SessionData & {
  token: string
};
export type SearchParams = {
  where?: Record<string, any>,
  sort?: Record<string, any>,
  skip?: number,
  take?: number
};
