import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ArrowLeft, Plus, X, Copy, Check } from 'lucide-react';
import type { Screen } from '../../App';
import { mockMembers } from '../../lib/mockData';

interface GroupCreateProps {
  navigate: (screen: Screen) => void;
}

export function GroupCreate({ navigate }: GroupCreateProps) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [joinCode] = useState(`GRP${Math.random().toString(36).substr(2, 6).toUpperCase()}`);
  const [copied, setCopied] = useState(false);

  const availableMembers = mockMembers.filter(m => !selectedMembers.includes(m.id));

  const handleAddMember = (memberId: string) => {
    setSelectedMembers([...selectedMembers, memberId]);
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(id => id !== memberId));
  };

  const handleCopyJoinCode = () => {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateGroup = () => {
    // In a real app, this would save the group
    navigate('group-detail', '1');
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('home')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3>Create Group</h3>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto space-y-4">
        {/* Group Details */}
        <Card>
          <CardHeader>
            <CardTitle>Group Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="e.g., Office Supplies Squad"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will this group buy together?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Join Code</Label>
              <div className="flex gap-2">
                <Input value={joinCode} readOnly className="bg-gray-50" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyJoinCode}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#6EE7B7]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Share this code with friends to let them join
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Add Members */}
        <Card>
          <CardHeader>
            <CardTitle>Add Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Members</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map(memberId => {
                    const member = mockMembers.find(m => m.id === memberId);
                    if (!member) return null;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 bg-[#6EE7B7]/20 rounded-full pl-1 pr-3 py-1"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.name}</span>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {availableMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Suggested Contacts</Label>
                <div className="space-y-2">
                  {availableMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddMember(member.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Button */}
        <Button
          className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90"
          size="lg"
          onClick={handleCreateGroup}
          disabled={!groupName || !description}
        >
          Create Group
        </Button>
        </div>
      </div>
    </div>
  );
}