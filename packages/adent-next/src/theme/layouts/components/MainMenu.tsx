//types
import type { MouseEventHandler } from 'react';
//components
import Link from 'next/link';
import Image from 'next/image';
//hooks
import { useRouter } from 'next/router';
import { useLanguage } from 'r22n';

const MainMenu: React.FC<{ 
  open?: boolean, 
  toggleMainMenu: MouseEventHandler 
}> = ({ toggleMainMenu, open = false }) => {
  const router = useRouter();
  const { _ } = useLanguage();
  return (
    <aside className={`w-52 duration-200 absolute top-0 bottom-0 z-50 bg-[#243545] border-r border-[#111827] text-gray-400 text-sm overflow-auto md:left-0 ${open? 'left-0': '-left-64' }`}>
      <div className="px-3 flex items-center h-16 text-white">
        <Link href="/">
          <Image alt="shoppable" src="/logo-white.png" height="35" width="35" />
        </Link>
        <Link className="ml-2 uppercase flex-grow" href="/">
          IAM
        </Link>
        <button className="md:hidden block ml-3" onClick={toggleMainMenu}>
          <i className="fas fa-chevron-left"></i>
        </button>
      </div>
      <Link href="/profile" className={`${router.pathname.indexOf('/profile') === 0 ? 'text-white' : ''} block px-3 py-4 border-t border-solid border-[#1F2937] cursor-pointer`}>
        <i className="text-[#91C8D5] fas fa-fw fa-user"></i>
        <span className="inline-block pl-2">{_('Profiles')}</span>
      </Link>
    </aside>
  );
};

export default MainMenu;