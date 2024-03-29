//types
import type { MouseEventHandler } from 'react';
//components
import Toggle from '../../Toggle';

const Header: React.FC<{
  theme: string,
  toggleMainMenu: MouseEventHandler,
  toggleUserMenu: MouseEventHandler
}> = ({ theme, toggleMainMenu, toggleUserMenu }) => {
  return (
    <header className="absolute top-0 left-0 right-0 md:left-52">
      <div className="px-3 flex items-center h-16 py-2">
        <button className="md:hidden block text-xl mr-3" onClick={toggleMainMenu}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="flex-grow"></div>
        <Toggle theme={theme} />
        <button className="text-3xl ml-1" onClick={toggleUserMenu}>
          <i className="fas fa-user-circle"></i>
        </button>
      </div>
    </header>
  );
};

export default Header;