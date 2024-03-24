//types
import type { FormEvent } from 'react';
//components
import Button from 'frui-tailwind/Button';
import Input from 'frui-tailwind/fields/Input';
//hooks
import { useState } from 'react';

const Search: React.FC<{ filter: Function }> = ({ filter }) => {
  //hooks
  const [ keyword, setKeyword ] = useState<string>();
  //callbacks
  const update = (input: HTMLInputElement) => setKeyword(input.value || '');
  const stop = (e: FormEvent) => {
    e.preventDefault();
    filter(keyword);
    return false;
  };
  //render
  return (
    <form className="flex items-center" onSubmit={stop}>
      <Input className="!border-b2" onChange={(e) => update(e.target)} />
      <Button info className="!border-b2 border-r border-l-0 border-y px-4 py-2" type="submit">
        <i className="text-sm fas fa-fw fa-search"></i>
      </Button>
    </form>
  );
};

export default Search;