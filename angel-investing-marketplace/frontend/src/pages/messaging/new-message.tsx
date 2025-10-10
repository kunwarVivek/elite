import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMessaging } from '@/hooks/use-messaging';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  verified?: boolean;
}

export const NewMessage: React.FC = () => {
  const navigate = useNavigate();
  const { startConversation, isLoading } = useMessaging();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'select' | 'compose'>('select');

  // Mock users - in real app, this would come from API
  const [availableUsers] = useState<User[]>([
    { id: '1', name: 'John Smith', email: 'john@example.com', role: 'INVESTOR', verified: true },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'FOUNDER', verified: true },
    { id: '3', name: 'Mike Chen', email: 'mike@example.com', role: 'INVESTOR', verified: false },
    { id: '4', name: 'Emily Davis', email: 'emily@example.com', role: 'FOUNDER', verified: true },
    { id: '5', name: 'David Wilson', email: 'david@example.com', role: 'INVESTOR', verified: true },
  ]);

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserSelect = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(prev => [...prev, user]);
    }
    setSearchQuery('');
  };

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleNext = () => {
    if (selectedUsers.length > 0) {
      setStep('compose');
    }
  };

  const handleBack = () => {
    setStep('select');
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0 || !subject.trim() || !message.trim()) return;

    try {
      const response = await startConversation({
        receiverId: selectedUsers[0].id, // For now, just send to first user
        subject: subject.trim(),
        content: message.trim(),
        messageType: 'GENERAL',
      });

      // Navigate to the new conversation
      navigate(`/messaging/conversation/${response.conversation_id}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  if (step === 'compose') {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">New Message</h1>
                <p className="text-sm text-gray-500">
                  To: {selectedUsers.map(u => u.name).join(', ')}
                </p>
              </div>
            </div>

            <Button onClick={handleSend} disabled={isLoading || !subject.trim() || !message.trim()}>
              Send
            </Button>
          </div>
        </div>

        {/* Compose Form */}
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border p-6">
            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
                className="w-full"
              />
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full min-h-[200px]"
                rows={8}
              />
            </div>

            {/* Character Count */}
            <div className="text-right text-sm text-gray-500">
              {message.length}/2000 characters
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/messaging')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Messages
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">New Message</h1>
              <p className="text-sm text-gray-500">Start a conversation with someone</p>
            </div>
          </div>

          <Button onClick={handleNext} disabled={selectedUsers.length === 0}>
            Next
          </Button>
        </div>
      </div>

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">To:</span>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <Badge key={user.id} variant="secondary" className="flex items-center space-x-1">
                  <span>{user.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-gray-300"
                    onClick={() => handleUserRemove(user.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Selection */}
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search people..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* User List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="font-medium text-gray-900">
                {searchQuery ? 'Search Results' : 'All Users'}
              </h3>
              <p className="text-sm text-gray-500">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
              </p>
            </div>

            <ScrollArea className="h-96">
              <div className="p-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">
                      {searchQuery ? 'No users found matching your search.' : 'No users available.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedUsers.find(u => u.id === user.id) ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-sm text-gray-900 truncate">
                              {user.name}
                            </h4>
                            {user.verified && (
                              <Badge variant="secondary" className="text-xs">
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{user.email}</p>
                          <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                        </div>

                        {selectedUsers.find(u => u.id === user.id) && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};