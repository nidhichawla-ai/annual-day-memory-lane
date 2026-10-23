import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RPS Annual Day Avatar Booth" },
      { name: "description", content: "Snap a live photo and turn it into a fun avatar for RPS Annual Day." },
      { property: "og:title", content: "RPS Annual Day Avatar Booth" },
      { property: "og:description", content: "Snap a live photo and turn it into a fun avatar for RPS Annual Day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const AVATARS = [
  { name: "Cartoon", emoji: "🎨", prompt: "a bright glossy 3D Pixar-movie-style cartoon character with big sparkling eyes, soft studio lighting, joyful expression" },
  { name: "Superhero", emoji: "🦸", prompt: "a mighty comic-book superhero in a dynamic pose, flowing red cape, glowing chest emblem, dramatic lightning and city skyline behind" },
  { name: "Anime", emoji: "🌸", prompt: "a colorful anime hero with huge expressive eyes, flowing hair, cherry blossom petals and sparkles floating around, vibrant manga art style" },
  { name: "Astronaut", emoji: "🚀", prompt: "a brave astronaut in a detailed white space suit with glowing visor reflections, floating among colorful nebulae, planets and shooting stars" },
  { name: "Royal", emoji: "👑", prompt: "a majestic royal monarch with an ornate golden jeweled crown, ruby velvet robes, palace throne room behind, rich oil-painting style" },
  { name: "Pixel", emoji: "👾", prompt: "a charming retro 16-bit pixel-art video game hero, chunky pixels, glowing arcade game screen background with coins and power-ups" },
  { name: "Wizard", emoji: "🔮", prompt: "a wise young wizard with a pointed star hat, swirling glowing magic spell in hand, floating spell books and purple sparkling magic energy" },
  { name: "Rockstar", emoji: "🎸", prompt: "a cool rockstar with spiky hair, leather jacket and electric guitar, neon stage lights, laser beams and confetti exploding behind" },
  { name: "Cricket Star", emoji: "🏏", prompt: "a cricket superstar in a glowing team jersey holding a golden bat aloft, roaring stadium floodlights and cheering crowd behind, triumphant celebration" },
  { name: "Hogwarts", emoji: "⚡", prompt: "a Harry Potter movie style young wizard student wearing black Hogwarts school robes, red and gold striped scarf, round glasses, holding a wooden wand with glowing spell, magical castle great hall with floating candles behind, cinematic movie still" },
];

