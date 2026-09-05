import type { AnchorHTMLAttributes } from "react";

/** Desktop routes are local documents, without a Next server or router. */
export default function LocalLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
