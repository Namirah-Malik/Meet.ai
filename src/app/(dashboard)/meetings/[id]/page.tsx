'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Play, X, Clock, User, FileText,
  Loader2, CheckCircle2, Mic, MicOff, Video, VideoOff, Phone,
  LayoutList, AlignLeft, Video as VideoIcon, ChevronRight,
  Volume2, Download, AlertCircle
} from 'lucide-react';
import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';
type CompletedTab = 'summary' | 'transcript' | 'recording';

interface TranscriptEntry {
  speaker: string;
  text: string;
  startTime: string;
  stopTime: string;
}

// ─── OpenAI Realtime hook (unchanged) ────────────────────────────────────────

function useOpenAIRealtime(audioElRef: React.RefObject<HTMLAudioElement>) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [agentTranscript, setAgentTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');

  const handleRealtimeEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'response.audio.delta':       setAgentStatus('speaking'); break;
      case 'response.audio.done':        setAgentStatus('listening'); break;
      case 'response.audio_transcript.delta':
        setAgentTranscript(prev => prev + (event.delta || '')); break;
      case 'response.audio_transcript.done':
        setAgentTranscript(''); break;
      case 'conversation.item.input_audio_transcription.completed':
        setUserTranscript(event.transcript || '');
        setTimeout(() => setUserTranscript(''), 3000); break;
      case 'error':
        setAgentStatus('error');
        toast.error(`Agent error: ${event.error?.message || 'Unknown'}`); break;
    }
  }, []);

  const connect = useCallback(async (
    localStream: MediaStream,
    instructions: string,
    agentName: string
  ) => {
    try {
      setAgentStatus('connecting');
      const tokenRes = await fetch('/api/openai-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions, agentName }),
      });
      if (!tokenRes.ok) throw new Error(`Token fetch failed ${tokenRes.status}`);
      const { clientSecret } = await tokenRes.json();

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (audioElRef.current && e.track.kind === 'audio') {
          audioElRef.current.srcObject = e.streams[0];
          audioElRef.current.play().catch(console.error);
        }
        setAgentStatus('listening');
      };

      const micTrack = localStream.getAudioTracks()[0];
      if (micTrack) pc.addTrack(micTrack, localStream);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try { handleRealtimeEvent(JSON.parse(e.data)); } catch { /* noop */ }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });
      if (!sdpRes.ok) throw new Error(`SDP exchange failed ${sdpRes.status}`);
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (err: any) {
      setAgentStatus('error');
      toast.error(`Agent failed: ${err.message}`);
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

// ─── Completed Tabs ───────────────────────────────────────────────────────────

function SummaryTab({ summary }: { summary?: string | null }) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-700/50 border border-slate-600 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-slate-300 font-medium">Summary is being generated</p>
          <p className="text-slate-500 text-sm mt-1">This usually takes under a minute</p>
        </div>
      </div>
    );
  }

  // Render markdown-style content (bold **text**, bullet - items, newlines)
  const lines = summary.split('\n').filter(Boolean);

  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        const isBullet = line.startsWith('- ') || line.startsWith('• ');
        const isHeading = line.startsWith('**') && line.endsWith('**');
        const text = line.replace(/^\*\*|\*\*$/g, '').replace(/^[-•]\s/, '');

        if (isHeading) return (
          <h4 key={i} className="text-white font-semibold text-sm uppercase tracking-widest mt-6 first:mt-0 border-l-2 border-blue-500 pl-3">
            {text}
          </h4>
        );
        if (isBullet) return (
          <div key={i} className="flex items-start gap-3">
            <ChevronRight size={14} className="text-blue-400 mt-1 shrink-0" />
            <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
          </div>
        );
        return (
          <p key={i} className="text-slate-300 text-sm leading-relaxed">{text}</p>
        );
      })}
    </div>
  );
}

