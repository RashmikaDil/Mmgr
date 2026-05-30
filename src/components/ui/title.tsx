import React from 'react';

interface TitleProps {
  children: React.ReactNode;
  className?: string;
}

export const Title: React.FC<TitleProps> = ({ children, className }) => {
  return (
    <h1 className={`text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 ${className}`}> {children} </h1>
  );
};
