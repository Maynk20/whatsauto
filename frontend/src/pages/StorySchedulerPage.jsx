import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  Clock,
  Image as ImageIcon,
  Type,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Smartphone,
  Info
} from 'lucide-react';

const PALETTE = [
  { name: 'Teal', hex: '#128C7E' },
  { name: 'Dark Teal', hex: '#075E54' },
  { name: 'WhatsApp Green', hex: '#25D366' },
  { name: 'Slate Dark', hex: '#1E293B' },
  { name: 'Royal Blue', hex: '#3B82F6' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Rose', hex: '#E11D48' }
];

export function StorySchedulerPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState('text'); // 'text' | 'media'
  const [caption, setCaption] = useState('');
  const [bgColor, setBgColor] = useState('#128C7E');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [scheduledStories, setScheduledStories] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Set default schedule to 1 hour from now
  useEffect(() => {
    const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
    setScheduledAt(defaultDate.toISOString().slice(0, 16));
    fetchStories();
  }, []);

  const fetchStories = async () => {
    setLoadingList(true);
    try {
      const res = await api.getStories();
      if (res.success) {
        setScheduledStories(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load stories:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handlePreset = (minutesFromNow, targetHour = null) => {
    const target = new Date();
    if (targetHour !== null) {
      if (target.getHours() >= targetHour) {
        target.setDate(target.getDate() + 1);
      }
      target.setHours(targetHour, 0, 0, 0);
    } else {
      target.setMinutes(target.getMinutes() + minutesFromNow);
    }
    setScheduledAt(target.toISOString().slice(0, 16));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'File exceeds 16MB limit.' });
        return;
      }
      setSelectedFile(file);
      setMediaPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      let mediaPath = null;

      // If media mode, upload to Supabase storage 'status-media'
      if (mode === 'media' && selectedFile) {
        setUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('status-media')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Media storage upload failed: ${uploadError.message}`);
        }
        mediaPath = filePath;
        setUploading(false);
      }

      const res = await api.scheduleStory({
        contentType: mode === 'media' ? (selectedFile?.type?.startsWith('video') ? 'video' : 'image') : 'text',
        mediaPath,
        caption,
        bgColor,
        scheduledAt: new Date(scheduledAt).toISOString()
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Story scheduled successfully!' });
        setCaption('');
        setSelectedFile(null);
        setMediaPreviewUrl(null);
        fetchStories();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to schedule story.' });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleCancelStory = async (id) => {
    try {
      await api.cancelStory(id);
      fetchStories();
    } catch (err) {
      alert(err.message || 'Failed to cancel story');
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Story Scheduler</h2>
        <p className="text-sm text-slate-400 mt-1">Design and schedule WhatsApp stories with realistic mobile viewport preview</p>
      </div>

      {/* Provider capability disclaimer */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Provider Compatibility Note: </span>
          The official Meta WhatsApp Business Cloud API does not support status broadcasting for standard API phone numbers.
          Stories scheduled here are processed via the active provider adapter or saved for scheduled manual broadcast.
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-secondary p-1 border border-slate-700/60">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-semibold transition ${
                  mode === 'text' ? 'bg-card text-accent shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Text Story</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('media')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-semibold transition ${
                  mode === 'media' ? 'bg-card text-accent shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photo / Video Story</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Text Story Options */}
              {mode === 'text' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Background Palette</label>
                  <div className="flex flex-wrap gap-2.5">
                    {PALETTE.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setBgColor(p.hex)}
                        style={{ backgroundColor: p.hex }}
                        className={`w-8 h-8 rounded-full border-2 transition ${
                          bgColor === p.hex ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'
                        }`}
                        title={p.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Media Story File Input */}
              {mode === 'media' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Image or Video (Max 16MB)</label>
                  <input
                    type="file"
                    accept="image/*,video/mp4"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Story Text / Caption</label>
                <textarea
                  rows={4}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={mode === 'text' ? 'Type your status update message...' : 'Add a caption for your media...'}
                  className="w-full px-3.5 py-2.5 bg-secondary border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Date & Time Scheduling */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Scheduled Broadcast Time (UTC/Local)</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <span className="text-[11px] text-slate-500 py-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handlePreset(30)}
                    className="px-2.5 py-1 rounded-md bg-secondary hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300"
                  >
                    In 30 mins
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset(null, 20)}
                    className="px-2.5 py-1 rounded-md bg-secondary hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300"
                  >
                    Tonight at 8 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset(null, 9)}
                    className="px-2.5 py-1 rounded-md bg-secondary hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300"
                  >
                    Tomorrow 9 AM
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-slate-950 font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting || uploading ? (
                  <span className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Schedule Story Update</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 9:16 Mobile Viewport Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
            <Smartphone className="w-4 h-4 text-accent" />
            <span>Interactive 9:16 Mobile Preview</span>
          </div>

          {/* Smartphone Frame */}
          <div className="w-[280px] h-[540px] bg-black border-4 border-slate-700 rounded-[38px] p-2.5 shadow-2xl relative flex flex-col overflow-hidden">
            {/* Top Notch / Camera Bar */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-30"></div>

            {/* Screen Content */}
            <div
              style={{ backgroundColor: mode === 'text' ? bgColor : '#0B1120' }}
              className="flex-1 w-full rounded-[28px] relative overflow-hidden flex flex-col justify-between p-4 transition-colors duration-300"
            >
              {/* WhatsApp Status Header Bars */}
              <div className="space-y-2 z-20">
                <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                  <div className="w-1/2 h-full bg-white"></div>
                </div>
                <div className="flex items-center space-x-2 text-white/90">
                  <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[10px] font-bold">
                    WA
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-semibold leading-tight">My Status</p>
                    <p className="text-[9px] text-white/70">Just now</p>
                  </div>
                </div>
              </div>

              {/* Preview Content Area */}
              <div className="my-auto z-10 text-center px-3">
                {mode === 'text' ? (
                  <p className="text-white text-base font-medium break-words leading-relaxed whitespace-pre-wrap">
                    {caption || 'Your status update text preview will appear here...'}
                  </p>
                ) : mediaPreviewUrl ? (
                  <div className="relative w-full h-64 rounded-xl overflow-hidden flex items-center justify-center bg-black/40">
                    <img src={mediaPreviewUrl} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="text-white/60 text-xs flex flex-col items-center justify-center space-y-2">
                    <ImageIcon className="w-10 h-10 stroke-1" />
                    <span>Upload an image to preview</span>
                  </div>
                )}
              </div>

              {/* Watermark */}
              <div className="text-center z-20">
                <span className="text-[9px] uppercase tracking-widest text-white/50 bg-black/40 px-2 py-0.5 rounded-full">
                  PREVIEW SIMULATION
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Scheduled Stories List */}
      <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-white mb-4">Scheduled Stories Queue</h3>
        {loadingList ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading stories...</div>
        ) : scheduledStories.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No upcoming stories scheduled.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Scheduled At</th>
                  <th className="py-3 px-4">Content Type</th>
                  <th className="py-3 px-4">Caption / Content</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {scheduledStories.map((story) => (
                  <tr key={story.id} className="hover:bg-secondary/20 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {new Date(story.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 uppercase font-semibold text-[11px] text-accent">{story.content_type}</td>
                    <td className="py-3 px-4 truncate max-w-xs">{story.caption || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        story.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' :
                        story.status === 'failed' ? 'bg-rose-500/10 text-rose-400' :
                        story.status === 'cancelled' ? 'bg-slate-700 text-slate-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {story.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {story.status === 'pending' && (
                        <button
                          onClick={() => handleCancelStory(story.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
