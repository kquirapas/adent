//styles
import 'dent/globals.css';
import 'react-toastify/dist/ReactToastify.css';
//types
import type { AppProps } from 'next/app';
//components
import DentProvider from 'dent/dist/next/components/Provider';
//helpers
import access from '../access.json';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <DentProvider access={access}>
      <Component {...pageProps} />
    </DentProvider>
  );
}
