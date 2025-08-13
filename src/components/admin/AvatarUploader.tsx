
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  value?: string;
  onChange: (url: string) => void;
  triggerText?: string;
  className?: string;
};

export default function AvatarUploader({ value, onChange, triggerText = "Enviar avatar", className }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const initials = useMemo(() => {
    if (!value) return "A";
    try {
      const nameFromUrl = value.split("/").pop() || "A";
      return nameFromUrl.slice(0, 2).toUpperCase();
    } catch {
      return "A";
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  // Corta a imagem para um quadrado central e exporta como JPEG 512x512
  async function cropToSquareBlob(imageUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = Math.floor((img.width - side) / 2);
        const sy = Math.floor((img.height - side) / 2);

        const canvas = canvasRef.current || document.createElement("canvas");
        const targetSize = 512;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context not available"));
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Falha ao gerar imagem"));
          resolve(blob);
        }, "image/jpeg", 0.9);
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  const doUpload = async () => {
    if (!preview) {
      toast({ title: "Selecione uma imagem primeiro", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const blob = await cropToSquareBlob(preview);
      const path = `${user.id}/avatar_${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      onChange(publicUrl);
      setOpen(false);
      toast({ title: "Avatar atualizado" });
    } catch (e: any) {
      toast({ title: "Erro ao enviar avatar", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={value || undefined} alt="Avatar" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary">{triggerText}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Enviar avatar</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input type="file" accept="image/*" onChange={handleFileChange} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Pré-visualização</p>
                  <div className="w-48 h-48 rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhuma imagem selecionada</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Corte (quadrado)</p>
                  <div className="w-48 h-48 rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                    {preview ? (
                      <canvas ref={canvasRef} className="hidden" />
                    ) : (
                      <span className="text-xs text-muted-foreground">O corte será centralizado</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    O corte é centralizado automaticamente para evitar distorção.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={doUpload} disabled={uploading}>
                {uploading ? "Enviando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
