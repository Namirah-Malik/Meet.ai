'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/trpc/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Meeting Card Component with animations
const MeetingCard: React.FC<{ meeting: any; index: number }> = ({ meeting, index }) => {
  const statusColors = {
    upcoming: { 
      badge: 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50',
      border: 'border-yellow-500/30',
      glow: 'hover:shadow-lg hover:shadow-yellow-500/20'
    },
    active: { 
      badge: 'bg-green-500/30 text-green-300 border border-green-500/50',
      border: 'border-green-500/30',
      glow: 'hover:shadow-lg hover:shadow-green-500/20'
    },
    processing: { 
      badge: 'bg-blue-500/30 text-blue-300 border border-blue-500/50',
      border: 'border-blue-500/30',
      glow: 'hover:shadow-lg hover:shadow-blue-500/20'
    },
    completed: { 
      badge: 'bg-purple-500/30 text-purple-300 border border-purple-500/50',
      border: 'border-purple-500/30',
      glow: 'hover:shadow-lg hover:shadow-purple-500/20'
    },
    cancelled: { 
      badge: 'bg-red-500/30 text-red-300 border border-red-500/50',
      border: 'border-red-500/30',
      glow: 'hover:shadow-lg hover:shadow-red-500/20'
    },
  };

  const config = statusColors[meeting.status as keyof typeof statusColors] || statusColors.upcoming;

  const formatDate = (date: any) => {
    if (!date) return 'Not scheduled';
    try {
      const d = new Date(date);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <Link href={`/dashboard/meetings/${meeting.id}`}>
      <div
        className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-lg p-6 transition-all duration-300 cursor-pointer h-full ${config.glow} hover:border-slate-600 hover:translate-y-[-4px] group animate-fadeInUp`}
        style={{
          animationDelay: `${index * 0.1}s`,
        } as React.CSSProperties}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">{meeting.name}</h3>
            <p className="text-sm text-slate-400 mt-1">↳ {meeting.agent?.name || 'Unknown Agent'}</p>
          </div>
          <Badge className={config.badge}>
            {meeting.status ? meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1) : 'Unknown'}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          {meeting.scheduledAt && (
            <p className="text-sm text-slate-400">
              <span className="text-slate-500">📅 Scheduled:</span> {formatDate(meeting.scheduledAt)}
            </p>
          )}
          {!meeting.scheduledAt && (
            <p className="text-sm text-slate-500">⏰ No Duration</p>
          )}
        </div>

        {meeting.description && (
          <p className="text-sm text-slate-400 line-clamp-2 group-hover:text-slate-300 transition-colors">{meeting.description}</p>
        )}

        {/* Animated bottom border */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent group-hover:w-full transition-all duration-300 rounded-b-lg" />
      </div>
    </Link>
  );
};

// Create Meeting Form
function CreateMeetingForm({
  agents,
  onSubmit,
  onCancel,
  isLoading,
}: {
  agents: any[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    agentId: '',
    scheduledAt: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Meeting name is required');
      return;
    }

    if (!formData.agentId) {
      toast.error('Please select an agent');
      return;
    }

    try {
      await onSubmit(formData);
      setFormData({
        name: '',
        agentId: '',
        scheduledAt: '',
        description: '',
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-200 mb-2 block">Meeting Name</label>
        <Input
          placeholder="e.g., Team Standup"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-200 mb-2 block">Agent</label>
        <select
          value={formData.agentId}
          onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          required
        >
          <option value="">Select an agent</option>
          {agents && agents.length > 0 ? (
            agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))
          ) : (
            <option disabled>No agents available</option>
          )}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-200 mb-2 block">Scheduled Date & Time (Optional)</label>
        <Input
          type="datetime-local"
          value={formData.scheduledAt}
          onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
          className="bg-slate-900 border-slate-700 text-white"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-200 mb-2 block">Description (Optional)</label>
        <textarea
          placeholder="Optional meeting description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Meeting'
          )}
        </Button>
      </div>
    </form>
  );
}

// Main Meetings Page
export default function MeetingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fix hydration error by tracking mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const meetingsQuery = trpc.meetings.list.useQuery(
    {
      limit: 100,
      offset: 0,
      status: filterStatus === 'all' ? undefined : (filterStatus as any),
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const meetings = meetingsQuery.data || [];
  const isLoadingMeetings = meetingsQuery.isLoading;

  const agentsQuery = trpc.agents.list.useQuery(
    { limit: 100 },
    { refetchOnWindowFocus: false }
  );

  const agents = agentsQuery.data || [];

  const createMeetingMutation = trpc.meetings.create.useMutation({
    onSuccess: () => {
      toast.success('✅ Meeting created successfully!');
      meetingsQuery.refetch();
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.data?.message || 'Failed to create meeting';
      toast.error(errorMessage);
      console.error('Error:', error);
    },
  });

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting: any) => {
      const matchesSearch =
        (meeting.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (meeting.agent?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [meetings, searchQuery]);

  const handleCreateMeeting = async (formData: any) => {
    try {
      if (!formData.name || !formData.agentId) {
        toast.error('Please fill in all required fields');
        return;
      }

      await createMeetingMutation.mutateAsync({
        name: formData.name,
        agentId: formData.agentId,
        description: formData.description || undefined,
        scheduledAt: formData.scheduledAt || undefined,
      });
    } catch (error: any) {
      console.error('Error creating meeting:', error);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header */}
      <div className="relative bg-slate-900/50 border-b border-slate-700/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6 animate-fadeIn">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Meetings</h1>
              <p className="text-slate-400">Manage and track all your meetings</p>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50">
                  <Plus size={20} />
                  New Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Meeting</DialogTitle>
                  <DialogDescription className="text-slate-400">Schedule a new meeting with one of your agents</DialogDescription>
                </DialogHeader>
                <CreateMeetingForm
                  agents={agents}
                  onSubmit={handleCreateMeeting}
                  onCancel={() => setIsModalOpen(false)}
                  isLoading={createMeetingMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <Input
                type="text"
                placeholder="Filter by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-slate-600 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 relative">
              <span className="text-sm text-slate-400">Status</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-md text-sm text-white hover:border-slate-600 focus:border-slate-600 appearance-none pr-8 transition-all"
              >
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {isLoadingMeetings ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-4" />
            <p className="text-slate-400">Loading meetings...</p>
          </div>
        ) : filteredMeetings.length > 0 ? (
          <>
            <div className="mb-4 animate-fadeIn">
              <p className="text-sm text-slate-400">Showing {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetings.map((meeting: any, index: number) => (
                <MeetingCard key={meeting.id} meeting={meeting} index={index} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700/50">
              <AlertCircle size={32} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">No meetings found</h3>
            <p className="text-slate-400 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search query' : 'Create your first meeting to get started'}
            </p>
          </div>
        )}

        {/* Pagination Info */}
        {filteredMeetings.length > 0 && (
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-700/50 animate-fadeIn">
            <p className="text-sm text-slate-400">Page 1 of 1</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled className="border-slate-700 text-slate-400 hover:bg-slate-800/50">
                Previous
              </Button>
              <Button variant="outline" disabled className="border-slate-700 text-slate-400 hover:bg-slate-800/50">
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}