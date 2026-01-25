'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  MoreVertical,
  X,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Agent } from '@/modules/agents/types';

interface AgentPageClientProps {
  agent: Agent;
}

const getAvatarUrl = (id: string) => {
  const avatarStyles = [
    'bottts',
    'bottts-neutral',
    'lorelei',
  ]
  
  const hash = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  const style = avatarStyles[hash % avatarStyles.length]
  
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(id)}&scale=85&backgroundColor=random`
}

const getGradientColor = (id: string) => {
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-pink-500 to-rose-500',
    'from-cyan-500 to-blue-500',
    'from-yellow-500 to-orange-500',
  ]
  const hash = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return gradients[hash % gradients.length]
};

export function AgentPageClient({ agent: initialAgent }: AgentPageClientProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent>(initialAgent);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editFormData, setEditFormData] = useState({
    name: initialAgent.name,
    instructions: initialAgent.instructions || '',
  });

  const handleEditClick = () => {
    setShowMenuDropdown(false);
    setTimeout(() => {
      setIsEditing(true);
      setError(null);
    }, 100);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name.trim()) {
      setError('Agent name is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('📝 Saving agent edit...');
      const response = await fetch('/api/trpc/agents.update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: agent.id,
          name: editFormData.name.trim(),
          instructions: editFormData.instructions.trim(),
        }),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to update agent');
      }

      // Handle tRPC response format
      const updatedAgent = data.result?.data;
      if (!updatedAgent) {
        throw new Error('Invalid response');
      }

      setAgent(updatedAgent);
      setIsEditing(false);
      setSuccess('Agent updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error updating agent';
      console.error('Save error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditFormData({
      name: agent.name,
      instructions: agent.instructions || '',
    });
    setIsEditing(false);
    setError(null);
  };

  const handleDeleteAgent = async () => {
    console.log('🗑️ handleDeleteAgent called');
    setIsLoading(true);
    setError(null);

    try {
      console.log('Agent ID to delete:', agent.id);
      
      const body = JSON.stringify(agent.id);
      console.log('Request body:', body);
      
      const response = await fetch('/api/trpc/agents.delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      console.log('✅ Fetch completed');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const text = await response.text();
      console.log('Response text:', text);
      
      let data;
      try {
        data = JSON.parse(text);
        console.log('Parsed response:', data);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Invalid response: ${text}`);
      }

      if (!response.ok) {
        const errorMsg = data?.error?.message || 'Failed to delete agent';
        console.error('❌ Server error:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ Delete successful, redirecting...');
      setShowDeleteConfirm(false);
      
      setTimeout(() => {
        console.log('Redirecting to /agents');
        router.push('/agents');
      }, 500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error deleting agent';
      console.error('🔴 Error:', errorMsg);
      console.error('Full error object:', err);
      setError(errorMsg);
      setShowDeleteConfirm(false);
    } finally {
      console.log('Delete operation finished');
      setIsLoading(false);
    }
  };

  const avatar = getAvatarUrl(agent.id);
  const gradient = getGradientColor(agent.id);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Animated Background Elements */}
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
            ease: "easeInOut",
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
            ease: "easeInOut",
          }}
          style={{ bottom: -100, left: -100 }}
        />
      </div>

      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur relative z-20" onClick={() => setShowMenuDropdown(false)}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">My Agents</span>
          </motion.button>

          {!isEditing && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Menu button clicked, current state:', showMenuDropdown);
                  setShowMenuDropdown(!showMenuDropdown);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <MoreVertical size={20} className="text-slate-400" />
              </button>

              {showMenuDropdown && (
                <motion.div
                  className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-lg z-[100]"
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('Edit menu item clicked');
                      handleEditClick();
                    }}
                    className="w-full px-4 py-2 text-blue-400 hover:bg-slate-700 flex gap-2 items-center text-sm transition-colors"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      console.log('Delete button in menu - onClick fired');
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('Delete menu item clicked');
                      setShowDeleteConfirm(true);
                      setShowMenuDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-700 flex gap-2 items-center text-sm border-t border-slate-700 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        {/* Error Alert */}
        {error && (
          <motion.div
            className="mb-6 bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex justify-between items-center"
            initial={{ opacity: 0, y: -10, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <span className="text-sm flex-1">{error}</span>
            <motion.button 
              onClick={() => setError(null)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex-shrink-0 ml-4"
            >
              <X size={18} />
            </motion.button>
          </motion.div>
        )}

        {/* Success Alert */}
        {success && (
          <motion.div
            className="mb-6 bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg"
            initial={{ opacity: 0, y: -10, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <motion.span 
              className="text-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              ✓ {success}
            </motion.span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Avatar & Name Section */}
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0 group">
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition-all duration-300`}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              ></motion.div>
              
              <motion.div 
                className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${gradient} p-1 shadow-lg border-2 border-slate-700 overflow-hidden`}
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <img
                  src={avatar}
                  alt={agent.name}
                  className="w-full h-full rounded-xl object-cover bg-white"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(agent.id)}&scale=85`
                  }}
                />
              </motion.div>
              
              <motion.div 
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-slate-900 shadow-lg"
                animate={{
                  scale: [1, 1.2, 1],
                  boxShadow: [
                    "0 0 0 0 rgba(34, 197, 94, 0.7)",
                    "0 0 0 8px rgba(34, 197, 94, 0)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              ></motion.div>
            </div>

            {/* Info */}
            <div className="flex-1 pt-2">
              {isEditing ? (
                <motion.input
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  disabled={isLoading}
                  className="text-4xl font-bold text-white bg-slate-800 px-4 py-2 rounded-lg w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  autoFocus
                />
              ) : (
                <motion.h1 
                  className="text-4xl font-bold text-white mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {agent.name}
                </motion.h1>
              )}

              <motion.div 
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="text-slate-400 text-sm">📅</span>
                <span className="text-slate-300 font-medium">
                  {agent.meetingsCount ?? 0} meetings
                </span>
              </motion.div>
            </div>
          </div>

          {/* Instructions Section */}
          <motion.div 
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ borderColor: "#475569" }}
          >
            <motion.h2 
              className="text-lg font-semibold text-white mb-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              Instructions
            </motion.h2>

            {isEditing ? (
              <motion.textarea
                value={editFormData.instructions}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    instructions: e.target.value,
                  })
                }
                disabled={isLoading}
                className="w-full bg-slate-700 text-white p-4 rounded-lg min-h-32 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              />
            ) : (
              <motion.p 
                className="text-slate-300 text-sm leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {agent.instructions || 'No instructions provided'}
              </motion.p>
            )}
          </motion.div>

          {/* Edit Actions */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex gap-3"
            >
              <motion.button
                onClick={handleSaveEdit}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(37, 99, 235, 0.4)" }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading && <Loader2 size={18} className="animate-spin" />}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </motion.button>
              <motion.button
                onClick={handleCancelEdit}
                disabled={isLoading}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-white">Delete Agent?</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-slate-300 mb-6 text-sm">
              This will permanently remove{' '}
              <span className="text-red-400 font-semibold">{agent.name}</span> and all associated meetings. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  console.log('Cancel button clicked');
                  setShowDeleteConfirm(false);
                }}
                disabled={isLoading}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Delete button clicked');
                  handleDeleteAgent();
                }}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-500 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                type="button"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}