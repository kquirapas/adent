//hooks
import { useEffect } from 'react';
import { useTheme } from '../hooks';
//components
import Image from 'next/image';
import Toggle from '../Toggle';
import { ToastContainer } from '../../notify';
//others
import { unload } from '../../notify';

const LayoutBlank: React.FC<{
  head?: React.FC,
  children?: React.ReactNode
}> = props => {
  const { theme } = useTheme();
  //unload flash message
  useEffect(unload, []);
  return (
    <section className={`${theme} bg-b1 text-t1 relative w-full h-full overflow-hidden`}>
      <>{props.head && <props.head />}</>
      <header className="flex items-center p-2">
        <div className="flex-grow flex items-center">
          {theme === 'dark' ? (
            <Image alt="shoppable" src="/logo-white.png" height="35" width="35" />
          ) : (
            <Image alt="shoppable" src="/logo.png" height="35" width="35" />
          )}
          <div className="ml-2 uppercase flex-grow">
            IAM
          </div>
        </div>
        <div className="inline-block">
          <Toggle theme={theme} />
        </div>
      </header>
      <section className="absolute top-12 bottom-0 left-0 right-0 w-full">
        {props.children}
      </section>
      <ToastContainer />
    </section>
  );
};

export default LayoutBlank;