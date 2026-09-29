import { useEffect } from "react";

/**
 * Sets the page's `<title>` and meta description while the page is shown, and restores the
 * previous values when it goes (the SPA shares one document between routes).
 */
export function useDocumentMeta(title: string, description: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = meta === null;
    if (meta === null) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.append(meta);
    }
    const previousDescription = meta.content;

    document.title = title;
    meta.content = description;

    return () => {
      document.title = previousTitle;
      if (created) {
        meta.remove();
      } else {
        meta.content = previousDescription;
      }
    };
  }, [title, description]);
}
