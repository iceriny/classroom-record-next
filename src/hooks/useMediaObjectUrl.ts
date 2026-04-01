import { useEffect, useState } from "react";

import { getMediaBlob } from "../lib/mediaStorage";

export function useMediaObjectUrl(mediaId: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl = "";
    let disposed = false;

    (async () => {
      const blob = await getMediaBlob(mediaId);
      if (!blob || disposed) {
        setUrl(null);
        return;
      }

      revokedUrl = URL.createObjectURL(blob);
      setUrl(revokedUrl);
    })();

    return () => {
      disposed = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [mediaId]);

  return url;
}
