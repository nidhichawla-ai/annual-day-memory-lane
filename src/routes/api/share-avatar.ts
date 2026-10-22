import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/share-avatar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { dataUrl } = (await request.json()) as { dataUrl?: string };
        const m = dataUrl?.match(/^data:image\/png;base64,(.+)$/);
        if (!m) return new Response("Bad image", { status: 400 });
        const bytes = Uint8Array.from(atob(m[1]!), (c) => c.charCodeAt(0));
        if (bytes.length > 8_000_000) return new Response("Too big", { status: 413 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const path = `${crypto.randomUUID()}.png`;
        const up = await supabaseAdmin.storage.from("avatars").upload(path, bytes, { contentType: "image/png" });
        if (up.error) return new Response(up.error.message, { status: 500 });
        const signed = await supabaseAdmin.storage
          .from("avatars")
          .createSignedUrl(path, 60 * 60 * 24 * 7, { download: "rps-annual-day-avatar.png" });
        if (signed.error) return new Response(signed.error.message, { status: 500 });
        return Response.json({ url: signed.data.signedUrl });
      },
    },
  },
});
