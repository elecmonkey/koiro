"use client";

import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { useServerInsertedHTML } from "next/navigation";
import { useMemo } from "react";

export default function EmotionRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const cache = useMemo(() => {
    const created = createCache({ key: "css", prepend: true });
    created.compat = true;
    return created;
  }, []);

  useServerInsertedHTML(() => (
    <style
      data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(" ")}`}
      dangerouslySetInnerHTML={{
        __html: Object.values(cache.inserted).join(" "),
      }}
    />
  ));

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
