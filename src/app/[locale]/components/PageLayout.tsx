'use client';

import {ReactNode} from 'react';

type Props = {
  title: string;
  children: ReactNode;
};

export default function PageLayout({title, children}: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      <div>{children}</div>
    </div>
  );
}
