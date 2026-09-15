import React, { useState } from "react";
import { DriveFile, User } from "@/types/lekki";
import { drive } from "@/lib/api";
import { toast } from "sonner";
import { Share2, X, Check, UserPlus, Users } from "lucide-react";

interface ShareDialogProps {
  file: DriveFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: User[];
  currentUser: User | null;
  onFileUpdated: (file: DriveFile) => void;
}

export function ShareDialog({
  file,
  open,
  onOpenChange,
  allUsers,
  currentUser,
  onFileUpdated,
}: ShareDialogProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    file?.shared_with || []
  );
  const [saving, setSaving] = useState(false);

  // Sync state with open file
  React.useEffect(() => {
    if (file) {
      setSelectedUsers(file.shared_with || []);
    }
  }, [file]);

  if (!open || !file) return null;

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await drive.shareFile(file.id, selectedUsers);
      toast.success(
        selectedUsers.length > 0
          ? `Document partagé avec ${selectedUsers.length} personne(s)`
          : "Partage révoqué : document redevenu privé"
      );
      onFileUpdated(updated);
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors du partage du document");
    } finally {
      setSaving(false);
    }
  };

  const candidates = allUsers.filter((u) => u.id !== currentUser?.id);

  return (
    <div
      id="share-dialog-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        id="share-dialog-modal"
        className="w-full max-w-md bg-[#161A22] border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Partager le document
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
            <div className="font-medium text-zinc-200 truncate">{file.name}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Propriétaire : {file.owner_name || currentUser?.name || "Vous"}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-zinc-400" />
              Sélectionnez les personnes avec qui partager :
            </label>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {candidates.map((u) => {
                const isSelected = selectedUsers.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUser(u.id)}
                    className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors text-xs ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                        : "bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-[11px] text-zinc-400">{u.email}</div>
                      </div>
                    </div>
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-400 text-zinc-950"
                          : "border-zinc-700"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 p-2 rounded bg-zinc-900/40 border border-zinc-800/60">
            ℹ️ <strong>Règle de provenance</strong> : Le fichier reste rattaché à votre
            espace personnel. Chez les destinataires, il apparaîtra directement dans
            leur rubrique <strong>« Partagés avec moi »</strong> et deviendra
            interrogeable par leur Lekki AI.
          </div>
        </div>

        <div className="p-3 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {saving ? "Enregistrement..." : "Appliquer le partage"}
          </button>
        </div>
      </div>
    </div>
  );
}
