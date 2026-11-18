"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, RefreshCw, Star, Trash2, UploadCloud } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { ImageAsset } from "@/lib/cloudinary";
import { errorMessage } from "@/lib/convex-errors";
import { cn } from "@/lib/utils";

type Folder = "products" | "categories" | "brands" | "banners" | "settings";
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/svg+xml,image/x-icon";

/** Signed direct-to-Cloudinary upload. The signature comes from a staff-only Convex action. */
export function useCloudinaryUpload(folder: Folder) {
  const sign = useAction(api.cloudinary.signUpload);
  return useCallback(
    async (file: File, onProgress?: (pct: number) => void): Promise<ImageAsset> => {
      if (!file.type.startsWith("image/")) throw new Error("Format non supporté (image uniquement).");
      if (file.size > MAX_BYTES) throw new Error("Image trop lourde (10 Mo maximum).");
      const sig = await sign({ folder });
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", sig.uploadUrl);
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
          try {
            const res = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({ publicId: res.public_id, url: res.secure_url, width: res.width, height: res.height });
            } else reject(new Error(res?.error?.message ?? "Échec de l'envoi."));
          } catch {
            reject(new Error("Réponse Cloudinary invalide."));
          }
        };
        xhr.onerror = () => reject(new Error("Erreur réseau pendant l'envoi."));
        xhr.send(form);
      });
    },
    [sign, folder],
  );
}

type Pending = { id: string; preview: string; progress: number };

function SortableTile({
  image,
  index,
  onRemove,
  onMain,
  onReplace,
  onAlt,
}: {
  image: ImageAsset;
  index: number;
  onRemove: () => void;
  onMain: () => void;
  onReplace: () => void;
  onAlt: (alt: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.publicId });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group relative overflow-hidden rounded-xl border bg-white", isDragging && "z-10 shadow-xl ring-2 ring-primary", index === 0 && "ring-2 ring-primary/60")}
    >
      <div className="relative aspect-square">
        <Image src={image.url} alt={image.alt ?? ""} fill sizes="160px" className="object-contain p-2" />
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute start-1.5 top-1.5 grid size-7 cursor-grab place-items-center rounded-md bg-white/90 text-muted-foreground shadow-sm active:cursor-grabbing"
          aria-label="Déplacer"
        >
          <GripVertical className="size-4" />
        </button>
        {index === 0 && <span className="absolute end-1.5 top-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">PRINCIPALE</span>}
        <div className="absolute inset-x-1.5 bottom-1.5 flex justify-center gap-1 opacity-0 transition group-hover:opacity-100 max-md:opacity-100">
          {index !== 0 && (
            <button type="button" onClick={onMain} title="Définir comme principale" className="grid size-7 place-items-center rounded-md bg-white/95 text-amber-500 shadow-sm">
              <Star className="size-4" />
            </button>
          )}
          <button type="button" onClick={onReplace} title="Remplacer" className="grid size-7 place-items-center rounded-md bg-white/95 text-navy shadow-sm">
            <RefreshCw className="size-3.5" />
          </button>
          <button type="button" onClick={onRemove} title="Supprimer" className="grid size-7 place-items-center rounded-md bg-white/95 text-destructive shadow-sm">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <input
        value={image.alt ?? ""}
        onChange={(e) => onAlt(e.target.value)}
        placeholder="Texte alternatif"
        className="w-full border-t px-2 py-1.5 text-xs outline-none focus:bg-accent/50"
        aria-label="Texte alternatif"
      />
    </li>
  );
}

