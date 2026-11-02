"use client";

import { useRef, useState } from "react";
import { removeMemberPhoto, uploadMemberPhoto } from "@/lib/photo-actions";

const SIZE = 512;

/** Ořízne obrázek na čtverec, zmenší na 512 px a zakóduje do WebP. */
async function toWebp(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("webp"))), "image/webp", 0.82));
}

export default function PhotoEditor({ memberId, name, initialUrl }: { memberId: string; name: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const blob = await toWebp(file);
      const form = new FormData();
      form.set("photo", blob, "photo.webp");
      const r = await uploadMemberPhoto(memberId, form);
      if (!r.ok) setError(r.error ?? "Uložení fotky se nepodařilo.");
      else setUrl(URL.createObjectURL(blob));
    } catch {
      setError("Tento soubor se nepodařilo zpracovat. Zkus fotku ve formátu JPG nebo PNG.");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  const remove = async () => {
    setBusy(true);
    setConfirming(false);
    const r = await removeMemberPhoto(memberId);
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Smazání se nepodařilo.");
    setUrl(null);
  };

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex h-32 w-32 items-center justify-center overflow-hidden border border-line bg-black/20 text-3xl text-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Fotka: ${name}`} width={128} height={128} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept="image/*" className="sr-only" id={`photo-${memberId}`} onChange={(e) => pick(e.target.files?.[0])} disabled={busy} />
        <label
          htmlFor={`photo-${memberId}`}
          className={`cursor-pointer border border-line px-3 py-1.5 text-sm hover:border-accent hover:text-accent ${busy ? "pointer-events-none opacity-50" : ""}`}
        >
          {busy ? "Ukládám…" : url ? "Změnit fotku" : "Nahrát fotku"}
        </label>
        {url && !confirming && (
          <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="px-2 py-1.5 text-sm text-muted hover:text-accent disabled:opacity-50">
            Smazat
          </button>
        )}
        {confirming && (
          <span className="flex items-center gap-2 text-sm">
            Smazat fotku?
            <button type="button" onClick={remove} className="border border-line px-2 py-1 hover:border-accent hover:text-accent">
              Ano
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1 text-muted hover:text-accent">
              Zrušit
            </button>
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
