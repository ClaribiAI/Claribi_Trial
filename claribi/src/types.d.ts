declare module '*.jsx' {
  const Component: any;
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