function Index() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camOn, setCamOn] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [style, setStyle] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [final, setFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);

  const startCam = async () => {
    setError(null);
    setQr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 720, height: 720 } });
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      });
    } catch {
      setError("Couldn't open the camera. Please allow camera access.");
    }
  };

  const stopCam = () => {
    const s = videoRef.current?.srcObject as MediaStream | null;
    s?.getTracks().forEach((t) => t.stop());
    setCamOn(false);
  };

  useEffect(() => () => stopCam(), []);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement("canvas");
    c.width = c.height = 512; // small = faster
    const ctx = c.getContext("2d")!;
    ctx.translate(512, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, 512, 512);
    c.toBlob((b) => {
      if (!b) return;
      setPhoto(b);
      setPhotoUrl(URL.createObjectURL(b));
      setResult(null);
      setFinal(false);
      setQr(null);
      stopCam();
    }, "image/jpeg", 0.85);
  };

  const runId = useRef(0);

  const makeQr = async (src: string, id: number) => {
    setQrBusy(true);
    try {
      const res = await fetch("/api/share-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: src }),
      });
      if (!res.ok) throw new Error("Couldn't make the QR code");
      const { id: photoId } = (await res.json()) as { id: string };
      const code = await QRCode.toDataURL(`${window.location.origin}/photo/${photoId}`, { width: 448, margin: 1 });
      if (runId.current === id) setQr(code);
    } catch (e) {
      if (runId.current === id) setError(e instanceof Error ? e.message : "Couldn't make the QR code");
    } finally {
      if (runId.current === id) setQrBusy(false);
    }
  };

  const make = async () => {
    if (!photo) return;
    const id = ++runId.current;
    setBusy(true);
    setError(null);
    setResult(null);
    setFinal(false);
    setQr(null);
    setQrBusy(false);
    const form = new FormData();
    form.append("image", new File([photo], "photo.jpg", { type: "image/jpeg" }));
    form.append(
      "prompt",
      `Turn the person in this photo into ${AVATARS[style]!.prompt}. Keep their face, hairstyle and expression recognizable. IMPORTANT: add a big bold festive banner in the background that clearly reads "ROOTED IN PRAGYA" in large colorful glowing celebration letters — the text must be spelled exactly "ROOTED IN PRAGYA". Head and shoulders portrait, vibrant colors.`,
    );
    form.append("quality", "low");
    form.append("size", "1024x1024");
    form.append("partial_images", "1");
    let last: string | null = null;
    try {
      await streamImage("/api/edit-image", form, (src, isFinal) => {
        if (runId.current !== id) return;
        setResult(src);
        setFinal(isFinal);
        if (isFinal) last = src;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
    if (last && runId.current === id) void makeQr(last, id);
  };

  return (
    <main className="min-h-screen bg-festive px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">RPS Annual Day</p>
          <h1 className="mt-2 font-display text-5xl font-bold text-foreground md:text-6xl">Avatar Booth</h1>
          <p className="mt-3 text-muted-foreground">1. Take a live photo · 2. Pick an avatar · 3. Download!</p>
        </header>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="card-pop aspect-square overflow-hidden">
            {camOn ? (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            ) : photoUrl ? (
              <img src={photoUrl} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <span className="text-6xl">📸</span>
                <span>Your photo appears here</span>
              </div>
            )}
          </div>
          <div className="card-pop aspect-square overflow-hidden">
            {result ? (
              <img
                src={result}
                alt="Your avatar"
                className={`h-full w-full object-cover transition-[filter] duration-500 ${final ? "blur-0" : "blur-2xl"}`}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <span className={`text-6xl ${busy ? "animate-bounce" : ""}`}>{AVATARS[style]!.emoji}</span>
                <span>{busy ? "Creating your avatar…" : "Your avatar appears here"}</span>
              </div>
            )}
          </div>
        </section>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {camOn ? (
            <button onClick={snap} className="btn-festive">📸 Take photo</button>
          ) : (
            <button onClick={startCam} className="btn-festive">{photo ? "🔄 Retake" : "🎥 Open camera"}</button>
          )}
          {result && final && (
            <a href={result} download="rps-annual-day-avatar.png" className="btn-outline-festive">⬇️ Download</a>
          )}
          {result && final && !qr && !qrBusy && (
            <button onClick={() => void makeQr(result, runId.current)} className="btn-outline-festive">
              📱 QR for phone
            </button>
          )}
        </div>
        {qrBusy && <p className="mt-4 text-center text-sm text-muted-foreground">⏳ Generating QR code…</p>}
        {qr && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <div className="card-pop p-3">
              <img src={qr} alt="Scan to download your avatar" className="h-56 w-56" />
            </div>
            <p className="text-sm text-muted-foreground">Scan with your phone camera to download</p>
          </div>
        )}
        <div>
        </div>

        <h2 className="mt-10 text-center font-display text-2xl font-bold">Choose your avatar</h2>
        <div className="mt-4 grid grid-cols-5 gap-3">
          {AVATARS.map((a, i) => (
            <button
              key={a.name}
              onClick={() => { setStyle(i); setQr(null); setQrBusy(false); runId.current++; }}
              className={`style-tile ${style === i ? "style-tile-active" : ""}`}
            >
              <span className="text-3xl">{a.emoji}</span>
              <span className="text-sm font-semibold">{a.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button onClick={make} disabled={!photo || busy} className="btn-festive text-lg">
            {busy ? "✨ Working…" : `✨ Make me ${AVATARS[style]!.name}`}
          </button>
          {!photo && <p className="mt-2 text-sm text-muted-foreground">Take a photo first</p>}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </main>
  );
}
