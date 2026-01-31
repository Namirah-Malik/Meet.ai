'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { trpc } from '@/trpc/client';

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  completed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  processing: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const statusIcons: Record<string, string> = {
  upcoming: '🔔',
  active: '🟢',
  completed: '✅',
  processing: '⚙️',
  cancelled: '❌',
};

export default function MeetingsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: meetingsData, isLoading, error } = trpc.meetings.getMany.useQuery();

  const meetings = meetingsData || [];
  const filteredMeetings = meetings.filter(
    (meeting) =>
      meeting.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ top: -100, right: -100 }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ bottom: -100, left: -100 }}
        />
      </div>

      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur relative z-20">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Back</span>
              </button>
              <h1 className="text-3xl font-bold text-white">Meetings</h1>
              <p className="text-slate-400 text-sm mt-1">
                {isClient ? `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}` : ''}
              </p>
            </motion.div>

            <motion.button
              onClick={() => router.push('/meetings/new')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <Plus size={20} /> New Meeting
            </motion.button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-12 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {isLoading ? (
          <motion.div
            className="flex items-center justify-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-slate-400">Loading meetings...</div>
          </motion.div>
        ) : error ? (
          <motion.div
            className="flex items-center justify-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-red-400">Error loading meetings</div>
          </motion.div>
        ) : filteredMeetings.length === 0 ? (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No meetings yet</h2>
            <p className="text-slate-400 mb-6">Create your first meeting to get started</p>
            <button
              onClick={() => router.push('/meetings/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Create Meeting
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeetings.map((meeting, index) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ translateY: -4 }}
                className="group"
              >
                <Link href={`/meetings/${meeting.id}`}>
                  <div className="h-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors">
                          {meeting.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                              statusColors[meeting.status] || statusColors.upcoming
                            }`}
                          >
                            {statusIcons[meeting.status]} {meeting.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {meeting.description && (
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                        {meeting.description}
                      </p>
                    )}

                    {isClient && (
                      <div className="flex items-center justify-between text-slate-500 text-xs pt-4 border-t border-slate-700">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>
                            {new Date(meeting.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-slate-600">Agent: {meeting.agentId.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}