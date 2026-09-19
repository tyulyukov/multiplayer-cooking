import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Thumbnails in a message; tapping one opens the full photo in a dialog.
export function PhotoStrip({ urls, alt }: { urls: readonly string[]; alt: string }) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  if (urls.length === 0) {
    return null;
  }

  return (
    <>
      <div className="photo-strip" data-count={urls.length}>
        {urls.map((url, index) => (
          <button
            key={url}
            type="button"
            className="photo-thumb"
            aria-label={`Відкрити фото ${index + 1}`}
            onClick={() => setOpenUrl(url)}
          >
            <img src={url} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
      <Dialog open={openUrl !== null} onOpenChange={(open) => !open && setOpenUrl(null)}>
        <DialogContent className="photo-lightbox" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          {openUrl && <img src={openUrl} alt={alt} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
