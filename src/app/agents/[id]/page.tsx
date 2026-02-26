'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Play, X, Clock, User, FileText,
  Loader2, CheckCircle2, Mic, MicOff, Video, VideoOff, Phone
} from 'lucide-react';
import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type AgentStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

function useOpenAIRealtime(audioElRef: React.RefObject<HTMLAudioElement>) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [agentTranscript, setAgentTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');

  const handleRealtimeEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'response.audio.delta':
        setAgentStatus('speaking');
        break;
      case 'response.audio.done':
        setAgentStatus('listening');
        break;
      case 'response.audio_transcript.delta':
        setAgentTranscript(prev => prev + (event.delta || ''));
        break;
      case 'response.audio_transcript.done':
        setAgentTranscript('');
        break;
      case 'conversation.item.input_audio_transcription.completed':
        setUserTranscript(event.transcript || '');
        setTimeout(() => setUserTranscript(''), 3000);
        break;
      case 'error':
        console.error('[Realtime] OpenAI error event:', event.error);
        setAgentStatus('error');
        toast.error(`Agent error: ${event.error?.message || 'Unknown error'}`);
        break;
      default:
        if (!['input_audio_buffer.speech_started','input_audio_buffer.speech_stopped',
              'input_audio_buffer.committed','response.created','rate_limits.updated'].includes(event.type)) {
          console.log('[Realtime] Event:', event.type);
        }
    }
  }, []);

  const connect = useCallback(async (
    localStream: MediaStream,
    instructions: string,
    agentName: string
  ) => {
    try {
      setAgentStatus('connecting');

      console.log('[Realtime] Step 1: Fetching session token...');
      const tokenRes = await fetch('/api/openai-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions, agentName }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('[Realtime] Token fetch failed:', tokenRes.status, errText);
        throw new Error(`Failed to get session token: ${tokenRes.status}`);
      }

      const { clientSecret } = await tokenRes.json();
      console.log('[Realtime] Step 1 OK: clientSecret', clientSecret ? '✅ present' : '❌ missing');

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => console.log('[Realtime] ICE:', pc.iceConnectionState);
      pc.onconnectionstatechange = () => console.log('[Realtime] Connection:', pc.connectionState);

      pc.ontrack = (e) => {
        console.log('[Realtime] ontrack fired! kind:', e.track.kind, '| audioEl:', audioElRef.current ? '✅' : '❌ NULL');
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0];
          audioElRef.current.play()
            .then(() => console.log('[Realtime] ✅ Audio playing!'))
            .catch((err) => console.error('[Realtime] ❌ Audio play() failed:', err));
        }
        setAgentStatus('listening');
      };

      const audioTrack = localStream.getAudioTracks()[0];
      console.log('[Realtime] Mic track:', audioTrack ? `✅ ${audioTrack.label}` : '❌ NONE');
      if (audioTrack) {
        pc.addTrack(audioTrack, localStream);
      }

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.onopen = () => console.log('[Realtime] ✅ DataChannel open');
      dc.onmessage = (e) => {
        try { handleRealtimeEvent(JSON.parse(e.data)); } catch { /* ignore */ }
      };
      dc.onerror = (err) => console.error('[Realtime] DataChannel error:', err);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[Realtime] Step 6 OK: Local description set');

      console.log('[Realtime] Step 7: Sending SDP to OpenAI...');
      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientSecret}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      console.log('[Realtime] SDP response status:', sdpRes.status);
      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        console.error('[Realtime] SDP exchange failed:', errText);
        throw new Error(`OpenAI WebRTC handshake failed: ${sdpRes.status}`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      console.log('[Realtime] ✅ Setup complete! Waiting for agent...');
      toast.success(`🤖 ${agentName} connected!`);

    } catch (err: any) {
      console.error('[Realtime] ❌ Connect failed:', err);
      setAgentStatus('error');
      toast.error(`Agent connection failed: ${err.message}`);
    }
  }, [audioElRef, handleRealtimeEvent]);

  const disconnect = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    if (audioElRef.current) audioElRef.current.srcObject = null;
    pcRef.current = null;
    dcRef.current = null;
    setAgentStatus('idle');
    setAgentTranscript('');
    setUserTranscript('');
  }, [audioElRef]);

  return { connect, disconnect, agentStatus, agentTranscript, userTranscript };
}

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

  const userVideoRef = useRef<HTMLVideoElement>(null);
  const agentAudioRef = useRef<HTMLAudioElement>(null);
  const { connect, disconnect, agentStatus, agentTranscript, userTranscript } = useOpenAIRealtime(agentAudioRef);

  const agentConnected = !['idle', 'connecting', 'error'].includes(agentStatus);

  useEffect(() => {
    if (isCallJoined && userVideoRef.current && mediaStream) {
      userVideoRef.current.srcObject = mediaStream;
      userVideoRef.current.play().catch(console.error);
    }
  }, [isCallJoined, mediaStream]);

  useEffect(() => {
    return () => {
      disconnect();
      mediaStream?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line

  const meetingQuery = trpc.meetings.getById.useQuery(meetingId);
  const meeting = meetingQuery.data;
  const isLoading = meetingQuery.isLoading;

  const startMeetingMutation = trpc.meetings.startMeeting.useMutation({
    onSuccess: () => { toast.success('✅ Meeting started!'); meetingQuery.refetch(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to start meeting'),
  });

  const endMeetingMutation = trpc.meetings.endMeeting.useMutation({
    onSuccess: () => { toast.success('✅ Meeting completed!'); meetingQuery.refetch(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to end meeting'),
  });

  const cancelMeetingMutation = trpc.meetings.cancelMeeting.useMutation({
    onSuccess: () => { toast.success('❌ Meeting cancelled!'); router.push('/dashboard/meetings'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to cancel meeting'),
  });

  const handleJoinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setMediaStream(stream);
      setIsCallJoined(true);
      setIsMicOn(true);
      setIsVideoOn(true);
      toast.success('✅ Camera and microphone enabled!');
      if (meeting?.agent) {
        toast.loading(`Connecting ${meeting.agent.name}...`, { id: 'agent-connect' });
        await connect(stream, meeting.agent.instructions, meeting.agent.name);
        toast.dismiss('agent-connect');
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') toast.error('❌ Camera/Mic access denied');
      else if (error.name === 'NotFoundError') toast.error('❌ No camera/microphone found');
      else toast.error('❌ Error: ' + error.message);
    }
  };

  const handleToggleMic = () => {
    if (!mediaStream) return;
    mediaStream.getAudioTracks().forEach(t => { t.enabled = !isMicOn; });
    setIsMicOn(prev => !prev);
    toast.success(isMicOn ? '🔇 Muted' : '🎤 Unmuted');
  };

  const handleToggleVideo = () => {
    if (!mediaStream) return;
    mediaStream.getVideoTracks().forEach(t => { t.enabled = !isVideoOn; });
    setIsVideoOn(prev => !prev);
    toast.success(isVideoOn ? '📹 Camera off' : '📹 Camera on');
  };

  const handleLeaveCall = () => {
    disconnect();
    mediaStream?.getTracks().forEach(t => t.stop());
    if (userVideoRef.current) userVideoRef.current.srcObject = null;
    setMediaStream(null);
    setIsCallJoined(false);
    setIsMicOn(true);
    setIsVideoOn(true);
    toast.success('Left call');
  };

  const handleEndMeeting = async () => {
    if (isCallJoined) handleLeaveCall();
    await endMeetingMutation.mutateAsync({ id: meetingId, notes: notes || undefined });
  };

  const handleCancelMeeting = async () => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;
    if (isCallJoined) handleLeaveCall();
    await cancelMeetingMutation.mutateAsync(meetingId);
  };

  const formatDate = (date: any) => {
    if (!date) return 'Not scheduled';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(date));
    } catch { return 'Invalid date'; }
  };

  const getAgentStatusLabel = () => {
    switch (agentStatus) {
      case 'connecting': return { text: '⏳ Connecting...', color: 'text-yellow-300' };
      case 'listening':  return { text: '👂 Listening...', color: 'text-green-300' };
      case 'speaking':   return { text: '🗣️ Speaking...', color: 'text-blue-300' };
      case 'error':      return { text: '⚠️ Error', color: 'text-red-300' };
      default:           return { text: '💤 Idle', color: 'text-slate-400' };
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

  const statusConfig: Record<string, any> = {
    upcoming:  { bgGradient: 'from-yellow-950 via-slate-950 to-slate-950', badgeBg: 'bg-yellow-500/30', badgeText: 'text-yellow-300', badgeBorder: 'border-yellow-500/50' },
    active:    { bgGradient: 'from-green-950 via-slate-950 to-slate-950',  badgeBg: 'bg-green-500/30',  badgeText: 'text-green-300',  badgeBorder: 'border-green-500/50'  },
    completed: { bgGradient: 'from-purple-950 via-slate-950 to-slate-950', badgeBg: 'bg-purple-500/30', badgeText: 'text-purple-300', badgeBorder: 'border-purple-500/50' },
    cancelled: { bgGradient: 'from-red-950 via-slate-950 to-slate-950',    badgeBg: 'bg-red-500/30',    badgeText: 'text-red-300',    badgeBorder: 'border-red-500/50'    },
  };
  const config = statusConfig[meeting.status] ?? statusConfig.upcoming;
  const agentStatusLabel = getAgentStatusLabel();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient}`}>
      {/* Agent audio MUST be a real DOM element */}
      <audio
        ref={agentAudioRef}
        autoPlay
        playsInline
        style={{ position: 'fixed', bottom: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      <div className="bg-slate-900/50 border-b border-slate-700/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/meetings')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={24} className="text-slate-400 hover:text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">My Meetings</h1>
            <p className="text-slate-400">› {meeting.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold border inline-block ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}>
            {meeting.status === 'upcoming'  && '⏱️ Upcoming'}
            {meeting.status === 'active'    && '🟢 Active'}
            {meeting.status === 'completed' && '✅ Completed'}
            {meeting.status === 'cancelled' && '❌ Cancelled'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">

            {meeting.status === 'active' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 mb-8 overflow-hidden">
                <div className="relative bg-black aspect-video flex w-full">
                  {isCallJoined ? (
                    <>
                      <div className="w-1/2 bg-black border-r border-slate-700 relative flex items-center justify-center">
                        <video ref={userVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 z-10">
                          <p className="text-xs text-blue-300 font-medium">👤 You</p>
                          {userTranscript && (
                            <p className="text-xs text-slate-300 mt-1 max-w-[160px] truncate italic">"{userTranscript}"</p>
                          )}
                        </div>
                      </div>

                      <div className="w-1/2 bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center relative">
                        {agentStatus === 'connecting' ? (
                          <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
                            <p className="text-slate-300 text-sm">Connecting agent...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 shadow-xl transition-all duration-300 ${
                              agentStatus === 'speaking'  ? 'border-blue-400 bg-gradient-to-br from-blue-600 to-purple-600 scale-110 shadow-blue-500/40' :
                              agentStatus === 'listening' ? 'border-green-400 bg-gradient-to-br from-purple-600 to-pink-600' :
                              agentStatus === 'error'     ? 'border-red-400 bg-gradient-to-br from-red-800 to-red-950' :
                                                           'border-slate-600 bg-gradient-to-br from-slate-700 to-slate-800'
                            }`}>
                              <span className="text-5xl">🤖</span>
                            </div>
                            <div className="text-center">
                              <p className="text-white font-semibold text-sm">{meeting.agent?.name || 'Agent'}</p>
                              <p className={`text-xs mt-1 ${agentStatusLabel.color}`}>{agentStatusLabel.text}</p>
                            </div>
                            {agentTranscript && (
                              <div className="absolute bottom-16 right-3 left-3 bg-slate-900/90 backdrop-blur rounded-lg px-3 py-2 border border-slate-700">
                                <p className="text-xs text-slate-200 italic line-clamp-2">"{agentTranscript}"</p>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 z-10">
                          <p className="text-xs text-purple-300 font-medium">🤖 {meeting.agent?.name}</p>
                        </div>
                      </div>

                      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 z-20">
                        <p className="text-sm text-green-300 font-medium">🟢 Call Active</p>
                        {agentConnected && <p className={`text-xs mt-0.5 ${agentStatusLabel.color}`}>{agentStatusLabel.text}</p>}
                      </div>

                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 z-30">
                        <button onClick={handleToggleMic} className={`p-3 rounded-full transition-all ${isMicOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'}`}>
                          {isMicOn ? <Mic size={20} className="text-white" /> : <MicOff size={20} className="text-white" />}
                        </button>
                        <button onClick={handleToggleVideo} className={`p-3 rounded-full transition-all ${isVideoOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'}`}>
                          {isVideoOn ? <Video size={20} className="text-white" /> : <VideoOff size={20} className="text-white" />}
                        </button>
                        <button onClick={handleLeaveCall} className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all">
                          <Phone size={20} className="text-white rotate-[135deg]" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-40">
                        <button onClick={handleJoinCall} className="group flex flex-col items-center gap-4">
                          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50 group-hover:border-green-400 group-hover:bg-green-500/30 transition-all">
                            <Phone size={48} className="text-green-300" />
                          </div>
                          <div className="text-center">
                            <p className="text-white font-medium group-hover:text-green-300 transition-colors">Click to join call</p>
                            <p className="text-sm text-slate-400 mt-1">Camera, mic & AI agent will connect</p>
                          </div>
                        </button>
                      </div>
                      <div className="w-1/2 bg-black border-r border-slate-700 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/50"><span className="text-xl">📹</span></div>
                          <p className="text-slate-400 text-xs">Your video</p>
                        </div>
                      </div>
                      <div className="w-1/2 bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center border border-slate-600"><span className="text-xl">🤖</span></div>
                          <p className="text-slate-500 text-xs">{meeting.agent?.name || 'Agent'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 mb-8">
              <h2 className="text-3xl font-bold text-white mb-6">{meeting.name}</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User size={20} className="text-blue-400" />
                  <div><p className="text-sm text-slate-400">Agent</p><p className="text-white font-medium">{meeting.agent?.name || 'Unknown'}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-blue-400" />
                  <div><p className="text-sm text-slate-400">Scheduled</p><p className="text-white font-medium">{formatDate(meeting.scheduledAt)}</p></div>
                </div>
                {meeting.description && (
                  <div className="flex items-start gap-3 mt-6 pt-6 border-t border-slate-700">
                    <FileText size={20} className="text-blue-400 mt-1" />
                    <div><p className="text-sm text-slate-400">Description</p><p className="text-white mt-2">{meeting.description}</p></div>
                  </div>
                )}
              </div>
            </div>

            {meeting.status === 'upcoming' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
                <h3 className="text-xl font-bold text-white mb-4">Ready to Start?</h3>
                <p className="text-slate-400 mb-8">This meeting hasn't started yet. Start it and your AI agent will join via voice.</p>
                <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg border border-slate-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/50"><Clock size={40} className="text-yellow-300" /></div>
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
                    <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/50"><CheckCircle2 size={40} className="text-purple-300" /></div>
                    <p className="text-slate-400 font-medium">Meeting completed successfully</p>
                  </div>
                </div>
                {meeting.notes && (
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
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
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50"><X size={40} className="text-red-300" /></div>
                    <p className="text-slate-400 font-medium">This meeting has been cancelled</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-32">
              <h3 className="text-lg font-bold text-white mb-6">Actions</h3>
              <div className="space-y-3">
                {meeting.status === 'upcoming' && (
                  <>
                    <Button onClick={() => startMeetingMutation.mutateAsync(meetingId)} disabled={startMeetingMutation.isPending} className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2">
                      {startMeetingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={16} />}
                      Start Meeting
                    </Button>
                    <Button onClick={handleCancelMeeting} disabled={cancelMeetingMutation.isPending} className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2">
                      {cancelMeetingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X size={16} />}
                      Cancel Meeting
                    </Button>
                  </>
                )}
                {meeting.status === 'active' && (
                  <>
                    {!showNotesInput ? (
                      <Button onClick={() => setShowNotesInput(true)} disabled={isCallJoined} className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed" title={isCallJoined ? 'Leave the call first' : ''}>
                        End Meeting
                      </Button>
                    ) : (
                      <>
                        <textarea placeholder="Add notes (optional)..." value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none text-sm" rows={3} />
                        <Button onClick={handleEndMeeting} disabled={endMeetingMutation.isPending} className="w-full bg-green-600 hover:bg-green-700 text-white">
                          {endMeetingMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Completing...</> : 'Complete Meeting'}
                        </Button>
                        <Button onClick={() => setShowNotesInput(false)} variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-700">Cancel</Button>
                      </>
                    )}
                  </>
                )}
                {(meeting.status === 'completed' || meeting.status === 'cancelled') && (
                  <Button onClick={() => router.push('/dashboard/meetings')} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Back to Meetings</Button>
                )}
              </div>
              {meeting.agent?.instructions && meeting.status === 'active' && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-medium">AGENT PROMPT</p>
                  <p className="text-xs text-slate-500 line-clamp-4">{meeting.agent.instructions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}