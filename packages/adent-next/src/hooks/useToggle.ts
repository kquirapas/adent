import { useState } from 'react'; 

export default function useToggle(ison = false) {
  const [ on, isOn ] = useState(ison);
  const toggle = () => isOn(on => !on);
  return [ on, toggle ] as [ boolean, () => void ];
};