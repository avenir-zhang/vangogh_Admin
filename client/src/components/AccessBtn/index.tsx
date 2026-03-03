import React from 'react';
import { useAccess } from '@umijs/max';

interface AccessBtnProps {
  access: string;
  children: React.ReactNode;
}

const AccessBtn: React.FC<AccessBtnProps> = ({ access, children }) => {
  const accessState = useAccess();
  // @ts-ignore
  if (accessState[access]) {
    return <>{children}</>;
  }
  return null;
};

export default AccessBtn;
