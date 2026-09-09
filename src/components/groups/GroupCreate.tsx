import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createGroup, clearError } from '../../store/slices/groupsSlice';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { Screen } from '../../App';

interface GroupCreateProps {
  navigate: (screen: Screen) => void;
}

export function GroupCreate({ navigate }: GroupCreateProps) {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.groups);
  
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [moqTarget, setMoqTarget] = useState<number | ''>(10);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);

  const isFormValid = groupName.trim().length >= 2 && description.trim().length > 0 && moqTarget > 0;

  const handleCreateGroup = async () => {
    if (!isFormValid) return;

    try {
      const result = await dispatch(
        createGroup({
          name: groupName,
          description,
          moq_target: Number(moqTarget),
        })
      ).unwrap();

      // Store join code and show success state
      setJoinCode(result.join_code);
      
      // Navigate to group detail after brief delay
      setTimeout(() => {
        navigate('group-detail', result.id);
      }, 1500);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleCopyJoinCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    dispatch(clearError());
    navigate('home');
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={loading}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3>Create Group</h3>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Error Alert */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Error creating group</p>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Group Details */}
          <Card>
            <CardHeader>
              <CardTitle>Group Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  placeholder="e.g., Office Supplies Squad"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={loading}
                  minLength={2}
                  maxLength={255}
                />
                {groupName.length > 0 && groupName.length < 2 && (
                  <p className="text-xs text-red-600">Name must be at least 2 characters</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="What will this group buy together?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  rows={3}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500">{description.length}/1000</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moqTarget">Minimum Order Quantity (MOQ) *</Label>
                <Input
                  id="moqTarget"
                  type="number"
                  placeholder="e.g., 100"
                  value={moqTarget}
                  onChange={(e) => setMoqTarget(e.target.value === '' ? '' : parseInt(e.target.value))}
                  disabled={loading}
                  min="1"
                />
                {moqTarget === '' ? (
                  <p className="text-xs text-red-600">MOQ is required</p>
                ) : moqTarget < 1 ? (
                  <p className="text-xs text-red-600">MOQ must be at least 1</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Join Code Display (after creation) */}
          {joinCode && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900">Group Created! 🎉</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-green-800">
                  Share this code with friends to let them join your group.
                </p>
                <div className="flex gap-2">
                  <Input 
                    value={joinCode} 
                    readOnly 
                    className="bg-white" 
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyJoinCode}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Button */}
          <Button
            className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 disabled:opacity-50"
            size="lg"
            onClick={handleCreateGroup}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Group...
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}