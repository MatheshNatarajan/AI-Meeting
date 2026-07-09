import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Sparkles, MessageSquareText, Loader2, X } from 'lucide-react';
import { isSpeechApiAvailable, startWebSpeechRecognition, initVoskModel, processAudioStream, isModelLoaded } from '../services/voskService';
import { api } from '../services/api';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export default function MeetingRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  // UI
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [connStatus, setConnStatus] = useState('Click "Join" to start');
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLeaveMenu, setShowLeaveMenu] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [pipPosition, setPipPosition] = useState({ x: 24, y: 24 }); // top-right offset
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // VOSK
  const [voskStatus, setVoskStatus] = useState('idle');
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [localPartial, setLocalPartial] = useState('');
  const [remotePartial, setRemotePartial] = useState('');
  const [modelProgress, setModelProgress] = useState(0);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const candidateQueue = useRef([]);
  const localVoskRef = useRef(null);
  const remoteVoskRef = useRef(null);
  const fullTranscriptRef = useRef([]);
  const transcriptEndRef = useRef(null);
  const hasSubmittedRef = useRef(false);

  // Re-attach video streams securely if React remounts DOM via HMR
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStream && remoteVideoRef.current.srcObject !== remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  });

  // Scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptLines, localPartial, remotePartial]);

  // Handle Pip Dragging
  useEffect(() => {
    const minPadding = 8;
    const handleMove = (e) => {
      if (!isDragging.current) return;
      const dx = dragStart.current.x - e.clientX;
      const dy = e.clientY - dragStart.current.y;
      
      setPipPosition(prev => ({
        x: Math.max(minPadding, prev.x + dx),
        y: Math.max(minPadding, prev.y + dy)
      }));
      
      dragStart.current = { x: e.clientX, y: e.clientY };
    };
    const handleUp = () => { isDragging.current = false; };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  // ──────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────

  function wsSend(msg) {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  async function submitTranscript() {
    if (hasSubmittedRef.current) return;
    const lines = fullTranscriptRef.current;
    if (!lines.length) return;
    hasSubmittedRef.current = true;
    const text = lines.map(l => `[${l.timestamp}] ${l.speaker}: ${l.text}`).join('\n');
    try {
      await api.submitTranscript(id, text);
      console.log('[MeetSync] Transcript submitted');
    } catch (e) {
      console.error('[MeetSync] Submit failed:', e);
      hasSubmittedRef.current = false;
    }
  }

  // ──────────────────────────────────────
  //  Transcription helpers
  // ──────────────────────────────────────

  function addTranscriptEntry(speaker, text) {
    if (!text?.trim()) return;
    const entry = {
      speaker,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    fullTranscriptRef.current.push(entry);
    setTranscriptLines(prev => [...prev, entry]);
    
    // Broadcast my transcript to the other person (if I am 'You')
    if (speaker === 'You') {
      wsSend({ type: 'transcript-entry', entry });
    }
  }

  function startWebSpeech(speaker) {
    if (!isSpeechApiAvailable()) return null;
    return startWebSpeechRecognition({
      onPartial: (text) => {
        if (speaker === 'You') {
          setLocalPartial(text);
          wsSend({ type: 'transcript-partial', text });
        }
        else setRemotePartial(text);
      },
      onResult: (text) => {
        addTranscriptEntry(speaker, text);
        if (speaker === 'You') setLocalPartial('');
        else setRemotePartial('');
      },
      onError: (err) => console.warn(`[Speech] ${speaker}:`, err),
      onStatusChange: (status) => console.log(`[Speech] ${speaker}: ${status}`),
    });
  }

  async function startVoskTranscription(stream, speaker) {
    if (!isModelLoaded()) return null;
    try {
      return await processAudioStream(stream, {
        onPartial: (text) => {
          if (speaker === 'You') setLocalPartial(text);
          else setRemotePartial(text);
        },
        onResult: (text) => {
          addTranscriptEntry(speaker, text);
          if (speaker === 'You') setLocalPartial('');
          else setRemotePartial('');
        },
        onError: (err) => console.warn(`[VOSK] ${speaker}:`, err),
      });
    } catch (e) {
      console.error(`[VOSK] ${speaker} start failed:`, e);
      return null;
    }
  }

  // ──────────────────────────────────────
  //  Simple WebRTC: No Perfect Negotiation
  //  Just explicit offer → answer flow
  // ──────────────────────────────────────

  function createPC() {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Add local tracks
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      console.log('[WebRTC] Added local tracks:', stream.getTracks().map(t => t.kind));
    }

    // Remote tracks
    pc.ontrack = (e) => {
      console.log('[WebRTC] ★ Remote track:', e.track.kind, e.track.readyState);
      if (remoteVideoRef.current) {
        let stream = remoteVideoRef.current.srcObject;
        if (!stream) {
          stream = new MediaStream();
          remoteVideoRef.current.srcObject = stream;
        }
        if (!stream.getTracks().includes(e.track)) {
          stream.addTrack(e.track);
        }
        setRemoteStream(stream);
        remoteVideoRef.current.play().catch(() => {});
      }
      setConnStatus('Connected to peer ✓');
    };

    // ICE candidates → send to peer
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        wsSend({ type: 'candidate', candidate: e.candidate });
      }
    };

    // ICE state logging
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log('[WebRTC] ICE:', s);
      if (s === 'connected' || s === 'completed') setConnStatus('Connected to peer ✓');
      if (s === 'failed') {
        setConnStatus('ICE failed — retrying...');
        pc.restartIce();
      }
      if (s === 'disconnected') setConnStatus('Peer disconnected');
    };

    // Suppress auto-negotiation — we handle offers manually
    pc.onnegotiationneeded = () => {
      console.log('[WebRTC] onnegotiationneeded (suppressed)');
    };

    return pc;
  }

  async function createAndSendOffer() {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      console.log('[WebRTC] Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsSend({ type: 'offer', sdp: pc.localDescription });
      console.log('[WebRTC] Offer sent');
    } catch (e) {
      console.error('[WebRTC] Offer failed:', e);
    }
  }

  async function handleOffer(sdp) {
    const pc = pcRef.current || createPC();
    try {
      console.log('[WebRTC] Received offer, creating answer...');
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      wsSend({ type: 'answer', sdp: pc.localDescription });
      console.log('[WebRTC] Answer sent');
      // Drain queued candidates
      while (candidateQueue.current.length > 0) {
        const c = candidateQueue.current.shift();
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (err) {}
      }
    } catch (e) {
      console.error('[WebRTC] Answer failed:', e);
    }
  }

  async function handleAnswer(sdp) {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      console.log('[WebRTC] Received answer');
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      while (candidateQueue.current.length > 0) {
        const c = candidateQueue.current.shift();
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (err) {}
      }
    } catch (e) {
      console.error('[WebRTC] Answer handling failed:', e);
    }
  }

  async function handleCandidate(candidate) {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        candidateQueue.current.push(candidate);
      }
    } catch (e) {
      console.warn('[WebRTC] ICE candidate error:', e);
    }
  }

  // ──────────────────────────────────────
  //  Main init — runs when user clicks Join
  // ──────────────────────────────────────

  useEffect(() => {
    if (!hasJoined) return;

    let ws = null;
    let cleanup = [];

    (async () => {
      try {
        // 1. Check role
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        try {
          const res = await fetch(`/api/meetings/${id}`);
          if (res.ok) {
            const meeting = await res.json();
            
            // Check if meeting is already ended
            if (meeting.status === 'completed') {
              console.log('[MeetSync] Meeting already completed. Redirecting to notes...');
              navigate(`/notes/${id}`);
              return;
            }

            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const email = (user.email || '').toLowerCase().trim();
            const org = (meeting.organizer || '').toLowerCase().trim();
            if (org && email && org === email) {
              setIsAdmin(true);
              console.log('[MeetSync] Role: HOST');
            }
          }
        } catch (e) {
          console.error('[MeetSync] Failed to fetch meeting details:', e);
        }

        // 2. Get media
        setConnStatus('Getting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        cleanup.push(() => stream.getTracks().forEach(t => t.stop()));
        console.log('[MeetSync] Media ready');

        // 3. Start Transcription
        // Use Web Speech API (cloud, accurate) if available, otherwise VOSK (offline)
        if (isSpeechApiAvailable()) {
          console.log('[MeetSync] Using Web Speech API (cloud)');
          setVoskStatus('ready');
          setModelProgress(100);
          const speechCtrl = startWebSpeech('You');
          if (speechCtrl) {
            localVoskRef.current = speechCtrl;
            cleanup.push(() => speechCtrl.cleanup());
          }
        } else {
          // Fallback to VOSK
          console.log('[MeetSync] Web Speech unavailable, using VOSK fallback');
          setVoskStatus('loading');
          initVoskModel(p => setModelProgress(p))
            .then(async () => {
              setVoskStatus('ready');
              const r = await startVoskTranscription(stream, 'You');
              if (r) localVoskRef.current = r;
            })
            .catch(() => setVoskStatus('error'));
        }

        // 4. Create PeerConnection
        createPC();

        // 5. Connect WebSocket
        setConnStatus('Connecting...');
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${proto}//${location.host}/signaling`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WS] Connected');
          wsSend({ type: 'join', meetingId: id });
          setConnStatus('Waiting for peer...');
        };

        ws.onmessage = async (evt) => {
          const msg = JSON.parse(evt.data);
          console.log('[WS] ←', msg.type);

          switch (msg.type) {
            case 'peer-joined':
              // I was already in the room. A new peer joined. I send offer.
              console.log('[WS] Peer joined → sending offer');
              setConnStatus('Peer found — connecting...');
              await createAndSendOffer();
              break;

            case 'offer':
              await handleOffer(msg.sdp);
              break;

            case 'answer':
              await handleAnswer(msg.sdp);
              break;

            case 'candidate':
              await handleCandidate(msg.candidate);
              break;

            case 'peer-left':
              setRemoteStream(null);
              setConnStatus('Peer left');
              break;

            case 'transcript-entry':
              // The other person just finished a sentence
              // We replace the speaker with 'Participant' for consistency on our side
              const remoteEntry = { ...msg.entry, speaker: 'Participant' };
              setTranscriptLines(prev => [...prev, remoteEntry]);
              fullTranscriptRef.current.push(remoteEntry);
              setRemotePartial('');
              break;

            case 'transcript-partial':
              // The other person is currently speaking
              setRemotePartial(msg.text);
              break;

            case 'end-meeting':
              await submitTranscript();
              navigate(`/notes/${id}`);
              break;
          }
        };

        ws.onclose = () => setConnStatus('Disconnected');
        ws.onerror = (e) => console.error('[WS] Error:', e);
        cleanup.push(() => ws.close());

      } catch (err) {
        console.error('[MeetSync] Init error:', err);
        setConnStatus('Error: ' + err.message);
      }
    })();

    return () => {
      cleanup.forEach(fn => fn());
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      if (localVoskRef.current) localVoskRef.current.cleanup();
      if (remoteVoskRef.current) remoteVoskRef.current.cleanup();
    };
  }, [hasJoined, id]);

  // Auto-start remote transcription when remote stream is available
  // Note: Web Speech API uses the mic, so for remote audio we use VOSK
  useEffect(() => {
    if (!remoteStream) return;
    let active = true;
    (async () => {
      try {
        if (!isModelLoaded()) {
          console.log('[MeetSync] Loading VOSK model for remote transcription...');
          await initVoskModel();
        }
        if (remoteVoskRef.current) { remoteVoskRef.current.cleanup(); remoteVoskRef.current = null; }
        const r = await startVoskTranscription(remoteStream, 'Participant');
        if (active && r) remoteVoskRef.current = r;
      } catch (err) {
        console.error('[MeetSync] Failed to start remote transcription:', err);
      }
    })();
    return () => { active = false; };
  }, [remoteStream]);

  // Auto-save on tab close
  useEffect(() => {
    const h = () => submitTranscript();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  // ──────────────────────────────────────
  //  Actions
  // ──────────────────────────────────────

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };
  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOn(v => !v);
  };

  const handleEndCall = async () => {
    if (isAdmin) { setShowLeaveMenu(true); return; }
    await submitTranscript();
    navigate(`/notes/${id}`);
  };

  const handleEndMeeting = async () => {
    if (!confirm('End meeting for everyone?')) return;
    await submitTranscript();
    try {
      await fetch(`/api/meetings/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      wsSend({ type: 'end-meeting' });
    } catch {}
    setTimeout(() => navigate(`/notes/${id}`), 500);
  };

  // ──────────────────────────────────────
  //  RENDER: Join Screen
  // ──────────────────────────────────────

  if (!hasJoined) {
    return (
      <div className="flex flex-col h-screen bg-slate-950 font-sans items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 blur-[120px] rounded-full animate-bubble"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-bubble-delayed"></div>
        <div className="max-w-md w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-[0_64px_128px_-16px_rgba(0,0,0,0.8)] relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-10 shadow-2xl">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4 text-center">MeetSync</h1>
          <p className="text-white/40 text-sm font-medium text-center mb-12 px-4 leading-relaxed">
            AI-powered meetings with real-time transcription and task extraction.
          </p>
          <button
            onClick={() => setHasJoined(true)}
            className="w-full py-5 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-2xl transition-all shadow-2xl hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.2em] text-xs"
          >
            Join Meeting Room
          </button>
          <p className="text-[10px] text-white/20 text-center font-bold tracking-widest uppercase mt-4">
            Click to authorize camera & audio
          </p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────
  //  RENDER: Meeting Room
  // ──────────────────────────────────────

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 font-sans overflow-hidden select-none">
      {/* Top Bar */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center space-x-4">
          <div className="flex items-center px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-primary-500 mr-3 animate-pulse"></span>
            <span className="text-white font-bold tracking-tight text-sm">MeetSync Live</span>
            <div className="mx-3 w-px h-4 bg-white/10"></div>
            <span className="text-white/60 text-xs font-medium">Room: {id?.slice(0, 8)}...</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`px-4 py-2 backdrop-blur-xl border rounded-2xl text-xs font-bold flex items-center shadow-2xl ${
            voskStatus === 'ready' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            voskStatus === 'loading' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
            voskStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
            'bg-white/5 border-white/10 text-white/60'
          }`}>
            {voskStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
            {voskStatus === 'ready' && <Sparkles className="w-3.5 h-3.5 mr-2" />}
            {voskStatus === 'loading' ? `AI ${modelProgress}%` : voskStatus === 'ready' ? 'AI ACTIVE' : voskStatus === 'error' ? 'AI OFFLINE' : 'AI STANDBY'}
          </div>
          <div className="px-4 py-2 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl text-white/80 flex items-center text-xs font-bold shadow-2xl">
            <div className={`w-2 h-2 rounded-full mr-3 ${
              connStatus.includes('✓') ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
              connStatus.includes('Error') || connStatus.includes('failed') || connStatus.includes('Disconnected') ? 'bg-red-500' :
              'bg-primary-500 animate-pulse'
            }`}></div>
            {connStatus}
          </div>
        </div>
      </div>

      {/* Main Wide Frame */}
      <div className="flex-1 relative overflow-hidden bg-slate-900 border-b border-white/5 shadow-2xl">
        <video ref={remoteVideoRef} autoPlay playsInline muted={false}
          onClick={e => e.target.play().catch(() => {})}
          className="w-full h-full object-cover cursor-pointer" />
        
        {!remoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm px-12 text-center pointer-events-none">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
              <Video className="w-10 h-10 text-white/20" />
            </div>
            <p className="font-bold text-xl text-white/80 tracking-tight">{connStatus.toUpperCase()}</p>
            <p className="text-sm text-white/40 mt-3 max-w-sm leading-relaxed">
              Waiting for the other participant to join.
            </p>
          </div>
        )}

        {/* Local Video PiP Insider (Movable) */}
        <div 
          style={{ top: `${pipPosition.y}px`, right: `${pipPosition.x}px` }}
          onMouseDown={(e) => {
            isDragging.current = true;
            dragStart.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
          }}
          className={`absolute w-60 h-40 bg-slate-900 rounded-[1.5rem] border-2 border-primary-500/40 overflow-hidden flex items-center justify-center shadow-2xl z-50 transition-shadow ${isDragging.current ? 'cursor-grabbing scale-[1.02] shadow-primary-500/20' : 'cursor-grab hover:border-primary-400'}`}
        >
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] pointer-events-none" />
          {!isVideoOn && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl text-white/40 font-black shadow-inner">
                {JSON.parse(localStorage.getItem('user') || '{}').name?.[0] || 'U'}
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-xl text-white text-[10px] font-black tracking-widest flex items-center shadow-2xl uppercase pointer-events-none">
            YOU {isAdmin && <span className="ml-2 px-1.5 py-0.5 bg-primary-500 rounded-md text-[8px] border border-white/20">HOST</span>}
          </div>
        </div>

        <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl text-white text-xs font-bold tracking-widest flex items-center shadow-2xl z-10">
          <span className={`w-2 h-2 rounded-full mr-3 ${remoteStream ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
          REMOTE
        </div>

        {/* Transparent Live Transcript Overlay */}
        {showTranscript && (
          <div 
            className="absolute bottom-6 right-6 w-80 max-h-48 flex flex-col items-end justify-end pointer-events-none z-40 transition-all duration-500" 
            style={{ maskImage: 'linear-gradient(to top, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 100%)' }}
          >
             {transcriptLines.slice(-4).map((line, i) => (
                <div key={i} className="mb-1 animate-fade-in-up w-full text-right">
                  <p className="text-[13px] sm:text-[14px] font-serif font-normal leading-snug tracking-wide text-white/70 drop-shadow-sm transition-opacity">
                    {line.text}
                  </p>
                </div>
             ))}
             {(localPartial || remotePartial) && (
                <div className="mb-1 animate-pulse w-full text-right drop-shadow-sm">
                   {localPartial && <p className="text-[13px] sm:text-[14px] font-serif font-normal leading-snug tracking-wide text-white/40 italic">{localPartial}</p>}
                   {remotePartial && <p className="text-[13px] sm:text-[14px] font-serif font-normal leading-snug tracking-wide text-white/40 italic">{remotePartial}</p>}
                </div>
             )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-28 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex items-center justify-center px-10 gap-6 shadow-[0_-32px_64px_rgba(0,0,0,0.5)] z-50">
        <div className="flex items-center gap-4">
          <button onClick={toggleMute} className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 ${isMuted ? 'bg-red-500 text-white shadow-[0_16px_32px_rgba(239,68,68,0.3)]' : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 shadow-2xl'}`}>
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button onClick={toggleVideo} className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 ${!isVideoOn ? 'bg-red-500 text-white shadow-[0_16px_32px_rgba(239,68,68,0.3)]' : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 shadow-2xl'}`}>
            {!isVideoOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        </div>
        <div className="w-px h-12 bg-white/5 mx-2"></div>
        <div className="relative">
          <button onClick={handleEndCall} className="px-12 h-16 rounded-[1.5rem] bg-red-600 hover:bg-red-500 text-white flex items-center justify-center font-black tracking-widest text-xs transition-all shadow-[0_16px_32px_rgba(220,38,38,0.2)] hover:scale-105 active:scale-95 border border-white/10">
            <PhoneOff className="w-5 h-5 mr-4" />
            {isAdmin ? 'END' : 'LEAVE'}
          </button>
          {showLeaveMenu && (
            <div className="absolute bottom-full mb-8 left-1/2 -translate-x-1/2 w-80 bg-slate-900/90 backdrop-blur-[4rem] border border-white/10 rounded-[2.5rem] shadow-[0_64px_128px_-16px_rgba(0,0,0,0.9)] p-8 z-50">
              <div className="text-white font-black mb-6 flex items-center justify-center tracking-widest text-[10px]">
                <span className="w-2 h-2 rounded-full bg-primary-500 mr-3 animate-ping"></span>CONFIRM
              </div>
              <div className="flex flex-col gap-4">
                <button onClick={async () => { await submitTranscript(); navigate(`/notes/${id}`); }}
                  className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 text-white rounded-[1.25rem] text-xs font-black tracking-widest transition-all flex items-center border border-white/10">
                  <PhoneOff className="w-4 h-4 mr-4" /> LEAVE SESSION
                </button>
                <button onClick={handleEndMeeting}
                  className="w-full py-4 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-[1.25rem] text-xs font-black tracking-widest transition-all flex items-center">
                  <PhoneOff className="w-4 h-4 mr-4" /> END FOR ALL
                </button>
                <button onClick={() => setShowLeaveMenu(false)} className="w-full py-2 text-white/20 hover:text-white/60 text-[10px] font-black tracking-[0.3em] mt-4 transition-all">CANCEL</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
