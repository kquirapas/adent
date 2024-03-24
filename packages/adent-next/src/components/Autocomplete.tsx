//types
import type { KeyboardEvent } from 'react';
import type { SelectOption } from 'frui-tailwind/fields';
//components
import Input from 'frui-tailwind/fields/Input';
//hooks
import React, { useState } from 'react';
import { useLanguage } from 'r22n';

export type SelectDropdownProps = { 
  show: Function,
  showing: boolean,
  supplier?: boolean,
  onSearch: (query: string, done: Function) => void,
  onUpdate: (option: SelectOption) => void,
  setSelected: Function
};

export type FieldSelectProps = {
  className?: string, 
  value?: SelectOption,
  onSearch: (query: string, done: Function) => void,
  onUpdate: (option: SelectOption) => void,
  width?: string,
  label?: string,
  error?: boolean
};


/**
 * Select Dropdown - Can be used separately (like in autocomplete)
 */
export const SelectDropdown: React.FC<SelectDropdownProps> = (props) => {
  const { show, showing, onSearch, onUpdate, setSelected } = props;
  //hooks
  const [ loading, isLoading ] = useState(false);
  const [ options, setOptions ] = useState<SelectOption[]>([]);
  //handlers
  const handlers = {
    select: (option: SelectOption) => {
      show(false);
      setSelected(option);
      onUpdate(option);
    },
    search: (e: KeyboardEvent) => {
      if (loading) return;
      isLoading(true);
      setTimeout(() => {
        const input = e.target as HTMLInputElement;
        onSearch(input.value, (options: SelectOption[]) => {
          isLoading(false);
          setOptions(options);
        });
      });
    }
  };
  
  return (
    <div className={`${showing? '': 'hidden'} absolute w-full border-l border-r border-gray-600 bg-b1 dark:bg-b2`}>
      <div className="flex items-center">
        <div className="flex-grow flex items-center">
          <Input className="!border-b2 mt-2 mb-2 ml-2" onKeyUp={handlers.search} />
          <span className="p-2 bg-white mr-2">
            <i className="fas fa-fw fa-search text-gray-700"></i>
          </span>
        </div>
      </div>
      <div className="overflow-auto max-h-64">
        {options.map((option, i) => (
          <div 
            key={i} 
            onClick={_ => handlers.select(option)} 
            className="flex items-center px-3 py-2 border-b border-b2 cursor-pointer"
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Autocomplete (Main)
 */
const Autocomplete: React.FC<FieldSelectProps> = (props) => {
  //props
  const { 
    className,
    onSearch,
    onUpdate, 
    value,
    width,
    label,
    error
  } = props;
  //hooks
  const { _ } = useLanguage();
  const [ selected, setSelected ] = useState(value);
  const [ showing, show ] = useState(false);
  //variables
  const rowClassNames = [ 'relative', className ];
  const inputClassNames = ['!border-b2 flex items-center bg-white p-2 w-full'];
  if (error) {
    rowClassNames.push('text-red-600');
    inputClassNames.push('text-red-700');
  } else {
    inputClassNames.push('text-black');
  }
  if (width) {
    rowClassNames.push(`w-${width}`);
  }
  //handlers
  const toggle = () => show(!showing);
  //render
  return (
    <div className={rowClassNames.join(' ')}>
      {label?.length && (<label className="block">{label}</label>)}
      <Input 
        className={inputClassNames.join(' ')}
        readOnly={true}
        value={String(selected?.label || value?.label || _('Search'))} 
        onClick={toggle}
      />
      <SelectDropdown 
        onSearch={onSearch}
        show={show} 
        showing={showing} 
        onUpdate={onUpdate} 
        setSelected={setSelected}
      />
    </div>
  );
};

export default Autocomplete;