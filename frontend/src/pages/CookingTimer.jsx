import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, BellRing, Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useDocumentTitle } from '../hooks/useDebounce'
import { TIMER_PRESETS } from '../utils/constants'
import PageHeader from '../components/PageHeader'
import { InlineLoader } from '../components/Loader'

function formatClock(seconds) {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hrs) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function beep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const context = new AudioContext()
    ;[0, 0.45, 0.9].forEach((offset) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, context.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + offset + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.35)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(context.currentTime + offset)
      oscillator.stop(context.currentTime + offset + 0.4)
    })
    setTimeout(() => context.close(), 2000)
  } catch {
    // Audio is a progressive enhancement.
  }
}

export default function CookingTimer() {
  const { t } = useLanguage()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const initialMinutes = Number(searchParams.get('minutes') || 0)
  const initialSeconds = Number(searchParams.get('seconds') || 0)
  const recipeTitle = searchParams.get('title') || ''
  const presetDuration = initialSeconds || initialMinutes * 60 || 10 * 60

  const [duration, setDuration] = useState(presetDuration)
  const [remaining, setRemaining] = useState(presetDuration)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [notifPermission, setNotifPermission] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'))
  const [custom, setCustom] = useState({ minutes: Math.floor(presetDuration / 60), seconds: presetDuration % 60 })
  const endRef = useRef(null)
  const notifiedRef = useRef(false)
  useDocumentTitle(`${formatClock(remaining)} · ${t('timer.title')}`)

  useEffect(() => {
    if (!running) return undefined
    endRef.current = Date.now() + remaining * 1000
    const interval = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        clearInterval(interval)
        setRunning(false)
        setFinished(true)
        if (!notifiedRef.current) {
          notifiedRef.current = true
          beep()
          toast.success(t('timer.finished'))
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(t('timer.notificationTitle'), { body: t('timer.notificationBody'), icon: '/favicon.svg' })
          }
        }
      }
    }, 250)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  useEffect(() => {
    if (!running) return
    const handler = (event) => {
      if (document.visibilityState === 'visible') {
        const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
        setRemaining(left)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [running])

  const start = () => {
    let seconds = remaining
    if (seconds <= 0) seconds = duration
    if (seconds <= 0) {
      toast.error(t('timer.zeroError'))
      return
    }
    setRemaining(seconds)
    setFinished(false)
    notifiedRef.current = false
    setRunning(true)
    toast.info(t('timer.started'))
  }

  const pause = () => setRunning(false)

  const reset = () => {
    setRunning(false)
    setFinished(false)
    notifiedRef.current = false
    setRemaining(duration)
    toast.info(t('timer.resetMsg'))
  }

  const applyDuration = useCallback((seconds) => {
    if (seconds <= 0) return
    setRunning(false)
    setFinished(false)
    notifiedRef.current = false
    setDuration(seconds)
    setRemaining(seconds)
    setCustom({ minutes: Math.floor(seconds / 60), seconds: seconds % 60 })
  }, [])

  const applyCustom = () => {
    const seconds = Math.max(0, Number(custom.minutes || 0) * 60 + Number(custom.seconds || 0))
    if (seconds <= 0) {
      toast.error(t('timer.zeroError'))
      return
    }
    applyDuration(seconds)
  }

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === 'granted') toast.success(t('timer.notificationsOn'))
  }

  const progress = duration > 0 ? Math.min(1, Math.max(0, (duration - remaining) / duration)) : 0
  const ringStyle = { background: `conic-gradient(var(--gold) ${progress * 360}deg, var(--timer-track) 0deg)` }

  return (
    <div className="page timer-page">
      <PageHeader
        eyebrow={t('timer.subtitle')}
        title={t('timer.title')}
        actions={
          <button type="button" className="btn btn-ghost" onClick={requestNotifications} disabled={notifPermission === 'granted'}>
            {notifPermission === 'granted' ? <BellRing size={16} /> : <Bell size={16} />}
            {notifPermission === 'granted' ? t('timer.notificationsOn') : t('timer.enableNotifications')}
          </button>
        }
      />

      <div className="timer-layout">
        <section className="timer-stage panel">
          {recipeTitle ? <span className="timer-recipe">{t('timer.fromRecipe', { name: recipeTitle })}</span> : null}
          <div className={`timer-ring ${running ? 'running' : ''} ${finished ? 'finished' : ''}`} style={ringStyle}>
            <div className="timer-inner">
              <TimerIcon size={22} />
              <strong>{formatClock(remaining)}</strong>
              <span>{finished ? t('timer.finished') : running ? t('timer.running') : remaining < duration ? t('timer.paused') : t('timer.ready')}</span>
            </div>
          </div>

          <div className="timer-controls">
            {running ? (
              <button type="button" className="btn btn-primary btn-lg" onClick={pause}><Pause size={18} /> {t('timer.pause')}</button>
            ) : (
              <button type="button" className="btn btn-primary btn-lg" onClick={start}>
                <Play size={18} /> {remaining < duration && !finished ? t('timer.resume') : t('timer.start')}
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-lg" onClick={reset}><RotateCcw size={18} /> {t('timer.reset')}</button>
          </div>

          {finished ? <div className="timer-finished-note"><BellRing size={17} /> {t('timer.finishedText')}</div> : null}

          <div className="timer-presets">
            <span>{t('timer.presets')}</span>
            <div>
              {TIMER_PRESETS.map((minutes) => (
                <button key={minutes} type="button" className={duration === minutes * 60 ? 'active' : ''} onClick={() => applyDuration(minutes * 60)}>
                  {minutes} {t('common.min')}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="timer-aside">
          <div className="panel custom-timer">
            <h3>{t('timer.custom')}</h3>
            <div className="form-row">
              <div className="field">
                <label htmlFor="timer-minutes">{t('timer.minutes')}</label>
                <input id="timer-minutes" type="number" min="0" max="600" value={custom.minutes} onChange={(event) => setCustom((c) => ({ ...c, minutes: event.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="timer-seconds">{t('timer.seconds')}</label>
                <input id="timer-seconds" type="number" min="0" max="59" value={custom.seconds} onChange={(event) => setCustom((c) => ({ ...c, seconds: event.target.value }))} />
              </div>
            </div>
            <button type="button" className="btn btn-gold btn-block" onClick={applyCustom}>{t('common.confirm')}</button>
          </div>
          <div className="panel timer-tip">
            <TimerIcon size={20} />
            <h3>{t('timer.ready')}</h3>
            <p>{t('timer.subtitle')}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
