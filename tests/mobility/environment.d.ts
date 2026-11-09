/** Only the isolated TypeScript check needs CSS module types; Next supplies these in production. */
declare module '*.module.css' { const names: Record<string,string>; export default names; }
