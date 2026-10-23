import { createFileRoute } from "@tanstack/react-router";

const TYPES: Record<string, string> = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp" };

export const Route = createFileRoute("/api/share-avatar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { dataUrl } = (await request.json()) as { dataUrl?: string };
        const m = dataUrl?.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
        if (!m) return new Response("Bad image", { status: 400 });
        const kind = m[1]!.toLowerCase();
        const ext = TYPES[kind]!;
        const bytes = Uint8Array.from(atob(m[2]!), (c) => c.charCodeAt(0));
        if (bytes.length > 8_000_000) return new Response("Too big", { status: 413 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const id = crypto.randomUUID();
        const up = await supabaseAdmin.storage
          .from("avatars")
          .upload(`${id}.${ext}`, bytes, {
            contentType: `image/${kind === "jpg" ? "jpeg" : kind}`,
            cacheControl: "31536000",
          });
        if (up.error) return new Response(up.error.message, { status: 500 });
        return Response.json({ id: `${id}.${ext}` });
      },
    },
  },
});
