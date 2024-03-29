//types
import type { FormEvent } from 'react';
import type { 
  Response, 
  Session,
  FormConfig, 
  FlagConfig, 
  SearchConfig
} from './types';
//hooks
import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { useLanguage } from 'r22n';
//components
import SessionContext from './Context';
//session
import jwt from 'jsonwebtoken';
//helpers
import Hash from '../Hash';

function toQuery(object: Record<string, any>, prefix?: string): string {
  var query = [];
  for (const property in object) {
    if (object.hasOwnProperty(property)) {
      const key = prefix ? `${prefix}[${property}]` : property;
      const value = object[property];
      query.push((value !== null && typeof value === 'object') 
        ? toQuery(value, key) 
        : `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      );
    }
  }
  return query.join('&');
}

export function useSession() {
  const { token, access, change } = useContext(SessionContext);
  const [ user, set ] = useState<Session>();

  const can = (...permits: string[]) => {
    if (permits.length === 0) {
      return true;
    }
    const roles = user?.roles || [ 'GUEST' ];
    const permissions = roles.map(
      //ie. [ ['GUEST', 'USER'], ['USER', 'ADMIN'] ]
      role => access[role] || []
    ).flat().filter(
      //unique
      (value, index, self) => self.indexOf(value) === index
    );
      
    return Array.isArray(permits) && permits.every(
      permit => permissions.includes(permit)
    );
  };

  useEffect(() => {
    if (!token) {
      set(undefined);
      return;
    }
    const user = jwt.decode(token) as Record<string, any>;
    if (!user?.id || !user?.slug || !user?.name) {
      set(undefined);
      return;
    }
    set(user as Session);
  }, [ token ]);
  return { token, user, can, change };
};

export function useAuth(...permits: string[]) {
  const { token, user, can, change } = useSession();
  const [ authorized, authorize ] = useState<boolean>(true);

  useEffect(() => {
    authorize(can(...permits));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ permits ]);
  return { authorized, token, user, change };
};

export function useForm<Model>(config: FormConfig) {
  const { method = 'post', path, defaults } = config;
  //hooks
  const { _ } = useLanguage();
  const { token } = useSession();
  const [ data, setData ] = useState<Record<string, any>>(defaults || {});
  const [ error, setError ] = useState<string>();
  const [ errors, setErrors ] = useState<Record<string, string>>({});
  const [ processing, process ] = useState(false);
  const [ results, setResults ] = useState<Model>();
  const handlers = {
    set: {
      data: setData,
      process: process,
      error: setError,
      errors: setErrors,
      results: setResults
    },
    change: (name: string, value: any) => {
      setData(data => ({ ...data, [name]: value }));
    },
    action: async (): Promise<Response<Model>> => {
      if (processing) {
        return {
          error: true,
          message: _('Already processing')
        };
      }
      process(true);
      const input = Object.fromEntries(Object.entries(data).filter(
        ([_, value]) => typeof value !== 'undefined'
      ));
      const payload = await fetch(path, { 
        method, 
        body: JSON.stringify(input),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const response = await payload.json() as Response<Model>;
      process(false);
      setError(response.error ? response.message: undefined);
      setErrors(response.errors || {});
      setResults(response.results);
      return response;
    },
    submit: (e: FormEvent) => {
      e.preventDefault();
      handlers.action();
      return false;
    }
  };

  return { 
    _,
    token, 
    handlers, 
    data, 
    processing, 
    error, 
    errors, 
    results 
  };
};

export function useFlag<Model>(config: FlagConfig) {
  const { method = 'get', path } = config;
  const router = useRouter();
  //in path, look for flags
  const matches = Array.from(path.matchAll(/\[([a-zA-Z0-9_]+)\]/g));
  //hooks
  const { _ } = useLanguage();
  const { token } = useSession();
  const [ error, setError ] = useState<string>();
  const [ endpoint, setEndpoint ] = useState<string>();
  const [ processing, process ] = useState(false);
  const [ results, setResults ] = useState<Model>();
  //variables
  const handlers = {
    set: {
      error: setError,
      results: setResults,
      process: process
    },
    action: async (): Promise<Response<Model>> => {
      if (!endpoint) {
        return {
          error: true,
          message: _('Invalid endpoint')
        };
      } else if (processing) {
        return {
          error: true,
          message: _('Already processing')
        };
      }
      process(true);
      const payload = await fetch(endpoint, { 
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const response = await payload.json() as Response<Model>;
      process(false);
      setError(response.error ? response.message: undefined);
      setResults(response.results);
      return response;
    },
    submit: (e: FormEvent) => {
      e.preventDefault();
      handlers.action();
      return false;
    }
  };
  //effects
  useEffect(() => {
    if (router.isReady) {
      if (matches.length) {
        let endpoint = path;
        //replace template variables with values from router.query
        matches.forEach(match => {
          endpoint = path.replace(match[0], router.query[match[1]] as string);
        });
        //update endpoint
        setEndpoint(endpoint);
      } else {
        setEndpoint(path);
      }
    }
  }, [ router.isReady ]);
  //return
  return { 
    _,
    token, 
    endpoint,
    handlers, 
    processing, 
    error, 
    results 
  };
};

export function useDetail<Model>(config: FlagConfig) {
  const { method = 'get', path } = config;
  const { 
    _,
    token, 
    endpoint,
    handlers, 
    processing, 
    error, 
    results 
  } = useFlag<Model>({ method, path });
  //effects
  useEffect(() => {
    if (!endpoint) return;
    handlers.action();
  }, [ endpoint ])
  return { 
    _,
    token, 
    handlers, 
    processing, 
    error, 
    results
  };
};

export function useSearch<Model>(config: SearchConfig) {
  const { 
    method = 'get',
    path,
    auto = true,
    filters: defaultFilters = {},
    sort: defaultOrder = {},
    skip: defaultSkip = 0,
    take: defaultTake = 50
  } = config;
  
  //hooks
  const { token } = useSession();
  const [ skip, offset ] = useState(defaultSkip);
  const [ take, limit ] = useState(defaultTake);
  const [ filters, filterBy ] = useState<Record<string, any>>(defaultFilters);
  const [ order, orderBy ] = useState<Record<string, string>>(defaultOrder);
  const [ processing, process ] = useState(false);
  const [ error, setError ] = useState<string>();
  const [ rows, setRows ] = useState<Model[]>();
  const [ total, setTotal ] = useState();
  const [ opened, open ] = useState(false);
  //variables
  const results = { filters, order, rows, total, skip, take };
  const handlers = {
    set: {
      error: setError,
      filters: filterBy,
      order: orderBy,
      rows: setRows,
      total: setTotal,
      process: process
    },
    filter: (key: string, value: any) => {
      filterBy(filters => {
        const store = new Hash({ ...filters });
        if (typeof value === 'undefined' || value === null || value === '') {
          store.withPath.remove(key);
        } else {
          store.withPath.set(key, value);
        }
        return store.get();
      });
    },
    sort: (key: string) => {
      orderBy(order => {
        const store = new Hash({ ...order });
        if (!store.withPath.has(key)) {
          store.withPath.set(key, 'asc');
        } else if (store.withPath.get(key) === 'asc') {
          store.withPath.set(key, 'desc');
        } else {
          store.withPath.remove(key);
        }
        return store.get() as Record<string, string>;
      });
    },
    offset,
    limit,
    open,
    action: async () => {
      if (processing) return;
      process(true);
      const query = toQuery({
        filters, 
        order, 
        skip, 
        take
      });
      const payload = await fetch(`${path}?${query}`, { 
        method, 
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const response = await payload.json() as Response<Model[]>;
      process(false);
      setError(response.error ? response.message: undefined);
      setRows(response.results);
      return response;
    },
    submit: (e: FormEvent) => {
      e.preventDefault();
      handlers.action();
      return false;
    }
  };
  //effects
  useEffect(() => {
    if (!auto) return;
    handlers.action();
  }, [ auto, order, filters, skip, take ]);

  return { 
    token,
    processing,
    handlers, 
    results,
    error,
    opened
  };
};
