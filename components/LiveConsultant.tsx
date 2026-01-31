
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

interface LiveConsultantProps {
  onBack: () => void;
}

const LiveConsultant: React.FC<LiveConsultantProps> = ({ onBack }) => {
  const isDark = document.documentElement.classList.contains('dark');
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Standby');
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Helper: Base64 Decoding
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Helper: Base64 Encoding
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Helper: Audio Data Decoding
  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    try {
      setStatus('Initializing Protocol...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
      if (videoRef.current) videoRef.current.srcObject = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: 'You are the Elite Live Auditor. You can see the student and their ledger. Be professional, direct, and helpful. Use terms like FIFO, LIFO, GAAP, and IFRS where appropriate.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus('Active');
            setIsActive(true);
            
            // Microphone stream
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // Video frames stream
            frameIntervalRef.current = window.setInterval(() => {
              if (canvasRef.current && videoRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                  canvasRef.current.toBlob((blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Data = (reader.result as string).split(',')[1];
                        sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
                      };
                      reader.readAsDataURL(blob);
                    }
                  }, 'image/jpeg', 0.6);
                }
              }
            }, 1500);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setCurrentInput(prev => prev + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.outputTranscription) {
              setCurrentOutput(prev => prev + message.serverContent!.outputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              setTranscripts(prev => [...prev, `You: ${currentInput}`, `Auditor: ${currentOutput}`]);
              setCurrentInput('');
              setCurrentOutput('');
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => {
            console.error('Live API Error:', e);
            stopSession();
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      setStatus('Access Denied: Permissions Required');
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setStatus('Standby');
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 sm:p-12 animate-pop ${isDark ? 'bg-black' : 'bg-[#fafafa]'}`}>
      <div className="absolute top-10 left-10 right-10 flex items-center justify-between">
        <div className="flex items-center space-x-4">
           <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white font-black italic shadow-xl shadow-red-600/20">M</div>
           <div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-current">Live Audit Node</h2>
              <div className="flex items-center space-x-2 mt-1">
                 <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`}></span>
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{status}</span>
              </div>
           </div>
        </div>
        <button onClick={() => { stopSession(); onBack(); }} className="px-8 py-3 rounded-full border border-black/10 dark:border-white/10 font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">TERMINATE SESSION</button>
      </div>

      <div className="grid grid-cols-12 gap-10 w-full max-w-[1400px] mt-20">
         <div className="col-span-12 lg:col-span-7 space-y-8">
            <div className={`relative aspect-video rounded-[3rem] overflow-hidden border-2 transition-all ${isActive ? 'border-red-600/30' : 'border-zinc-200 dark:border-zinc-800'}`}>
               <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-75 contrast-125" />
               <canvas ref={canvasRef} width="320" height="240" className="hidden" />
               <div className="absolute inset-0 pointer-events-none border-[40px] border-black/10"></div>
               <div className="absolute top-10 right-10 flex space-x-2">
                  <div className="px-4 py-2 rounded-lg bg-red-600/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest">LIVE REC</div>
               </div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 border border-blue-500/20 rounded-3xl relative animate-pulse">
                     <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
                     <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
                     <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
                     <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>
                  </div>
               </div>
            </div>
            <div className={`p-10 rounded-[3rem] border apple-card ${isDark ? 'bg-zinc-950 border-white/5' : 'bg-white'}`}>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mb-8">Auditor Transcription History</p>
               <div className="h-[200px] overflow-y-auto space-y-4 pr-4 hide-scrollbar">
                  {transcripts.length === 0 && <p className="text-xs italic opacity-20">Waiting for interaction...</p>}
                  {transcripts.map((t, i) => (
                    <p key={i} className={`text-xs font-bold leading-relaxed ${t.startsWith('You') ? 'text-blue-500' : 'text-current opacity-80'}`}>{t}</p>
                  ))}
                  {(currentInput || currentOutput) && (
                    <div className="animate-pulse">
                      <p className="text-xs font-black text-blue-500">You: {currentInput}</p>
                      <p className="text-xs font-black opacity-80 mt-2">Auditor: {currentOutput}</p>
                    </div>
                  )}
               </div>
            </div>
         </div>
         <div className="col-span-12 lg:col-span-5 flex flex-col justify-between">
            <div className={`p-12 rounded-[3.5rem] border apple-card text-center flex-1 mb-8 flex flex-col items-center justify-center space-y-10 ${isDark ? 'bg-zinc-950 border-white/5' : 'bg-white shadow-2xl'}`}>
               <div className="w-40 h-40 rounded-full border-4 border-dashed border-blue-500/20 flex items-center justify-center animate-[spin_20s_linear_infinite]">
                  <div className="w-32 h-32 rounded-full bg-blue-600/10 flex items-center justify-center">
                     <div className="w-20 h-20 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-600/50 flex items-center justify-center">
                        <span className="text-white text-4xl font-black italic">M</span>
                     </div>
                  </div>
               </div>
               <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic">Lead Partner Audit</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-40 mt-4">MASTER ACCOUNTS. Node v2.0</p>
               </div>
               <div className="w-full space-y-8 pt-10">
                  {!isActive ? (
                    <button onClick={startSession} className="w-full py-7 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all">
                      INITIALIZE LIVE AUDIT
                    </button>
                  ) : (
                    <div className="space-y-4">
                       <div className="flex items-center justify-center space-x-2">
                          {[...Array(12)].map((_, i) => (
                            <div key={i} className="w-1.5 h-8 bg-blue-600/20 rounded-full overflow-hidden relative">
                               <div className="absolute bottom-0 w-full bg-blue-600 animate-[wave_1s_infinite_ease-in-out]" style={{ height: '50%', animationDelay: `${i * 0.1}s` }}></div>
                            </div>
                          ))}
                       </div>
                       <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Voice Stream Active</p>
                    </div>
                  )}
               </div>
            </div>
            <div className={`p-10 rounded-[3rem] border apple-card ${isDark ? 'bg-zinc-950 border-white/5' : 'bg-white'}`}>
               <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4">Node Capability</h4>
               <ul className="text-[10px] font-bold uppercase space-y-3 opacity-60">
                  <li>• Dynamic Ledger Verification</li>
                  <li>• Real-time GAAP/IFRS Conflict Check</li>
                  <li>• Multimodal Visual Observation</li>
                  <li>• Instant Pro-Rata Recalculation</li>
               </ul>
            </div>
         </div>
      </div>
      <style>{`
        @keyframes wave {
          0%, 100% { height: 20%; }
          50% { height: 90%; }
        }
      `}</style>
    </div>
  );
};

export default LiveConsultant;
