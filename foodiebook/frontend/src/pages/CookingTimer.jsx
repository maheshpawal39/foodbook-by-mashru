import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bell,
  BellOff,
  CheckCircle2,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  Timer as TimerIcon,
  Utensils,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useDocumentTitle } from '../hooks/useUtils'
import { formatClock } from '../utils/format'

const PRESETS = [1, 3, 5, 10, 30]

export default function CookingTimer() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const initialMinutes = Math.min(180, Math.max(1, Number(searchParams.get('minutes')) || 10))
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60)
  const [remaining, setRemaining] = useState(initialMinutes * 60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [minutesInput, setMinutesInput] = useState(String(initialMinutes))
  const [secondsInput, setSecondsInput] = useState('0')
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )
  const firedRef = useRef(false)
  useDocumentTitle(t('timer.title'))

  useEffect(() => {
    if (!running) return undefined
    const interval = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          setRunning(false)
          setFinished(true)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [running])

  useEffect(() => {
    if (!running) return undefined
    document.title = `${formatClock(remaining)} · FoodieBook`
    return () => {
      document.title = 'FoodieBook by Marshru'
    }
  }, [remaining, running])

  useEffect(() => {
    if (!finished || firedRef.current) return
    firedRef.current = true
    toast.success(t('timer.alarmToast'))
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.frequency.value = 880
      gain.gain.value = 0.0001
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.9)
      setTimeout(() => context.close(), 1200)
    } catch (error) {
      /* audio unavailable */
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('FoodieBook by Marshru', { body: t('timer.finishedMessage'), icon: '/favicon.svg' })
      } catch (error) {
        /* notification unavailable */
      }
    }
  }, [finished, t, toast])

  const setTimer = (seconds) => {
    const safe = Math.max(1, Math.min(180 * 60, Math.round(seconds)))
    setTotalSeconds(safe)
    setRemaining(safe)
    setRunning(false)
    setFinished(false)
    firedRef.current = false
    setMinutesInput(String(Math.floor(safe / 60)))
    setSecondsInput(String(safe % 60))
  }

  const applyCustom = (event) => {
    event.preventDefault()
    const minutes = Math.max(0, Math.min(180, Number(minutesInput) || 0))
    const seconds = Math.max(0, Math.min(59, Number(secondsInput) || 0))
    const total = minutes * 60 + seconds
    if (total < 1) return
    setTimer(total)
  }

  const start = () => {
    if (finished || remaining === 0) {
      setRemaining(totalSeconds)
      setFinished(false)
      firedRef.current = false
    }
    setRunning(true)
  }

  const pause = () => setRunning(false)
  const resume = () => setRunning(true)
  const reset = () => {
    setRunning(false)
    setFinished(false)
    setRemaining(totalSeconds)
    firedRef.current = false
  }

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') toast.success(t('timer.notificationOn'))
    else if (result === 'denied') toast.info(t('timer.notificationDenied'))
  }

  const progress = totalSeconds ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0
  const status = finished ? t('timer.done') : running ? t('timer.running') : remaining < totalSeconds ? t('timer.paused') : t('timer.ready')

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('nav.cookingTimer')} title={t('timer.title')} subtitle={t('timer.subtitle')} />

      <div className="timer-layout">
        <section className={`timer-card ${running ? 'is-running' : ''} ${finished ? 'is-finished' : ''}`}>
          <div className="timer-status">
            <span className={`timer-pulse ${running ? 'active' : ''}`} />
            {status}
          </div>

          <div className="timer-ring" style={{ '--progress': `${progress * 3.6}deg` }}>
            <div className="timer-inner">
              <span className="timer-digits">{formatClock(remaining)}</span>
              <span className="timer-total">{t('common.totalTime')} · {formatClock(totalSeconds)}</span>
            </div>
          </div>

          {finished && (
            <div className="timer-finished">
              <CheckCircle2 size={22} />
              <div>
                <strong>{t('timer.finished')}</strong>
                <span>{t('timer.finishedMessage')}</span>
              </div>
            </div>
          )}

          <div className="timer-controls">
            {!running ? (
              <button type="button" className="btn btn-primary btn-lg" onClick={remaining === totalSeconds || finished ? start : resume}>
                <Play size={19} /> {remaining === totalSeconds || finished ? t('timer.start') : t('timer.resume')}
              </button>
            ) : (
              <button type="button" className="btn btn-gold btn-lg" onClick={pause}>
                <Pause size={19} /> {t('timer.pause')}
              </button>
            )}
            <button type="button" className="btn btn-outline btn-lg" onClick={reset}>
              <RotateCcw size={18} /> {t('timer.reset')}
            </button>
          </div>

          <div className="timer-notify">
            {permission === 'granted' ? (
              <span className="notify-granted"><Bell size={15} /> {t('timer.notificationOn')}</span>
            ) : permission === 'denied' ? (
              <span className="notify-muted"><BellOff size={15} /> {t('timer.notificationDenied')}</span>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" onClick={requestNotifications}>
                <Bell size={15} /> {t('timer.enableNotifications')}
              </button>
            )}
          </div>
        </section>

        <aside className="timer-side">
          <section className="panel">
            <h3>{t('timer.preset')}</h3>
            <div className="timer-presets">
              {PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={`preset-btn ${totalSeconds === minutes * 60 ? 'active' : ''}`}
                  onClick={() => setTimer(minutes * 60)}
                >
                  <TimerIcon size={16} />
                  {minutes} {t('common.minutes')}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3>{t('timer.custom')}</h3>
            <p className="panel-note">{t('timer.customHint')}</p>
            <form className="timer-custom" onSubmit={applyCustom}>
              <div className="field">
                <label>{t('timer.minutes')}</label>
                <input type="number" min="0" max="180" value={minutesInput} onChange={(event) => setMinutesInput(event.target.value)} />
              </div>
              <div className="field">
                <label>{t('timer.seconds')}</label>
                <input type="number" min="0" max="59" value={secondsInput} onChange={(event) => setSecondsInput(event.target.value)} />
              </div>
              <button type="submit" className="btn btn-outline btn-block">{t('timer.setTime')}</button>
            </form>
          </section>

          <section className="panel timer-ideas">
            <span className="section-icon"><Coffee size={18} /></span>
            <div>
              <h3>{t('timer.focusMode')}</h3>
              <p>{t('app.tagline')}</p>
            </div>
            <span className="section-icon"><Utensils size={18} /></span>
          </section>
        </aside>
      </div>
    </div>
  )
}
