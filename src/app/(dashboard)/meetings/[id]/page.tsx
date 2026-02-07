'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, X, Clock, User, FileText, Loader2, CheckCircle2, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';
import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState('');
  const [isCallJoined, setIsCallJoined] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const meetingQuery = trpc.meetings.getById.useQuery(meetingId);
  const meeting = meetingQuery.data;
  const isLoading = meetingQuery.isLoading;

  const startMeetingMutation = trpc.meetings.startMeeting.useMutation({
    onSuccess: () => {
      toast.success('✅ Meeting started!');
      meetingQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to start meeting');
    },
  });

  const endMeetingMutation = trpc.meetings.endMeeting.useMutation({
    onSuccess: () => {
      toast.success('✅ Meeting completed!');
      meetingQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to end meeting');
    },
  });

  const cancelMeetingMutation = trpc.meetings.cancelMeeting.useMutation({
    onSuccess: () => {
      toast.success('❌ Meeting cancelled!');
      router.push('/dashboard/meetings');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to cancel meeting');
    },
  });

  const handleStartMeeting = async () => {
    await startMeetingMutation.mutateAsync(meetingId);
  };

  // Render video frames to canvas
  useEffect(() => {
    if (!isCallJoined || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const drawFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Mirror the video
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        // Draw the video frame
        ctx.drawImage(video, 0, 0);
      }
      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  }, [isCallJoined]);

  const handleJoinCall = async () => {
    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set stream to state and video element
      setMediaStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Ensure video plays
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error('Play error:', err);
            toast.error('Failed to play video');
          });
        };
      }

      setIsCallJoined(true);
      setIsMicOn(true);
      setIsVideoOn(true);
      toast.success('✅ Camera and microphone enabled!');
    } catch (error: any) {
      console.error('Error accessing media:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('❌ Camera/Mic access denied. Please allow permissions in browser');
      } else if (error.name === 'NotFoundError') {
        toast.error('❌ No camera/microphone found. Please check your device');
      } else {
        toast.error('❌ Error: ' + error.message);
      }
    }
  };

  const handleToggleMic = async () => {
    if (!mediaStream) {
      toast.error('Call not active');
      return;
    }

    mediaStream.getAudioTracks().forEach(track => {
      track.enabled = !isMicOn;
    });

    setIsMicOn(!isMicOn);
    toast.success(isMicOn ? '🔇 Microphone muted' : '🎤 Microphone unmuted');
  };

  const handleToggleVideo = async () => {
    if (!mediaStream) {
      toast.error('Call not active');
      return;
    }

    mediaStream.getVideoTracks().forEach(track => {
      track.enabled = !isVideoOn;
    });

    setIsVideoOn(!isVideoOn);
    toast.success(isVideoOn ? '📹 Camera stopped' : '📹 Camera started');
  };

  const handleLeaveCall = async () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setMediaStream(null);
    setIsCallJoined(false);
    setIsMicOn(true);
    setIsVideoOn(true);
    toast.success('Left call');
  };

  const handleEndMeeting = async () => {
    if (isCallJoined) {
      await handleLeaveCall();
    }
    await endMeetingMutation.mutateAsync({
      id: meetingId,
      notes: notes || undefined,
    });
  };

  const handleCancelMeeting = async () => {
    if (confirm('Are you sure you want to cancel this meeting?')) {
      if (isCallJoined) {
        await handleLeaveCall();
      }
      await cancelMeetingMutation.mutateAsync(meetingId);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  const formatDate = (date: any) => {
    if (!date) return 'Not scheduled';
    try {
      const d = new Date(date);
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Meeting not found</h1>
          <Button onClick={() => router.push('/dashboard/meetings')} className="bg-blue-600 hover:bg-blue-700">
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  // Get status-based colors
  const getStatusConfig = () => {
    switch (meeting.status) {
      case 'upcoming':
        return {
          bgGradient: 'from-yellow-950 via-slate-950 to-slate-950',
          badgeBg: 'bg-yellow-500/30',
          badgeText: 'text-yellow-300',
          badgeBorder: 'border-yellow-500/50',
        };
      case 'active':
        return {
          bgGradient: 'from-green-950 via-slate-950 to-slate-950',
          badgeBg: 'bg-green-500/30',
          badgeText: 'text-green-300',
          badgeBorder: 'border-green-500/50',
        };
      case 'completed':
        return {
          bgGradient: 'from-purple-950 via-slate-950 to-slate-950',
          badgeBg: 'bg-purple-500/30',
          badgeText: 'text-purple-300',
          badgeBorder: 'border-purple-500/50',
        };
      case 'cancelled':
        return {
          bgGradient: 'from-red-950 via-slate-950 to-slate-950',
          badgeBg: 'bg-red-500/30',
          badgeText: 'text-red-300',
          badgeBorder: 'border-red-500/50',
        };
      default:
        return {
          bgGradient: 'from-blue-950 via-slate-950 to-slate-950',
          badgeBg: 'bg-blue-500/30',
          badgeText: 'text-blue-300',
          badgeBorder: 'border-blue-500/50',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient}`}>
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-slate-700/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/meetings')}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-slate-400 hover:text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">My Meetings</h1>
                <p className="text-slate-400">› {meeting.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Meeting Status Indicator */}
        <div className="mb-8">
          <div className="inline-block">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}>
              {meeting.status === 'upcoming' && '⏱️ Upcoming'}
              {meeting.status === 'active' && '🟢 Active'}
              {meeting.status === 'completed' && '✅ Completed'}
              {meeting.status === 'cancelled' && '❌ Cancelled'}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Content */}
          <div className="lg:col-span-3">
            {/* Video Call Area - Only for Active Meetings */}
            {meeting.status === 'active' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-0 mb-8 overflow-hidden">
                {/* Video Call UI */}
                <div className="relative bg-black aspect-video flex items-center justify-center w-full">
                  {/* Hidden video element - for capturing camera feed */}
                  <video
                    ref={videoRef}
                    style={{ display: 'none' }}
                  />

                  {isCallJoined ? (
                    <>
                      {/* Canvas for displaying video */}
                      <canvas
                        ref={canvasRef}
                        className="w-full h-full object-cover bg-black"
                      />

                      {/* Call Controls */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 z-20">
                        <button
                          onClick={handleToggleMic}
                          className={`p-3 rounded-full transition-all ${
                            isMicOn
                              ? 'bg-slate-700 hover:bg-slate-600'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                          title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
                        >
                          {isMicOn ? (
                            <Mic size={20} className="text-white" />
                          ) : (
                            <MicOff size={20} className="text-white" />
                          )}
                        </button>

                        <button
                          onClick={handleToggleVideo}
                          className={`p-3 rounded-full transition-all ${
                            isVideoOn
                              ? 'bg-slate-700 hover:bg-slate-600'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                          title={isVideoOn ? 'Stop camera' : 'Start camera'}
                        >
                          {isVideoOn ? (
                            <Video size={20} className="text-white" />
                          ) : (
                            <VideoOff size={20} className="text-white" />
                          )}
                        </button>

                        <button
                          onClick={handleLeaveCall}
                          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all"
                          title="Leave call"
                        >
                          <Phone size={20} className="text-white" />
                        </button>
                      </div>

                      {/* Status Info */}
                      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 z-20">
                        <p className="text-sm text-green-300 font-medium">🟢 Call Active</p>
                        <p className="text-xs text-slate-400">Connected with {meeting.agent?.name}</p>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={handleJoinCall}
                      className="group flex flex-col items-center gap-4 hover:opacity-90 transition-opacity"
                    >
                      <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50 group-hover:border-green-400 group-hover:bg-green-500/30 transition-all">
                        <Phone size={48} className="text-green-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 font-medium group-hover:text-green-300 transition-colors">Click to join call</p>
                        <p className="text-sm text-slate-500 mt-1">Camera & Microphone will be enabled</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Meeting Info Card */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 mb-8">
              <h2 className="text-3xl font-bold text-white mb-6">{meeting.name}</h2>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <User size={20} className="text-blue-400" />
                  <div>
                    <p className="text-sm text-slate-400">Agent</p>
                    <p className="text-white font-medium">{meeting.agent?.name || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-blue-400" />
                  <div>
                    <p className="text-sm text-slate-400">Scheduled</p>
                    <p className="text-white font-medium">{formatDate(meeting.scheduledAt)}</p>
                  </div>
                </div>

                {meeting.description && (
                  <div className="flex items-start gap-3 mt-6 pt-6 border-t border-slate-700">
                    <FileText size={20} className="text-blue-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-400">Description</p>
                      <p className="text-white mt-2">{meeting.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status-based Content */}
            {meeting.status === 'upcoming' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
                <h3 className="text-xl font-bold text-white mb-6">Ready to Start?</h3>
                <p className="text-slate-400 mb-8">This meeting is scheduled but hasn't started yet. Click the button below to begin the meeting with your agent.</p>
                <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg border border-slate-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/50">
                      <Clock size={40} className="text-yellow-300" />
                    </div>
                    <p className="text-slate-400 font-medium">Waiting to start</p>
                  </div>
                </div>
              </div>
            )}

            {meeting.status === 'completed' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
                <h3 className="text-xl font-bold text-white mb-6">Meeting Completed</h3>
                <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg border border-slate-700 flex items-center justify-center mb-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/50">
                      <CheckCircle2 size={40} className="text-purple-300" />
                    </div>
                    <p className="text-slate-400 font-medium">Meeting completed successfully</p>
                  </div>
                </div>

                {meeting.notes && (
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mt-6">
                    <p className="text-sm text-slate-400 mb-2">Notes</p>
                    <p className="text-white">{meeting.notes}</p>
                  </div>
                )}
              </div>
            )}

            {meeting.status === 'cancelled' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
                <h3 className="text-xl font-bold text-white mb-6">Meeting Cancelled</h3>
                <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg border border-slate-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                      <X size={40} className="text-red-300" />
                    </div>
                    <p className="text-slate-400 font-medium">This meeting has been cancelled</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Actions */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-32">
              <h3 className="text-lg font-bold text-white mb-6">Actions</h3>

              <div className="space-y-3">
                {meeting.status === 'upcoming' && (
                  <>
                    <Button
                      onClick={handleStartMeeting}
                      disabled={startMeetingMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                    >
                      {startMeetingMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                      Start Meeting
                    </Button>
                    <Button
                      onClick={handleCancelMeeting}
                      disabled={cancelMeetingMutation.isPending}
                      className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                    >
                      {cancelMeetingMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X size={16} />
                      )}
                      Cancel Meeting
                    </Button>
                  </>
                )}

                {meeting.status === 'active' && (
                  <>
                    {!showNotesInput ? (
                      <Button
                        onClick={() => setShowNotesInput(true)}
                        disabled={isCallJoined}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        End Meeting
                      </Button>
                    ) : (
                      <>
                        <textarea
                          placeholder="Add notes about the meeting (optional)..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none text-sm"
                          rows={3}
                        />
                        <Button
                          onClick={handleEndMeeting}
                          disabled={endMeetingMutation.isPending}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          {endMeetingMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Completing...
                            </>
                          ) : (
                            'Complete Meeting'
                          )}
                        </Button>
                        <Button
                          onClick={() => setShowNotesInput(false)}
                          variant="outline"
                          className="w-full border-slate-700 text-slate-300 hover:bg-slate-700"
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </>
                )}

                {meeting.status === 'completed' && (
                  <Button
                    onClick={() => router.push('/dashboard/meetings')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Back to Meetings
                  </Button>
                )}

                {meeting.status === 'cancelled' && (
                  <Button
                    onClick={() => router.push('/dashboard/meetings')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Back to Meetings
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}