import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { ACCENTS, ESPACE_EMOJIS } from "@/lib/lekki";
import { cn } from "@/lib/utils";

export function CreateEspaceDialog({ open, onOpenChange, onCreated }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [accent, setAccent] = useState("sage");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const espace = await base44.entities.Espace.create({
        name: name.trim(),
        description: description.trim(),
        emoji,
        accent,
        last_opened_at: new Date().toISOString(),
      });
      onOpenChange(false);
      setName("");
      setDescription("");
      setEmoji("📚");
      setAccent("sage");
      onCreated?.(espace);
      navigate({ to: "/espaces/$espaceId", params: { espaceId: espace.id } });
    } catch {
      toast.error("Impossible de créer l’espace pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 rounded-2xl border-[#E7E4D9] bg-[#FBFAF6] p-0">
        <DialogHeader className="border-b border-[#E7E4D9] px-6 py-5 text-left">
          <DialogTitle className="font-heading text-xl font-semibold tracking-[-0.02em] text-[#16241D]">
            Nouvel espace
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#5C6B62]">
            Un espace par promo, par club ou par groupe d’étude. Tu pourras y ajouter tes cours ensuite.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor="espace-name" className="text-[13px] font-medium text-[#3C4A41]">
              Nom
            </label>
            <Input
              id="espace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ITT2 · Traitement du signal"
              autoFocus
              maxLength={80}
              className="border-[#E2DFD3] bg-white focus-visible:ring-[#2E7D5B]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="espace-description" className="text-[13px] font-medium text-[#3C4A41]">
              Description <span className="font-normal text-[#8A968E]">(facultatif)</span>
            </label>
            <Textarea
              id="espace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Cours, TD et anciens sujets du semestre 2."
              rows={2}
              maxLength={200}
              className="resize-none border-[#E2DFD3] bg-white focus-visible:ring-[#2E7D5B]/20"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-[#3C4A41]">Icône</p>
              <div className="flex flex-wrap gap-1.5">
                {ESPACE_EMOJIS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEmoji(value)}
                    aria-label={`Icône ${value}`}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors",
                      emoji === value
                        ? "border-[#2E7D5B] bg-[#EAF2E7]"
                        : "border-[#E7E4D9] bg-white hover:border-[#C9D9CC]",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-[#3C4A41]">Couleur</p>
              <div className="flex gap-2">
                {Object.entries(ACCENTS).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAccent(key)}
                    aria-label={`Couleur ${key}`}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      value.dot,
                      accent === key ? "border-[#16241D] scale-105" : "border-transparent",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#E7E4D9] pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || saving}
              className="rounded-full bg-[#16241D] px-5 text-[#FBFAF6] hover:bg-[#24382D]"
            >
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Créer l’espace
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}