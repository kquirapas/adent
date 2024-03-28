export type ProjectSettings = {
  name: string,
  module: string;
  lang: string;
  dbengine: string;
  dburl: {
      type: string;
      value: string;
  };
  router: string;
  path: string;
}