function TranscriptTab({ meetingId }: { meetingId: string }) {
  const transcriptQuery = trpc.meetings.getTranscript.useQuery(meetingId);

  if (transcriptQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (transcriptQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-slate-400 text-sm">Failed to load transcript</p>
      </div>
    );
  }

  const entries: TranscriptEntry[] = transcriptQuery.data?.transcript ?? [];

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-700/50 border border-slate-600 flex items-center justify-center">
          <AlignLeft className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-slate-400 text-sm">No transcript available for this meeting</p>
      </div>
    );
  }

  // Group consecutive entries by same speaker
  const grouped = entries.reduce<{ speaker: string; lines: TranscriptEntry[] }[]>((acc, entry) => {
    const last = acc[acc.length - 1];
    if (last && last.speaker === entry.speaker) {
      last.lines.push(entry);
    } else {
      acc.push({ speaker: entry.speaker, lines: [entry] });
    }
    return acc;
  }, []);

  const formatTime = (isoOrSeconds: string) => {
    try {
      const d = new Date(isoOrSeconds);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    } catch { /* noop */ }
    return isoOrSeconds;
  };

  // Assign consistent colors per speaker
  const speakerColors: Record<string, string> = {};
  const palette = [
    'text-blue-300 border-blue-500/60',
    'text-purple-300 border-purple-500/60',
    'text-emerald-300 border-emerald-500/60',
    'text-amber-300 border-amber-500/60',
    'text-rose-300 border-rose-500/60',
  ];
  let colorIndex = 0;
  entries.forEach((e) => {
    if (!speakerColors[e.speaker]) {
      speakerColors[e.speaker] = palette[colorIndex % palette.length];
      colorIndex++;
    }
  });

  return (
    <div className="space-y-6">
      {grouped.map((group, gi) => {
        const colorClass = speakerColors[group.speaker] ?? palette[0];
        const [textColor, borderColor] = colorClass.split(' ');
        return (
          <div key={gi} className={`flex gap-4`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full bg-slate-700 border ${borderColor} flex items-center justify-center shrink-0 mt-1`}>
              <span className={`text-xs font-bold ${textColor}`}>
                {group.speaker.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 mb-2">
                <span className={`text-xs font-semibold ${textColor}`}>{group.speaker}</span>
                <span className="text-xs text-slate-600">{formatTime(group.lines[0].startTime)}</span>
              </div>
              <div className="space-y-1">
                {group.lines.map((line, li) => (
                  <p key={li} className="text-slate-300 text-sm leading-relaxed">{line.text}</p>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecordingTab({ recordingUrl }: { recordingUrl?: string | null }) {
  if (!recordingUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-700/50 border border-slate-600 flex items-center justify-center">
          <VideoIcon className="w-7 h-7 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-slate-300 font-medium">No recording available</p>
          <p className="text-slate-500 text-sm mt-1">Recording was not enabled for this meeting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg overflow-hidden bg-black border border-slate-700">
        <video
          controls
          className="w-full max-h-[500px] object-contain"
          src={recordingUrl}
        >
          Your browser does not support video playback.
        </video>
      </div>
      <a
        href={recordingUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        <Download size={14} />
        Download recording
      </a>
    </div>
  );
}

// ─── Completed Meeting Panel with Tabs ────────────────────────────────────────

function CompletedMeetingPanel({
  meeting,
  meetingId,
}: {
  meeting: any;
  meetingId: string;
}) {
  const [activeTab, setActiveTab] = useState<CompletedTab>('summary');

  const tabs: { id: CompletedTab; label: string; icon: React.ReactNode }[] = [
    { id: 'summary',    label: 'Summary',    icon: <LayoutList size={14} /> },
    { id: 'transcript', label: 'Transcript', icon: <AlignLeft size={14} /> },
    { id: 'recording',  label: 'Recording',  icon: <VideoIcon size={14} /> },
  ];

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-700 bg-slate-900/40">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all relative ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6 min-h-[300px]">
        {activeTab === 'summary' && (
          <SummaryTab summary={meeting.summary} />
        )}
        {activeTab === 'transcript' && (
          <TranscriptTab meetingId={meetingId} />
        )}
        {activeTab === 'recording' && (
          <RecordingTab recordingUrl={meeting.recordingUrl} />
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
    if (agentAudioRef.current) agentAudioRef.current.play().catch(() => {});
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
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
      else toast.error('❌ ' + error.message);
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
    if (!confirm('Are you sure?')) return;
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

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );

  if (!meeting) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Meeting not found</h1>
        <Button onClick={() => router.push('/dashboard/meetings')} className="bg-blue-600 hover:bg-blue-700">Back to Meetings</Button>
      </div>
    </div>
  );

  const statusConfig: Record<string, any> = {
    upcoming:   { bgGradient: 'from-yellow-950 via-slate-950 to-slate-950', badgeBg: 'bg-yellow-500/30', badgeText: 'text-yellow-300', badgeBorder: 'border-yellow-500/50' },
    active:     { bgGradient: 'from-green-950 via-slate-950 to-slate-950',  badgeBg: 'bg-green-500/30',  badgeText: 'text-green-300',  badgeBorder: 'border-green-500/50'  },
    completed:  { bgGradient: 'from-purple-950 via-slate-950 to-slate-950', badgeBg: 'bg-purple-500/30', badgeText: 'text-purple-300', badgeBorder: 'border-purple-500/50' },
    processing: { bgGradient: 'from-blue-950 via-slate-950 to-slate-950',   badgeBg: 'bg-blue-500/30',   badgeText: 'text-blue-300',   badgeBorder: 'border-blue-500/50'   },
    cancelled:  { bgGradient: 'from-red-950 via-slate-950 to-slate-950',    badgeBg: 'bg-red-500/30',    badgeText: 'text-red-300',    badgeBorder: 'border-red-500/50'    },
  };
  const config = statusConfig[meeting.status] ?? statusConfig.upcoming;
  const agentStatusLabel = getAgentStatusLabel();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient}`}>
      <audio
        ref={agentAudioRef}
        autoPlay
        playsInline
        style={{ position: 'fixed', width: 1, height: 1, opacity: 0, bottom: 0, left: 0, pointerEvents: 'none' }}
      />

      {/* Header */}
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
            {meeting.status === 'upcoming'   && '⏱️ Upcoming'}
            {meeting.status === 'active'     && '🟢 Active'}
            {meeting.status === 'completed'  && '✅ Completed'}
            {meeting.status === 'processing' && '⚙️ Processing'}
            {meeting.status === 'cancelled'  && '❌ Cancelled'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">

            {/* ── Active: video call ─────────────────────────────────────────── */}
            {meeting.status === 'active' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 mb-8 overflow-hidden">
                <div className="relative bg-black aspect-video flex w-full">
                  {isCallJoined ? (
                    <>
                      <div className="w-1/2 bg-black border-r border-slate-700 relative flex items-center justify-center">
                        <video ref={userVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 z-10">
                          <p className="text-xs text-blue-300 font-medium">👤 You</p>
                          {userTranscript && <p className="text-xs text-slate-300 mt-1 max-w-[160px] truncate italic">"{userTranscript}"</p>}
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

            {/* ── Meeting info card ─────────────────────────────────────────── */}
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

            {/* ── Upcoming ──────────────────────────────────────────────────── */}
            {meeting.status === 'upcoming' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
                <h3 className="text-xl font-bold text-white mb-4">Ready to Start?</h3>
                <p className="text-slate-400 mb-8">Start the meeting and your AI agent will join via voice.</p>
                <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg border border-slate-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/50"><Clock size={40} className="text-yellow-300" /></div>
                    <p className="text-slate-400 font-medium">Waiting to start</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Processing ────────────────────────────────────────────────── */}
            {meeting.status === 'processing' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Processing Meeting</h3>
                    <p className="text-slate-400 text-sm mt-0.5">Generating transcript and summary…</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {['Fetching transcript', 'Resolving speakers', 'Generating AI summary', 'Saving results'].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" style={{ animationDelay: `${i * 150}ms` }} />
                      <p className="text-slate-400 text-sm">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Completed: Summary / Transcript / Recording tabs ──────────── */}
            {meeting.status === 'completed' && (
              <CompletedMeetingPanel meeting={meeting} meetingId={meetingId} />
            )}

            {/* ── Cancelled ─────────────────────────────────────────────────── */}
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

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-32">
              <h3 className="text-lg font-bold text-white mb-6">Actions</h3>
              <div className="space-y-3">
                {meeting.status === 'upcoming' && (
                  <>
                    <Button onClick={() => startMeetingMutation.mutateAsync(meetingId)} disabled={startMeetingMutation.isPending} className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2">
                      {startMeetingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={16} />} Start Meeting
                    </Button>
                    <Button onClick={handleCancelMeeting} disabled={cancelMeetingMutation.isPending} className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2">
                      {cancelMeetingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X size={16} />} Cancel Meeting
                    </Button>
                  </>
                )}
                {meeting.status === 'active' && (
                  !showNotesInput ? (
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
                  )
                )}
                {(meeting.status === 'completed' || meeting.status === 'cancelled' || meeting.status === 'processing') && (
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