// Code written by Kone & Claude | The code does the following: " The Meeting Intelligence page. It
// captures a transcript (live browser speech-to-text where available, or pasted notes), then asks the
// AI service to structure it into a meeting pack (summary + action plan) which is persisted and listed.
// Restores the original prototype's Meeting Intelligence feature, now backed by the real AI endpoint. "

import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { RichContent } from '../components/RichContent';
import { type DirUser } from './dashboards/shared';

interface Meeting { id: string; title: string; type: string; summary?: string | null; createdAt: string }
const TYPES = ['Sprint Planning', 'Daily Stand-up', 'Sprint Review', 'Project Briefing', 'Innovation Workshop', 'Management Update'];

export function MeetingIntelligencePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<DirUser[]>([]);
  const [title, setTitle] = useState('Sprint Planning Meeting');
  const [type, setType] = useState(TYPES[0]);
  const [speaker, setSpeaker] = useState('');
  const [transcript, setTranscript] = useState('');
  const [output, setOutput] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  function load() {
    api<Meeting[]>('/api/meetings').then(setMeetings).catch((e) => setError(e.message));
    api<DirUser[]>('/api/users').then((u) => { setUsers(u); if (u[0]) setSpeaker(u[0].name); }).catch(() => undefined);
  }
  useEffect(load, []);

  function addSpeakerStamp() {
    setTranscript((t) => `${t}\n${speaker || 'Speaker'} - ${new Date().toLocaleTimeString()}\n`);
  }

  // Code written by Kone & Claude | The code does the following: " Starts live speech-to-text using the
  // browser's Web Speech API where supported; otherwise prompts the user to paste notes instead. "
  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Live transcription is not supported in this browser. Please paste notes instead.'); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-ZA';
    rec.onresult = (event: any) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
      }
      if (finalText.trim()) setTranscript((t) => `${t}\n${speaker || 'Speaker'}: ${finalText.trim()}`);
    };
    rec.onend = () => setListening(false);
    rec.start(); recognitionRef.current = rec; setListening(true); setError('');
  }
  function stopListening() { recognitionRef.current?.stop(); setListening(false); }

  // Code written by Kone & Claude | The code does the following: " Sends the transcript to the AI meeting
  // endpoint, which structures and persists a meeting pack, then refreshes the saved list. "
  async function generate() {
    if (!transcript.trim()) { setError('Please record or paste a transcript first.'); return; }
    setBusy(true); setError('');
    try {
      const r = await api<{ summary: string }>('/api/ai/meeting', { method: 'POST', body: JSON.stringify({ title, type, transcript }) });
      setOutput(r.summary); load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="topbar">
        <div><h1>Meeting Intelligence</h1><p className="muted">Record, transcribe, structure and convert conversations into action plans.</p></div>
        <span className="badge">{meetings.length} saved</span>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="grid two section">
        <div className="card">
          <h3>Voice Note Taker</h3>
          <p className="muted small">Use live transcription where your browser supports it, or paste notes manually.</p>
          <div className="field"><label>Meeting Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid two">
            <div className="field"><label>Type</label><select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="field"><label>Active Speaker</label><select value={speaker} onChange={(e) => setSpeaker(e.target.value)}>{users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
          </div>
          <div className="actions row">
            {!listening
              ? <button className="btn green" type="button" onClick={startListening}>Start Live Transcription</button>
              : <button className="btn danger" type="button" onClick={stopListening}>Stop</button>}
            <button className="btn ghost" type="button" onClick={addSpeakerStamp}>Add Speaker Stamp</button>
          </div>
          <div className="field section"><label>Transcript</label><textarea rows={8} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Live transcript or pasted notes…" /></div>
          <button className="btn navy full" onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate Meeting Summary & Actions'}</button>
        </div>

        <div className="card">
          <h3>Structured Meeting Pack</h3>
          {output ? <RichContent markdown={output} /> : <p className="muted">No meeting summary generated yet. Capture a transcript and generate a pack.</p>}
        </div>
      </div>

      <div className="card section">
        <h3>Saved Meetings</h3>
        {meetings.length === 0 ? <p className="muted">No saved meetings yet.</p> : meetings.map((m) => (
          <div className="task" key={m.id} style={{ marginBottom: 12 }}>
            <b>{m.title}</b><span className="chip" style={{ marginLeft: 6 }}>{m.type}</span>
            <small>{new Date(m.createdAt).toLocaleString()}</small>
            <p className="small">{m.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
