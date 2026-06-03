import { User } from '@/types/wiki';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, Globe, Lock } from 'lucide-react';
import { useState } from 'react';

interface AccessControlProps {
  isPublic: boolean;
  users: { userId: string; role: 'admin' | 'editor' | 'reader' }[];
  availableUsers: User[];
  onTogglePublic: (isPublic: boolean) => void;
  onAddUser: (userId: string, role: 'admin' | 'editor' | 'reader') => void;
  onRemoveUser: (userId: string) => void;
  onChangeRole: (userId: string, role: 'admin' | 'editor' | 'reader') => void;
}

export function AccessControl({
  isPublic,
  users,
  availableUsers,
  onTogglePublic,
  onAddUser,
  onRemoveUser,
  onChangeRole,
}: AccessControlProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'editor' | 'reader'>('reader');

  const handleAddUser = () => {
    if (selectedUserId) {
      onAddUser(selectedUserId, selectedRole);
      setSelectedUserId('');
      setSelectedRole('reader');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-100 text-rose-800';
      case 'editor':
        return 'bg-emerald-100 text-emerald-800';
      case 'reader':
        return 'bg-sapphire-100 text-sapphire-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'editor':
        return 'Editor';
      case 'reader':
        return 'Reader';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Public/Private Toggle */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <h3 className="font-semibold text-foreground mb-4">Visibility</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onTogglePublic(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isPublic
                ? 'bg-emerald-600 text-white'
                : 'bg-smoke text-foreground hover:bg-border'
            }`}
          >
            <Globe size={16} />
            Public
          </button>
          <button
            onClick={() => onTogglePublic(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !isPublic
                ? 'bg-emerald-600 text-white'
                : 'bg-smoke text-foreground hover:bg-border'
            }`}
          >
            <Lock size={16} />
            Private
          </button>
        </div>
        <p className="text-sm text-muted mt-3">
          {isPublic
            ? 'Anyone in the organization can view this document'
            : 'Only invited users can access this document'}
        </p>
      </div>

      {/* User Access */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <h3 className="font-semibold text-foreground mb-4">User Access</h3>

        {/* Current Users */}
        {users.length > 0 && (
          <div className="mb-4 space-y-2">
            {users.map((access) => {
              const user = availableUsers.find((u) => u.id === access.userId);
              return (
                <div key={access.userId} className="flex items-center justify-between p-3 bg-smoke rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-sm font-semibold">
                      {user?.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user?.name}</p>
                      <p className="text-xs text-muted">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={access.role}
                      onValueChange={(value) =>
                        onChangeRole(access.userId, value as 'admin' | 'editor' | 'reader')
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="reader">Reader</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveUser(access.userId)}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add User */}
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-sm font-medium text-foreground">Add User</p>
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers
                  .filter((u) => !users.find((a) => a.userId === u.id))
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as 'admin' | 'editor' | 'reader')}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="reader">Reader</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddUser}
              disabled={!selectedUserId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Role Legend */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <h3 className="font-semibold text-foreground mb-3">Role Permissions</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Admin</span>
            <span className="text-xs text-muted">View, Edit, Delete, Manage Access</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Editor</span>
            <span className="text-xs text-muted">View, Edit</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Reader</span>
            <span className="text-xs text-muted">View Only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