/** Multi-image gallery editor. The first image is the main image. */
export function ImageUploader({ value, onChange, folder, max = 15 }: { value: ImageAsset[]; onChange: (v: ImageAsset[]) => void; folder: Folder; max?: number }) {
  const upload = useCloudinaryUpload(folder);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceIndex = useRef<number | null>(null);
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, Math.max(0, max - latest.current.length));
    if (!list.length) {
      toast.error(`${max} images maximum.`);
      return;
    }
    await Promise.all(
      list.map(async (file) => {
        const id = Math.random().toString(36).slice(2);
        const preview = URL.createObjectURL(file);
        setPending((p) => [...p, { id, preview, progress: 0 }]);
        try {
          const img = await upload(file, (progress) => setPending((p) => p.map((x) => (x.id === id ? { ...x, progress } : x))));
          onChange([...latest.current, img]);
          latest.current = [...latest.current, img];
        } catch (e) {
          toast.error(errorMessage(e, (e as Error).message));
        } finally {
          setPending((p) => p.filter((x) => x.id !== id));
          URL.revokeObjectURL(preview);
        }
      }),
    );
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = value.findIndex((i) => i.publicId === e.active.id);
    const to = value.findIndex((i) => i.publicId === e.over!.id);
    onChange(arrayMove(value, from, to));
  };

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.map((i) => i.publicId)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {value.map((img, i) => (
              <SortableTile
                key={img.publicId}
                image={img}
                index={i}
                onRemove={() => onChange(value.filter((_, j) => j !== i))}
                onMain={() => onChange([img, ...value.filter((_, j) => j !== i)])}
                onReplace={() => {
                  replaceIndex.current = i;
                  replaceInput.current?.click();
                }}
                onAlt={(alt) => onChange(value.map((x, j) => (j === i ? { ...x, alt } : x)))}
              />
            ))}
            {pending.map((p) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={p.preview} alt="" className="size-full object-contain p-2 opacity-50" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold shadow">
                    <Loader2 className="size-3.5 animate-spin" /> {p.progress}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {value.length + pending.length < max && (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm text-muted-foreground transition",
            dragOver ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-secondary/50",
          )}
        >
          <UploadCloud className="size-8 text-primary" />
          <span>
            <span className="font-semibold text-primary">Cliquez</span> ou glissez-déposez vos images
          </span>
          <span className="text-xs">JPG, PNG, WebP · 10 Mo max · la première image est l&apos;image principale</span>
        </button>
      )}
      <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => e.target.files && handleFiles(e.target.files).finally(() => (e.target.value = ""))} />
      <input
        ref={replaceInput}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const idx = replaceIndex.current;
          e.target.value = "";
          if (!file || idx === null) return;
          const tid = toast.loading("Envoi de l'image…");
          try {
            const img = await upload(file);
            onChange(latest.current.map((x, j) => (j === idx ? { ...img, alt: x.alt } : x)));
            toast.success("Image remplacée", { id: tid });
          } catch (err) {
            toast.error((err as Error).message, { id: tid });
          }
        }}
      />
    </div>
  );
}

/** Single image field (category banner, logo, OG image…). */
export function SingleImageUpload({
  value,
  onChange,
  folder,
  aspect = "aspect-video",
  label = "Ajouter une image",
}: {
  value?: ImageAsset | null;
  onChange: (v: ImageAsset | undefined) => void;
  folder: Folder;
  aspect?: string;
  label?: string;
}) {
  const upload = useCloudinaryUpload(folder);
  const [progress, setProgress] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    setProgress(0);
    try {
      onChange(await upload(file, setProgress));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div>
      <div
        className={cn("group relative overflow-hidden rounded-xl border-2 border-dashed bg-secondary/40", aspect, value && "border-solid border-border bg-white")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
      >
        {value ? (
          <>
            <Image src={value.url} alt={value.alt ?? ""} fill sizes="400px" className="object-contain p-2" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-navy/50 opacity-0 transition group-hover:opacity-100">
              <button type="button" onClick={() => input.current?.click()} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold">
                Remplacer
              </button>
              <button type="button" onClick={() => onChange(undefined)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-destructive">
                Retirer
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
            <ImagePlus className="size-6" />
            {label}
          </button>
        )}
        {progress !== null && (
          <div className="absolute inset-0 grid place-items-center bg-white/80">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Loader2 className="size-4 animate-spin" /> {progress}%
            </span>
          </div>
        )}
      </div>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => {
        pick(e.target.files?.[0]);
        e.target.value = "";
      }} />
    </div>
  );
}
