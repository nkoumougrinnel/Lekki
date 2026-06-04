import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, FolderKanban, Plus, Users } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import { WorkspaceMembersDialog } from './WorkspaceMembersDialog';

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, activeWorkspaceId, loading, setActiveWorkspace, refresh } =
    useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 max-w-[220px]" disabled={loading}>
            <FolderKanban size={16} className="text-primary flex-shrink-0" />
            <span className="truncate text-sm font-medium">
              {activeWorkspace?.name ?? (loading ? 'Chargement…' : 'Aucun workspace')}
            </span>
            <ChevronsUpDown size={14} className="text-muted-foreground flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">Aucun workspace</div>
          ) : (
            workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setActiveWorkspace(ws.id)}
                className="flex items-center gap-2"
              >
                <Check
                  size={14}
                  className={ws.id === activeWorkspaceId ? 'opacity-100' : 'opacity-0'}
                />
                <span className="flex-1 truncate">{ws.name}</span>
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setMembersOpen(true)}
            disabled={!activeWorkspace}
            className="flex items-center gap-2"
          >
            <Users size={14} />
            <span>Gérer les membres</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
            <Plus size={14} />
            <span>Nouveau workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async (id) => {
          await refresh();
          setActiveWorkspace(id);
        }}
      />
      <WorkspaceMembersDialog
        workspace={activeWorkspace}
        open={membersOpen}
        onOpenChange={setMembersOpen}
      />
    </>
  );
}
