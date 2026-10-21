import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Annual Day Avatar Booth" },
      { name: "description", content: "Snap a live photo and turn it into a fun avatar for School Annual Day." },
      { property: "og:title", content: "Annual Day Avatar Booth" },
      { property: "og:description", content: "Snap a live photo and turn it into a fun avatar for School Annual Day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const AVATARS = [
  { name: "Cartoon", emoji: "🎨", prompt: "a bright 3D Pixar-style cartoon character" },
  { name: "Superhero", emoji: "🦸", prompt: "a comic book superhero with a cape and a glowing emblem" },
  { name: "Anime", emoji: "🌸", prompt: "a colorful anime character with expressive eyes" },
  { name: "Astronaut", emoji: "🚀", prompt: "an astronaut in a space suit with planets and stars behind" },
  { name: "Royal", emoji: "👑", prompt: "a royal king or queen in a crown and regal robes, oil painting style" },
  { name: "Pixel", emoji: "👾", prompt: "a retro 16-bit pixel art video game character" },
  { name: "Wizard", emoji: "🪄", prompt: "a young wizard with a magic wand and sparkling spells" },
  { name: "Clay", emoji: "🧸", prompt: "a cute claymation figure, stop-motion clay style" },
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

  const startCam = async () => {
    setError(null);
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

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement("canvas");
    c.width = c.height = 768; // small = faster
    const ctx = c.getContext("2d")!;
    ctx.translate(768, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, 768, 768);
    c.toBlob((b) => {
      if (!b) return;
      setPhoto(b);
      setPhotoUrl(URL.createObjectURL(b));
      setResult(null);
      stopCam();
    }, "image/jpeg", 0.85);
  };

  const make = async () => {
    if (!photo) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setFinal(false);
    const form = new FormData();
    form.append("image", new File([photo], "photo.jpg", { type: "image/jpeg" }));
    form.append(
      "prompt",
      `Turn the person in this photo into ${AVATARS[style]!.prompt}. Keep their face, hairstyle and expression recognizable. Festive school Annual Day mood, vibrant colors, head and shoulders portrait.`,
    );
    form.append("quality", "low");
    form.append("size", "1024x1024");
    try {
      await streamImage("/api/edit-image", form, (src, isFinal) => {
        setResult(src);
        setFinal(isFinal);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-festive px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">School Annual Day</p>
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
            <a href={result} download="annual-day-avatar.png" className="btn-outline-festive">⬇️ Download</a>
          )}
        </div>

        <h2 className="mt-10 text-center font-display text-2xl font-bold">Choose your avatar</h2>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {AVATARS.map((a, i) => (
            <button
              key={a.name}
              onClick={() => setStyle(i)}
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
