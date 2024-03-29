//hooks
import { useEffect } from 'react';
import { useTheme } from '../../theme';
import { useToggle } from '../../hooks';
import { useSession } from '../../session';
//components
import { ToastContainer } from '../../notify';
import Header from './components/Header';
import MainMenu from './components/MainMenu';
import UserMenu from './components/UserMenu';
//others
import { unload } from '../../notify';

const LayoutPanel: React.FC<{
  head?: React.FC,
  children?: React.ReactNode
}> = props => {
  const [ mainOpened, mainToggle ] = useToggle();
  const [ userOpened, userToggle ] = useToggle();
  const { user } = useSession();
  const { theme } = useTheme();
  //unload flash message
  useEffect(unload, []);
  return (
    <section className={`${theme} bg-b0 text-t1 relative w-full h-full overflow-hidden`}>
      <>{props.head && <props.head />}</>
      <Header 
        theme={theme}
        toggleMainMenu={mainToggle} 
        toggleUserMenu={userToggle}
      />
      <MainMenu open={mainOpened} toggleMainMenu={mainToggle}  />
      <UserMenu open={userOpened} toggleUserMenu={userToggle} user={user} />
      <section className="absolute top-16 bottom-0 left-0 md:left-52 right-0">
        {props.children}
      </section>
      <ToastContainer />
    </section>
  );
};

export { Header, MainMenu, UserMenu };

export default LayoutPanel;