import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  FileSpreadsheet,
  Image,
  LayoutDashboard,
  Link2,
  Send,
  Timer,
  Trash2,
  Upload,
  Video,
  Wifi,
  XCircle,
} from 'lucide-react'
import Papa from 'papaparse'
import readXlsxFile from 'read-excel-file/browser'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import {
  PALETTE,
  fillMessageTemplate,
  parseManualContacts,
  parseRowsToContacts,
  toDatetimeLocal,
} from './utils/contacts'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
  { key: 'scheduler', label: 'Story Scheduler', icon: Clock3 },
  { key: 'sender', label: 'Direct Sender', icon: Send },
  { key: 'pairing', label: 'Device Pairing', icon: Link2 },
  { key: 'queue', label: 'Dispatch Queue & Logs', icon: Activity },
]

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  processing: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  published: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  sent: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  failed: 'bg-red-500/20 text-red-300 border-red-400/30',
  cancelled: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
}

function App() {
  const [activeTab, setActiveTab] = useState('scheduler')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [serverTime, setServerTime] = useState(() => new Date())

  const [storyMode, setStoryMode] = useState('media')
  const [storyFile, setStoryFile] = useState(null)
  const [storyCaption, setStoryCaption] = useState('')
  const [textStory, setTextStory] = useState('')
  const [bgColor, setBgColor] = useState(PALETTE[0])
  const [scheduledAt, setScheduledAt] = useState(() => {
    const initial = new Date()
    initial.setMinutes(initial.getMinutes() + 30)
    return toDatetimeLocal(initial)
  })
  const [isScheduling, setIsScheduling] = useState(false)

  const [pairingPhone, setPairingPhone] = useState('+91')
  const [pairingCode, setPairingCode] = useState('')
  const [connectionLabel, setConnectionLabel] = useState('Pairing Required')

  const [senderMode, setSenderMode] = useState('manual')
  const [manualContacts, setManualContacts] = useState('')
  const [contacts, setContacts] = useState([])
  const [template, setTemplate] = useState('Hi {name}, your scheduled update is planned for {date}.')

  const [statusUpdates, setStatusUpdates] = useState([])
  const [messageQueue, setMessageQueue] = useState([])
  const [queueFilter, setQueueFilter] = useState('all')
  const [feedback, setFeedback] = useState('')

  const fileRef = useRef(null)

  useEffect(() => {
    const timer = window.setInterval(() => setServerTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const previewUrl = useMemo(() => (storyFile ? URL.createObjectURL(storyFile) : ''), [storyFile])

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    },
    [previewUrl],
  )

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return undefined
    }

    async function loadData() {
      const [statusResult, queueResult, sessionResult] = await Promise.all([
        supabase.from('status_updates').select('*').order('scheduled_at', { ascending: false }).limit(100),
        supabase.from('message_queue').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('device_sessions').select('*').order('last_heartbeat', { ascending: false }).limit(1),
      ])

      if (!statusResult.error) {
        setStatusUpdates(statusResult.data ?? [])
      }
      if (!queueResult.error) {
        setMessageQueue(queueResult.data ?? [])
      }
      if (!sessionResult.error && sessionResult.data?.[0]) {
        const latestSession = sessionResult.data[0]
        setConnectionLabel(
          latestSession.is_connected
            ? `Connected: ${latestSession.phone_number || 'Device'}`
            : 'Pairing Required',
        )
      }
    }

    loadData()

    const statusChannel = supabase
      .channel('status-updates-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'status_updates' },
        () => {
          supabase
            .from('status_updates')
            .select('*')
            .order('scheduled_at', { ascending: false })
            .limit(100)
            .then(({ data }) => setStatusUpdates(data ?? []))
        },
      )
      .subscribe()

    const queueChannel = supabase
      .channel('message-queue-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_queue' },
        () => {
          supabase
            .from('message_queue')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)
            .then(({ data }) => setMessageQueue(data ?? []))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(statusChannel)
      supabase.removeChannel(queueChannel)
    }
  }, [])

  const queueRows = useMemo(
    () => [
      ...statusUpdates.map((item) => ({
        id: item.id,
        type: 'Status Story',
        subtype: item.content_type,
        schedule: item.scheduled_at,
        status: item.status,
        payload: item.caption || item.media_url || '-',
        table: 'status_updates',
      })),
      ...messageQueue.map((item) => ({
        id: item.id,
        type: 'Direct Message',
        subtype: item.recipient_name || item.phone_number,
        schedule: item.created_at,
        status: item.status,
        payload: item.final_message,
        table: 'message_queue',
      })),
    ],
    [statusUpdates, messageQueue],
  )

  const filteredQueue = useMemo(() => {
    if (queueFilter === 'all') return queueRows
    if (queueFilter === 'stories') return queueRows.filter((row) => row.table === 'status_updates')
    if (queueFilter === 'messages') return queueRows.filter((row) => row.table === 'message_queue')
    if (queueFilter === 'published') {
      return queueRows.filter((row) => row.status === 'published' || row.status === 'sent')
    }
    return queueRows.filter((row) => row.status === queueFilter)
  }, [queueFilter, queueRows])

  const scheduledStories = statusUpdates.filter((item) => item.status === 'pending').length
  const activeQueue = queueRows.filter((row) => row.status === 'pending' || row.status === 'processing').length
  const deliveryRate = queueRows.length
    ? Math.round(
        (queueRows.filter((row) => row.status === 'published' || row.status === 'sent').length /
          queueRows.length) *
          100,
      )
    : 0

  async function validateVideoDuration(file) {
    if (!file.type.includes('video')) {
      return true
    }
    const maxVideoSizeBytes = 20 * 1024 * 1024
    if (file.size > maxVideoSizeBytes) {
      setFeedback('Video is too large. Keep MP4 stories short (recommended <=30s).')
      return false
    }

    return true
  }

  async function handleStoryFile(file) {
    if (!file) return

    const isImage = ['image/jpeg', 'image/png'].includes(file.type)
    const isVideo = file.type === 'video/mp4'

    if (!isImage && !isVideo) {
      setFeedback('Only JPG, PNG, and MP4 files are supported.')
      return
    }

    const isValidDuration = await validateVideoDuration(file)
    if (!isValidDuration) return

    setStoryFile(file)
    setFeedback('')
  }

  async function uploadStoryMedia(file) {
    if (!file || !supabase) {
      return null
    }

    const filePath = `status/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const { error: uploadError } = await supabase.storage
      .from('status-media')
      .upload(filePath, file, { upsert: false })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage.from('status-media').getPublicUrl(filePath)
    return data.publicUrl
  }

  async function scheduleStatus() {
    if (!supabase || !hasSupabaseConfig) {
      setFeedback('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable scheduling.')
      return
    }

    setIsScheduling(true)
    setFeedback('')

    try {
      const scheduleDate = new Date(scheduledAt)
      if (Number.isNaN(scheduleDate.getTime())) {
        throw new Error('Please select a valid datetime for scheduling.')
      }

      let contentType = 'text'
      let mediaUrl = null

      if (storyMode === 'media') {
        if (!storyFile) {
          throw new Error('Please upload an image or video before scheduling.')
        }
        contentType = storyFile.type.includes('video') ? 'video' : 'image'
        mediaUrl = await uploadStoryMedia(storyFile)
      } else if (!textStory.trim()) {
        throw new Error('Please add text for the text story mode.')
      }

      const payload = {
        content_type: contentType,
        media_url: mediaUrl,
        caption: storyMode === 'media' ? storyCaption.trim() || null : textStory.trim(),
        bg_color: bgColor,
        scheduled_at: scheduleDate.toISOString(),
      }

      const { data, error } = await supabase.from('status_updates').insert(payload).select().single()

      if (error) throw new Error(error.message)

      setStatusUpdates((prev) => [data, ...prev])
      setFeedback('Status scheduled successfully.')
    } catch (error) {
      setFeedback(error.message)
    } finally {
      setIsScheduling(false)
    }
  }

  function handlePreset(preset) {
    const now = new Date()
    const date = new Date(now)

    if (preset === '30m') {
      date.setMinutes(date.getMinutes() + 30)
    }

    if (preset === 'tonight') {
      date.setHours(20, 0, 0, 0)
      if (date < now) {
        date.setDate(date.getDate() + 1)
      }
    }

    if (preset === 'tomorrow') {
      date.setDate(date.getDate() + 1)
      date.setHours(9, 0, 0, 0)
    }

    setScheduledAt(toDatetimeLocal(date))
  }

  function handleManualParse() {
    const parsed = parseManualContacts(manualContacts)
    setContacts(parsed)
  }

  async function handleUploadChange(file) {
    if (!file) return

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => {
          setContacts(parseRowsToContacts(data))
        },
      })
      return
    }

    if (file.name.endsWith('.xlsx')) {
      const rows = await readXlsxFile(file)
      const [headers, ...data] = rows
      const mapped = data.map((row) => ({
        [headers?.[0] || 'phone']: row[0],
        [headers?.[1] || 'name']: row[1],
      }))
      setContacts(parseRowsToContacts(mapped))
      return
    }

    setFeedback('Please upload a .csv or .xlsx file.')
  }

  function removeContact(id) {
    setContacts((prev) => prev.filter((contact) => contact.id !== id))
  }

  function insertTag(tag) {
    setTemplate((prev) => `${prev}${prev.endsWith(' ') ? '' : ' '}${tag}`)
  }

  async function addToQueue() {
    if (!supabase || !contacts.length) {
      setFeedback('Add at least one contact and configure Supabase to enqueue messages.')
      return
    }

    const payload = contacts.map((contact) => ({
      phone_number: contact.phone_number,
      recipient_name: contact.recipient_name,
      final_message: fillMessageTemplate(template, contact),
    }))

    const { data, error } = await supabase.from('message_queue').insert(payload).select()

    if (error) {
      setFeedback(error.message)
      return
    }

    setMessageQueue((prev) => [...(data ?? []), ...prev])
    setFeedback('Contacts added to send queue.')
  }

  async function generatePairingCode() {
    const newCode = Array.from({ length: 8 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)],
    ).join('')

    setPairingCode(newCode)

    if (!supabase) {
      setConnectionLabel('Pairing Required')
      return
    }

    const { error } = await supabase.from('device_sessions').insert({
      phone_number: pairingPhone,
      pairing_code: newCode,
      is_connected: false,
    })

    if (!error) {
      setConnectionLabel('Pairing Required')
      setFeedback('Pairing code generated. Enter it in WhatsApp linked devices.')
    }
  }

  async function queueAction(row, action) {
    if (!supabase) return

    if (action === 'delete') {
      await supabase.from(row.table).delete().eq('id', row.id)
      if (row.table === 'status_updates') {
        setStatusUpdates((prev) => prev.filter((item) => item.id !== row.id))
      } else {
        setMessageQueue((prev) => prev.filter((item) => item.id !== row.id))
      }
      return
    }

    const nextStatus = action === 'cancel' ? 'cancelled' : 'pending'
    await supabase.from(row.table).update({ status: nextStatus }).eq('id', row.id)

    if (row.table === 'status_updates') {
      setStatusUpdates((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, status: nextStatus } : item)),
      )
    } else {
      setMessageQueue((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, status: nextStatus } : item)),
      )
    }
  }

  const samplePreview = contacts[0] ? fillMessageTemplate(template, contacts[0]) : template
  const safePreviewUrl = toSafeBlobUrl(previewUrl)

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100">
      <div className="flex min-h-screen">
        <aside className={`border-r border-slate-800 bg-[#151D2A] transition-all ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            {!isSidebarCollapsed && <span className="text-lg font-semibold text-emerald-400">WhatsAuto</span>}
            <button
              type="button"
              className="rounded-lg border border-slate-700 p-1 text-slate-300"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          <nav className="space-y-2 p-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon size={16} />
                  {!isSidebarCollapsed && item.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#1E293B] px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold">WhatsAuto</h1>
              <p className="text-sm text-slate-400">Automated WhatsApp Stories & Campaign Engine</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-emerald-300">
                {connectionLabel}
              </span>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
                Server Time: {serverTime.toLocaleTimeString()}
              </span>
            </div>
          </header>

          <div className="space-y-6 p-6">
            <section className="grid gap-4 md:grid-cols-3">
              <StatCard label="Scheduled Stories" value={scheduledStories} icon={Clock3} />
              <StatCard label="Active Queue" value={activeQueue} icon={Timer} />
              <StatCard label="Delivery Rate" value={`${deliveryRate}%`} icon={Wifi} />
            </section>

            {activeTab === 'dashboard' && (
              <section className="rounded-2xl border border-slate-800 bg-[#151D2A] p-6">
                <h2 className="text-lg font-semibold">Overview</h2>
                <p className="mt-2 text-slate-400">
                  Monitor scheduled stories, active dispatches, and queue performance from one place.
                </p>
              </section>
            )}

            {activeTab === 'scheduler' && (
              <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
                <div className="rounded-2xl border border-slate-800 bg-[#151D2A] p-6">
                  <h2 className="text-lg font-semibold">Story Scheduler</h2>
                  <div className="mt-4 flex rounded-xl border border-slate-700 p-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setStoryMode('media')}
                      className={`flex-1 rounded-lg px-3 py-2 ${storyMode === 'media' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300'}`}
                    >
                      Media Story
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoryMode('text')}
                      className={`flex-1 rounded-lg px-3 py-2 ${storyMode === 'text' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300'}`}
                    >
                      Text Story
                    </button>
                  </div>

                  {storyMode === 'media' ? (
                    <div className="mt-4 space-y-4">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/40 text-slate-300"
                      >
                        <Upload size={18} />
                        Drag & drop or click to upload JPG, PNG, MP4 (&lt;=30s)
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,video/mp4"
                        onChange={(event) => handleStoryFile(event.target.files?.[0])}
                      />
                      {storyFile && <p className="text-sm text-emerald-300">Selected: {storyFile.name}</p>}
                      <textarea
                        rows={3}
                        value={storyCaption}
                        onChange={(event) => setStoryCaption(event.target.value)}
                        placeholder="Optional media caption"
                        className="w-full rounded-xl border border-slate-700 bg-[#0B0F17] p-3 text-sm"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <textarea
                        rows={5}
                        value={textStory}
                        onChange={(event) => setTextStory(event.target.value.slice(0, 700))}
                        placeholder="Write your text status"
                        className="w-full rounded-xl border border-slate-700 bg-[#0B0F17] p-3 text-sm"
                      />
                      <p className="text-xs text-slate-400">{textStory.length}/700 characters</p>
                      <div className="flex gap-2">
                        {PALETTE.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setBgColor(color)}
                            className={`h-8 w-8 rounded-full border-2 ${bgColor === color ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 space-y-3 rounded-xl border border-slate-700 bg-[#0B0F17] p-4">
                    <label className="text-sm text-slate-300">Schedule at</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm"
                    />
                    <p className="text-xs text-slate-400">Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <PresetButton onClick={() => handlePreset('30m')} label="In 30 mins" />
                      <PresetButton onClick={() => handlePreset('tonight')} label="Tonight 8:00 PM" />
                      <PresetButton onClick={() => handlePreset('tomorrow')} label="Tomorrow 9:00 AM" />
                    </div>
                    <button
                      type="button"
                      onClick={scheduleStatus}
                      disabled={isScheduling}
                      className="w-full rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-900 disabled:opacity-60"
                    >
                      {isScheduling ? 'Scheduling...' : 'Schedule Status'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#151D2A] p-4">
                  <h3 className="mb-4 text-sm font-semibold text-slate-300">Live Mobile Preview</h3>
                  <div className="mx-auto aspect-[9/16] w-[240px] rounded-[28px] border-4 border-slate-700 bg-black p-2">
                    <div className="relative h-full overflow-hidden rounded-[20px] bg-slate-900">
                      {storyMode === 'media' && safePreviewUrl && (
                        <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-950/60 p-4 text-center">
                          {storyFile?.type.includes('video') ? (
                            <Video size={46} className="text-sky-300" />
                          ) : (
                            <Image size={46} className="text-emerald-300" />
                          )}
                          <p className="text-sm text-slate-200">{storyFile?.name}</p>
                          <p className="text-xs text-slate-400">
                            {storyFile?.type.includes('video')
                              ? 'Video selected (preview secured)'
                              : 'Image selected (preview secured)'}
                          </p>
                        </div>
                      )}
                      {storyMode === 'text' && (
                        <div className="flex h-full items-center justify-center p-5 text-center text-lg font-semibold" style={{ backgroundColor: bgColor }}>
                          {textStory || 'Your text status preview'}
                        </div>
                      )}
                      {!safePreviewUrl && storyMode === 'media' && (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                          Upload media to preview
                        </div>
                      )}
                      {storyCaption && storyMode === 'media' && (
                        <div className="absolute bottom-0 w-full bg-black/55 p-3 text-sm">{storyCaption}</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'pairing' && (
              <section className="rounded-2xl border border-slate-800 bg-[#151D2A] p-6">
                <h2 className="text-lg font-semibold">Device Pairing</h2>
                <p className="mt-1 text-sm text-slate-400">Link WhatsApp using phone number pairing code (no QR scan).</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={pairingPhone}
                    onChange={(event) => setPairingPhone(event.target.value)}
                    className="min-w-[240px] flex-1 rounded-xl border border-slate-700 bg-[#0B0F17] p-3"
                    placeholder="+91XXXXXXXXXX"
                  />
                  <button
                    type="button"
                    onClick={generatePairingCode}
                    className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-900"
                  >
                    Get Pairing Code
                  </button>
                </div>
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                  <p className="text-xs text-slate-300">Your pairing code</p>
                  <p className="mt-2 font-mono text-3xl tracking-[0.45em] text-emerald-300">{pairingCode || '--------'}</p>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(pairingCode)}
                    disabled={!pairingCode}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1 text-sm text-slate-200 disabled:opacity-50"
                  >
                    <Copy size={14} />
                    Copy Code
                  </button>
                </div>
                <ol className="mt-4 space-y-2 text-sm text-slate-300">
                  <li>1. Open WhatsApp on mobile &gt; Settings &gt; Linked Devices.</li>
                  <li>2. Tap "Link with phone number instead".</li>
                  <li>3. Enter the 8-digit pairing code shown on screen.</li>
                </ol>
              </section>
            )}

            {activeTab === 'sender' && (
              <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-slate-800 bg-[#151D2A] p-6">
                  <h2 className="text-lg font-semibold">Bulk Direct Sender</h2>
                  <div className="mt-4 flex rounded-xl border border-slate-700 p-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setSenderMode('manual')}
                      className={`flex-1 rounded-lg px-3 py-2 ${senderMode === 'manual' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300'}`}
                    >
                      Manual Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => setSenderMode('upload')}
                      className={`flex-1 rounded-lg px-3 py-2 ${senderMode === 'upload' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300'}`}
                    >
                      CSV / Excel Upload
                    </button>
                  </div>

                  {senderMode === 'manual' ? (
                    <>
                      <textarea
                        rows={7}
                        value={manualContacts}
                        onChange={(event) => setManualContacts(event.target.value)}
                        placeholder={'Phone, Name\\n+911111111111, Akash\\n+922222222222'}
                        className="mt-4 w-full rounded-xl border border-slate-700 bg-[#0B0F17] p-3 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleManualParse}
                        className="mt-3 rounded-xl border border-slate-600 px-4 py-2 text-sm"
                      >
                        Parse Contacts
                      </button>
                    </>
                  ) : (
                    <label className="mt-4 flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-[#0B0F17] text-sm text-slate-300">
                      <FileSpreadsheet size={18} />
                      Drop or select .csv / .xlsx file
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        onChange={(event) => handleUploadChange(event.target.files?.[0])}
                      />
                    </label>
                  )}

                  <div className="mt-6 space-y-3">
                    <label className="text-sm text-slate-300">Message template</label>
                    <textarea
                      rows={5}
                      value={template}
                      onChange={(event) => setTemplate(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-[#0B0F17] p-3 text-sm"
                    />
                    <div className="flex gap-2 text-xs">
                      <button type="button" className="rounded-full border border-slate-600 px-2 py-1" onClick={() => insertTag('{name}')}>{'{name}'}</button>
                      <button type="button" className="rounded-full border border-slate-600 px-2 py-1" onClick={() => insertTag('{date}')}>{'{date}'}</button>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-300">
                      Sample: {samplePreview}
                    </div>
                    <button
                      type="button"
                      onClick={addToQueue}
                      className="w-full rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-900"
                    >
                      Add to Send Queue
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#151D2A] p-6">
                  <h3 className="text-lg font-semibold">Contact Verification</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="pb-2">Phone Number</th>
                          <th className="pb-2">Recipient Name</th>
                          <th className="pb-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map((contact) => (
                          <tr key={contact.id} className="border-t border-slate-800">
                            <td className="py-2">{contact.phone_number}</td>
                            <td className="py-2">{contact.recipient_name || '-'}</td>
                            <td className="py-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-red-300"
                                onClick={() => removeContact(contact.id)}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {(activeTab === 'queue' || activeTab === 'dashboard') && (
              <section className="rounded-2xl border border-slate-800 bg-[#151D2A] p-6">
                <h2 className="text-lg font-semibold">Live Dispatch Queue & History</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {[
                    ['all', 'All'],
                    ['stories', 'Status Stories'],
                    ['messages', 'Direct Messages'],
                    ['pending', 'Pending'],
                    ['published', 'Published/Sent'],
                    ['failed', 'Failed'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setQueueFilter(value)}
                      className={`rounded-full border px-3 py-1 ${queueFilter === value ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Details</th>
                        <th className="pb-2">Scheduled/Created</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQueue.map((row) => (
                        <tr key={`${row.table}-${row.id}`} className="border-t border-slate-800 align-top">
                          <td className="py-3">{row.type}</td>
                          <td className="py-3">
                            <p>{row.subtype}</p>
                            <p className="line-clamp-2 text-xs text-slate-400">{row.payload}</p>
                          </td>
                          <td className="py-3">{new Date(row.schedule).toLocaleString()}</td>
                          <td className="py-3">
                            <span className={`rounded-full border px-2 py-1 text-xs ${STATUS_COLORS[row.status] || STATUS_COLORS.pending}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2 text-xs">
                              <ActionButton icon={XCircle} label="Cancel" onClick={() => queueAction(row, 'cancel')} />
                              <ActionButton icon={Timer} label="Retry" onClick={() => queueAction(row, 'retry')} />
                              <ActionButton icon={Trash2} label="Delete" onClick={() => queueAction(row, 'delete')} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {feedback && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200">
                {feedback}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-[#151D2A] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon size={16} className="text-emerald-400" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </article>
  )
}

function PresetButton({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-slate-600 px-3 py-1 text-slate-300">
      {label}
    </button>
  )
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-slate-200">
      <Icon size={12} />
      {label}
    </button>
  )
}

export default App

function toSafeBlobUrl(url) {
  return typeof url === 'string' && url.startsWith('blob:') ? url : ''
}
