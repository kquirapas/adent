//types
import type { ReactNode } from 'react';
//hooks
import { useLanguage } from 'r22n';
//components
import Button from 'frui-tailwind/Button'

const Confirm = ({ open, message, confirmed }: { 
  open: Function,
  message: ReactNode
  confirmed: Function
}) => {
  const { _ } = useLanguage();
  
  return (
    <div className="p-4 mt-2 border-t border-[#1F2937]">
      <p className="text-lg">{message}</p>
      <p className="text-[#666666] dark:text-[#DDDDDD]">
        {_('This action cannot be undone.')}
      </p>
      <Button success className="mt-4 rounded-lg uppercase font-semibold mr-4" onClick={() => {
        open(false);
        confirmed();;
      }}>
        <i className="fas fa-fw fa-check mr-2"></i>
        {_('Confirm')}
      </Button>
      <Button danger className="mt-4 rounded-lg uppercase font-semibold" onClick={() => open(false)}>
        <i className="fas fa-fw fa-ban mr-2"></i>
        {_('Cancel')}
      </Button>
    </div>
  )
};

export default Confirm;