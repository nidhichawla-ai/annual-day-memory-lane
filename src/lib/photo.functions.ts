import { createServerFn } from "@tanstack/react-start";

export const getSharedPhoto = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => {
    if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(d.id)) throw new Error("Bad id");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const week = 60 * 60 * 24 * 7;
    const ext = data.id.split(".")[1];
    const [view, dl] = await Promise.all([
      supabaseAdmin.storage.from("avatars").createSignedUrl(data.id, week),
      supabaseAdmin.storage.from("avatars").createSignedUrl(data.id, week, { download: `rps-annual-day-avatar.${ext}` }),
    ]);
    if (view.error || dl.error) return { url: null, downloadUrl: null };
    return { url: view.data.signedUrl, downloadUrl: dl.data.signedUrl };
  });
