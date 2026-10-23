import { createFileRoute } from "@tanstack/react-router";
import { getSharedPhoto } from "@/lib/photo.functions";

export const Route = createFileRoute("/photo/$id")({
  loader: ({ params }) => getSharedPhoto({ data: { id: params.id } }),
  head: () => ({
    meta: [
      { title: "Your RPS Annual Day Avatar" },
      { name: "description", content: "View and save your avatar from the RPS Annual Day Avatar Booth." },
      { property: "og:title", content: "Your RPS Annual Day Avatar" },
      { property: "og:description", content: "View and save your avatar from the RPS Annual Day Avatar Booth." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => <Missing />,
  component: PhotoPage,
});

function Missing() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-festive p-6 text-center">
      <p className="text-muted-foreground">This photo link has expired or doesn't exist.</p>
    </main>
  );
}

function PhotoPage() {
  const { url, downloadUrl } = Route.useLoaderData();
  if (!url || !downloadUrl) return <Missing />;
  return (
    <main className="min-h-screen bg-festive px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">RPS Annual Day</p>
        <h1 className="font-display text-3xl font-bold">Your Avatar 🎉</h1>
        <div className="card-pop w-full overflow-hidden">
          <img src={url} alt="Your avatar" className="w-full" />
        </div>
        <a href={downloadUrl} className="btn-festive w-full text-center text-lg">⬇️ Download Image</a>
        <p className="text-center text-sm text-muted-foreground">
          iPhone: press and hold the picture, then tap "Save to Photos".
        </p>
      </div>
    </main>
  );
}
