import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useDispatch, useSelector } from 'react-redux';
import { joinGroup } from '../../store/slices/groupsSlice';
import type { AppDispatch, RootState } from '../../store';
import type { Screen } from '../../App';

interface JoinByCodeDialogProps {
  open: boolean;
  onClose: () => void;
  navigate: (screen: Screen, groupId?: string) => void;
}

export function JoinByCodeDialog({ open, onClose, navigate }: JoinByCodeDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.groups);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a join code');
      return;
    }

    if (!/^GRP[A-F0-9]{8}$/.test(trimmed)) {
      setError('Invalid code format. Codes look like GRP1A2B3C4D');
      return;
    }

    setError(null);
    const result = await dispatch(joinGroup({ join_code: trimmed }));
    if (joinGroup.fulfilled.match(result)) {
      onClose();
      setCode('');
      navigate('group-detail', result.payload.id);
    } else {
      setError((result.payload as string) || 'Failed to join group');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#0047AB]" />
            <h3 className="text-lg font-semibold">Join by Code</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Enter the group invite code shared by a group admin.
        </p>

        <Input
          placeholder="e.g. GRP1A2B3C4D"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          className="mb-3 font-mono tracking-wider"
          maxLength={11}
          autoFocus
        />

        {error && (
          <p className="text-sm text-red-500 mb-3">{error}</p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-[#0047AB] hover:bg-[#0047AB]/90"
            onClick={handleJoin}
            disabled={loading || !code.trim()}
          >
            {loading ? 'Joining...' : 'Join Group'}
          </Button>
        </div>
      </div>
    </div>
  );
}
