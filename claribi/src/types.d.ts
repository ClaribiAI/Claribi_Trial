declare module '*.jsx' {
  import { FC } from 'react';
  const Component: FC;
  export default Component;
}

declare module '*.tsx' {
  import { FC } from 'react';
  const Component: FC;
  export default Component;
}

declare module '*.js' {
  const Module: any;
  export default Module;
}

declare module '*.css' {
  const styles: { [key: string]: string };
  export default styles;
}

declare module '*.svg' {
  const content: string;
  export default content;
} 