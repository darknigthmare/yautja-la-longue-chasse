/** Type-only declaration used by the isolated V120 atlas TypeScript check.
 * The application bundler continues to own actual CSS module loading. */
declare module "*.module.css" {
  const styles: Readonly<Record<string,string>>;
  export default styles;
}
