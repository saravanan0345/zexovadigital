import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, ImageUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { StartupProject } from "@/lib/site-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/startups")({ component: Startups });

function Startups() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<StartupProject> | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "startup_projects"],
    queryFn: async () => (await supabase.from("startup_projects").select("*").order("sort_order").order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["startup_projects"] }).then(() => qc.invalidateQueries({ queryKey: ["admin"] }));

  const toggle = async (p: StartupProject) => {
    const { error } = await supabase.from("startup_projects").update({ published: !p.published, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) { toast.error("Could not update"); return; }
    toast.success(p.published ? "Hidden from website" : "Shown on website"); refresh();
  };
  const del = async (p: StartupProject) => {
    const { error } = await supabase.from("startup_projects").delete().eq("id", p.id);
    if (error) { toast.error("Could not delete"); return; }
    toast.success("Project deleted"); refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Startup Projects</h1>
          <p className="text-sm text-muted-foreground">Shown in the “Startups Trusted Us” section on the homepage.</p>
        </div>
        <Button variant="hero" onClick={() => setEditing({})}><Plus className="size-4" /> Add project</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-xl border bg-card shadow-card">
            <div className="aspect-video bg-muted">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="space-y-2 p-4">
              <h3 className="font-bold">{p.title}</h3>
              {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
              {p.website_url && <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary"><ExternalLink className="size-3" /> {p.website_url}</a>}
              <div className="flex items-center gap-2 text-sm"><Switch checked={p.published} onCheckedChange={() => toggle(p)} /> {p.published ? "Shown on website" : "Hidden"}</div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="size-4" /> Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" aria-label="Delete"><Trash2 className="size-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete “{p.title}”?</AlertDialogTitle><AlertDialogDescription>It will be removed from the website straight away.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => del(p)}>Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
        {!data.length && <p className="col-span-full rounded-xl border bg-card p-10 text-center text-muted-foreground">{isLoading ? "Loading…" : "No startup projects yet. Add one and it appears on the homepage."}</p>}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          {editing && <StartupForm initial={editing} onDone={() => { setEditing(null); refresh(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StartupForm({ initial, onDone }: { initial: Partial<StartupProject>; onDone: () => void }) {
  const [f, setF] = useState({
    title: initial.title ?? "", description: initial.description ?? "", image_url: initial.image_url ?? "",
    website_url: initial.website_url ?? "", sort_order: String(initial.sort_order ?? 0), published: initial.published ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const upload = async (file: File) => {
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

    const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isAllowed =
      (file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) ||
      ALLOWED_EXTENSIONS.includes(rawExt);

    if (!isAllowed) {
      toast.error("Please choose a supported image format (JPG, JPEG, PNG, or WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setBusy(true);

    let mimeType = file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) ? file.type.toLowerCase() : "";
    if (!mimeType) {
      switch (rawExt) {
        case "jpg":
        case "jpeg":
          mimeType = "image/jpeg";
          break;
        case "png":
          mimeType = "image/png";
          break;
        case "webp":
          mimeType = "image/webp";
          break;
        case "gif":
          mimeType = "image/gif";
          break;
        case "avif":
          mimeType = "image/avif";
          break;
        default:
          mimeType = "image/jpeg";
      }
    }

    const safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : (mimeType.split("/")[1] || "jpg");
    const path = `startups/${crypto.randomUUID()}.${safeExt}`;

    try {
      const storage = supabase.storage.from("project-images");
      let { error: uploadError } = await storage.upload(path, file, {
        contentType: mimeType,
        upsert: true,
      });

      if (
        uploadError &&
        (uploadError.message?.toLowerCase().includes("bucket not found") ||
          (uploadError as unknown as { statusCode?: string }).statusCode === "404" ||
          (uploadError as unknown as { error?: string }).error === "Bucket not found")
      ) {
        const { error: createErr } = await supabase.storage.createBucket("project-images", {
          public: false,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        });

        if (!createErr) {
          const retry = await storage.upload(path, file, {
            contentType: mimeType,
            upsert: true,
          });
          uploadError = retry.error;
        }
      }

      if (uploadError) {
        if (
          uploadError.message?.toLowerCase().includes("bucket not found") ||
          uploadError.message?.toLowerCase().includes("row-level security") ||
          (uploadError as unknown as { statusCode?: string }).statusCode === "404"
        ) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read image file"));
            reader.readAsDataURL(file);
          });
          setF((x) => ({ ...x, image_url: dataUrl }));
          toast.success("Image selected and preview ready");
          return;
        }

        toast.error(`Image upload failed: ${uploadError.message}`);
        return;
      }

      const { data, error: signedError } = await storage.createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signedError || !data?.signedUrl) {
        const { data: publicData } = storage.getPublicUrl(path);
        if (publicData?.publicUrl) {
          setF((x) => ({ ...x, image_url: publicData.publicUrl }));
          toast.success("Image uploaded successfully");
          return;
        }
        toast.error(`Image uploaded, but its link could not be created: ${signedError?.message || "Unknown error"}`);
        return;
      }

      setF((x) => ({ ...x, image_url: data.signedUrl }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("startup image upload failed", error);
      toast.error("Image upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 2) { toast.error("Title is required"); return; }
    const url = f.website_url.trim();
    if (url && !/^https?:\/\//.test(url)) { toast.error("Website link must start with http(s)://"); return; }
    setBusy(true);
    const row = {
      title: f.title.trim(), description: f.description.trim(), image_url: f.image_url || null,
      website_url: url || null, sort_order: Number.parseInt(f.sort_order, 10) || 0,
      published: f.published, updated_at: new Date().toISOString(),
    };
    const { error } = initial.id
      ? await supabase.from("startup_projects").update(row).eq("id", initial.id)
      : await supabase.from("startup_projects").insert(row);
    setBusy(false);
    if (error) { toast.error("Could not save project"); return; }
    toast.success("Project saved"); onDone();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <DialogHeader><DialogTitle>{initial.id ? "Edit startup project" : "Add startup project"}</DialogTitle></DialogHeader>
      <div className="space-y-1"><Label htmlFor="sp-title">Project title *</Label><Input id="sp-title" value={f.title} onChange={set("title")} required /></div>
      <div className="space-y-1"><Label htmlFor="sp-desc">Short description</Label><Textarea id="sp-desc" rows={3} maxLength={300} value={f.description} onChange={set("description")} /></div>
      <div className="space-y-1">
        <Label htmlFor="sp-image-input">Project image / thumbnail</Label>
        {f.image_url && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
            <img src={f.image_url} alt="Project thumbnail" className="h-full w-full object-cover" />
          </div>
        )}
        <label
          htmlFor="sp-image-input"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <ImageUp className="size-4" />
          {busy ? "Uploading…" : f.image_url ? "Change image (max 5 MB)" : "Upload image (max 5 MB)"}
        </label>
        <input
          id="sp-image-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,.jpg,.jpeg,.png,.webp,.gif,.avif"
          disabled={busy}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void upload(file);
            }
            e.target.value = "";
          }}
        />
        {f.image_url && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setF({ ...f, image_url: "" })}>
            Remove image
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-2"><Label htmlFor="sp-url">Website link (optional)</Label><Input id="sp-url" value={f.website_url} onChange={set("website_url")} placeholder="https://" /></div>
        <div className="space-y-1"><Label htmlFor="sp-order">Display order</Label><Input id="sp-order" type="number" value={f.sort_order} onChange={set("sort_order")} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} /> Show on the website</label>
      <Button type="submit" variant="hero" disabled={busy} className="w-full">Save project</Button>
    </form>
  );
}
