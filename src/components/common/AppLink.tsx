import React from 'react';
import { Link, LinkProps } from 'react-router-dom';

interface AppLinkProps extends LinkProps {
  children: React.ReactNode;
}

/**
 * AppLink provides instant native touch feedback and preloading
 */
export function AppLink({ to, children, className = '', ...props }: AppLinkProps) {
  return (
    <Link
      to={to}
      className={`active:scale-95 transition-transform duration-100 ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
