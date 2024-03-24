//types
import type { ReactNode } from 'react';
//hooks
import { useRouter } from 'next/router';
import { useLanguage } from 'r22n';
import { useAuth } from './hooks';
//components
import { Loader } from 'frui/tailwind';
import Alert from 'frui-tailwind/Alert';

export const Authenticating = () => {
  const { _ } = useLanguage();
  return (
    <div className="p-3">
      <Alert info className="flex items-center">
        <Loader show={true} />
        <span className="ml-2">{_('Authenticating...')}</span>
      </Alert>
    </div>
  );
};

export const Unauthorized = () => {
  const { _ } = useLanguage();
  return (
    <div className="p-3">
      <Alert error>
        <h1 className="text-lg font-bold">
          {_('Unauthorized')}
        </h1>
        <p className="text-sm">
          {_('You are not authorized to view this page.')}
        </p>
      </Alert>
    </div>
  );
};

export default function Authorize({ permit, children }: { 
  permit: string[], 
  children: ReactNode 
}) {
  const router = useRouter();
  const { authorized, user } = useAuth(...permit);
  if (authorized === true) {
    return children;
  } else if (authorized === false) {
    if (!user) {
      router.push('/signin');
    }
    return <Unauthorized />;
  }
  return <Authenticating />;
};