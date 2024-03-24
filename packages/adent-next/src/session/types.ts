export type Response<T = any> = {
  error: boolean,
  code?: number,
  message?: string, 
  errors?: Record<string, any>,
  results?: T,
  total?: number
};

export type Session = { 
  id: number, 
  slug: string, 
  name: string,
  email?: string,
  phone?: string, 
  roles: string[] 
};

export type FormConfig = {
  //ie. post
  method?: string,
  //ie. /user/create
  path: string,
  //default values
  defaults?: Record<string, any>
};

export type FlagConfig = {
  //ie. post
  method?: string,
  //ie. /user/remove
  path: string
};

export type SearchConfig = {
  //ie. post
  method?: string,
  //ie. /user/search
  path: string,
  filters?: Record<string, any>,
  sort?: Record<string, string>,
  skip?: number,
  take?: number,
  auto?: boolean
};