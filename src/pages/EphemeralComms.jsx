import { useState, useCallback, useEffect } from 'react'
import AuthScreen from '../components/AuthScreen.jsx'
import ChatScreen from '../components/ChatScreen.jsx'
import RoomSidebar from '../components/RoomSidebar.jsx'
import { Bell, X, Zap, Check, Trash2, Settings2, ShieldCheck, Info } from 'lucide-react'

export default function EphemeralComms() {
    const [rooms, setRooms] = useState([]) // Array of { id, username, password }
    const [activeRoomId, setActiveRoomId] = useState(null)
    const [showAuth, setShowAuth] = useState(true)

    // Global Notification states
    const [notifications, setNotifications] = useState([]) // Array of { id, type, data, timestamp, read }
    const [showNotifications, setShowNotifications] = useState(false)
    const [rejectionForm, setRejectionForm] = useState(null) // { targetId, declinerName, targetSocket, notificationId }

    // Toast states (Pop-outs)
    const [toasts, setToasts] = useState([]) // Array of { id, type, title, message, timestamp }

    // Notification & Activity states
    const [roomActivity, setRoomActivity] = useState({}) // { roomId: { unread: 0, hasPing: false } }
    const [notifSettings, setNotifSettings] = useState({ mentionsOnly: true, mentionScope: 'all', notifVolume: 0.5 }) // volume: 0.0 to 1.0
    const [showSettings, setShowSettings] = useState(false)

    // Derived states
    const unreadCount = notifications.filter(n => !n.read).length
    const activeRoom = rooms.find(r => r.id === activeRoomId)

    const handleJoinOrCreate = (data, isNew = false) => {
        const sessionId = isNew
            ? Math.random().toString(36).substring(2, 10).toUpperCase()
            : data.sessionId

        // Prevent duplicates
        if (rooms.find(r => r.id === sessionId)) {
            setActiveRoomId(sessionId)
            setShowAuth(false)
            return
        }

        const newRoom = {
            id: sessionId,
            username: data.username,
            password: data.password,
            alias: data.alias || `Room ${rooms.length + 1}`,
            avatar: data.avatar || null
        }

        setRooms([...rooms, newRoom])
        setActiveRoomId(sessionId)
        setRoomActivity(prev => ({ ...prev, [sessionId]: { unread: 0, hasPing: false } }))
        setShowAuth(false)
    }

    const handleUpdateAlias = (id, newAlias) => {
        setRooms(prev => prev.map(r => r.id === id ? { ...r, alias: newAlias } : r))
    }

    const handleLeaveRoom = (id) => {
        const newRooms = rooms.filter(r => r.id !== id)
        setRooms(newRooms)
        if (activeRoomId === id) {
            setActiveRoomId(newRooms.length > 0 ? newRooms[0].id : null)
            if (newRooms.length === 0) setShowAuth(true)
        }
    }

    const handleLogout = () => {
        setRooms([])
        setActiveRoomId(null)
        setShowAuth(true)
    }

    // Notification & Toast Handlers
    const playSound = useCallback(() => {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)()
            const osc = context.createOscillator()
            const gain = context.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(880, context.currentTime) // A5

            const volume = notifSettings.notifVolume ?? 0.5
            gain.gain.setValueAtTime(volume * 0.2, context.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5)

            osc.connect(gain)
            gain.connect(context.destination)
            osc.start()
            osc.stop(context.currentTime + 0.5)
        } catch (e) { console.warn('Audio play blocked or failed', e) }
    }, [notifSettings.notifVolume])

    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission()
        }
    }

    const showBrowserNotification = (title, message) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message, icon: '/favicon.ico' })
        }
    }

    const addNotification = (type, data) => {
        const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5)
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        const newNotif = {
            id,
            type,
            data,
            timestamp,
            read: false
        }
        setNotifications(prev => [newNotif, ...prev])

        // Add to Toasts (Pop-outs)
        let toastTitle = "New Alert"
        let toastMsg = ""

        if (type === 'invite') {
            toastTitle = "Room Invitation"
            toastMsg = `${data.inviterName} is inviting you to a private session.`
        } else if (type === 'rejection') {
            toastTitle = "Invite Declined"
            toastMsg = `${data.declinerName} declined your room invite.`
        } else if (type === 'ping') {
            toastTitle = `Mention in ${data.roomAlias}`
            toastMsg = `${data.sender}: ${data.content}`
        } else if (type === 'message') {
            toastTitle = `Message in ${data.roomAlias}`
            toastMsg = `${data.sender}: ${data.content.slice(0, 30)}${data.content.length > 30 ? '...' : ''}`
        }

        const newToast = {
            id,
            type,
            title: toastTitle,
            message: toastMsg,
            timestamp,
            data // Keep reference if we want to add "Quick buttons" to toast
        }
        setToasts(prev => [newToast, ...prev])

        playSound()
        showBrowserNotification(toastTitle, toastMsg)

        // Auto-remove toast after 8 seconds
        setTimeout(() => {
            removeToast(id)
        }, 8000)
    }

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    const handleAcceptInvite = (notif) => {
        const { sessionId, password } = notif.data
        const username = rooms.length > 0 ? rooms[0].username : 'User'
        handleJoinOrCreate({ sessionId, username, password })
        removeNotification(notif.id)
        removeToast(notif.id)
    }

    const handleDeclineInvite = (notif) => {
        const username = rooms.length > 0 ? rooms[0].username : 'User'
        setRejectionForm({
            targetId: notif.data.inviterId,
            declinerName: username,
            message: '',
            targetSocket: notif.data.targetSocket,
            notificationId: notif.id
        })
        removeToast(notif.id)
    }

    const submitRejection = () => {
        if (!rejectionForm || !rejectionForm.targetSocket) return
        rejectionForm.targetSocket.emit('invite-rejected', {
            targetId: rejectionForm.targetId,
            message: rejectionForm.message || 'Declined the invitation',
            declinerName: rejectionForm.declinerName
        })
        removeNotification(rejectionForm.notificationId)
        setRejectionForm(null)
    }

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const clearAllNotifications = () => {
        setNotifications([])
    }

    // Tab Title Flashing
    useEffect(() => {
        if (unreadCount === 0) {
            document.title = 'Ephemeral Comms'
            return
        }

        let isOriginal = true
        const interval = setInterval(() => {
            document.title = isOriginal ? `(${unreadCount}) New Alert!` : 'Ephemeral Comms'
            isOriginal = !isOriginal
        }, 1000)

        return () => {
            clearInterval(interval)
            document.title = 'Ephemeral Comms'
        }
    }, [unreadCount])

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const toggleNotifications = () => {
        requestNotificationPermission() // Request on user gesture
        if (!showNotifications) {
            markAllRead()
            setShowSettings(false)
        }
        setShowNotifications(!showNotifications)
    }

    const handleNewMessage = (roomId, msg) => {
        if (msg.isSystem || msg.isYou) return

        const isMentioned = msg.content.toLowerCase().includes(`@${rooms.find(r => r.id === roomId)?.username.toLowerCase()}`)

        if (roomId !== activeRoomId) {
            setRoomActivity(prev => {
                const current = prev[roomId] || { unread: 0, hasPing: false }
                return {
                    ...prev,
                    [roomId]: {
                        unread: current.unread + 1,
                        hasPing: current.hasPing || isMentioned
                    }
                }
            })

            // Only add global notification (sound/toast) if it's a mention and setting allows
            if (isMentioned && notifSettings.mentionsOnly) {
                // If scope is 'inactive', and we ARE in this room, don't notify
                if (notifSettings.mentionScope === 'inactive' && roomId === activeRoomId) return

                addNotification('ping', {
                    ...msg,
                    roomId,
                    roomAlias: rooms.find(r => r.id === roomId)?.alias || roomId
                })
            }
        } else if (isMentioned && notifSettings.mentionsOnly && notifSettings.mentionScope === 'all') {
            // Mentioned in active room, but setting says 'all' -> notify
            addNotification('ping', { ...msg, roomId, roomAlias: 'This Room' })
        }
    }

    return (
        <div className="h-screen bg-slate-950 flex overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            {rooms.length > 0 && (
                <RoomSidebar
                    rooms={rooms}
                    activeRoomId={activeRoomId}
                    onSwitchRoom={(id) => {
                        setActiveRoomId(id)
                        setRoomActivity(prev => ({ ...prev, [id]: { unread: 0, hasPing: false } }))
                        setShowAuth(false)
                    }}
                    onLeaveRoom={handleLeaveRoom}
                    onAddRoom={() => setShowAuth(true)}
                />
            )}

            <div className="flex-1 flex flex-col relative">
                {showAuth && (
                    <div className="absolute inset-0 z-50">
                        <AuthScreen
                            onJoin={(data) => handleJoinOrCreate(data, false)}
                            onCreate={(data) => handleJoinOrCreate(data, true)}
                            onCancel={rooms.length > 0 ? () => setShowAuth(false) : null}
                        />
                    </div>
                )}

                {rooms.length === 0 && !showAuth && (
                    <div className="flex-1 bg-slate-900 flex items-center justify-center text-slate-500">
                        <div className="text-center space-y-4 max-w-xs animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto border border-slate-700 shadow-xl">
                                <ShieldCheck className="w-8 h-8 text-cyan-500" />
                            </div>
                            <p className="text-sm font-bold uppercase tracking-[0.2em]">Ready for Transmission</p>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium capitalize">Select or create a secure session to begin your encrypted communications.</p>
                            <button onClick={() => setShowAuth(true)} className="px-6 py-2 bg-cyan-500 text-white rounded-lg text-xs font-bold hover:bg-cyan-600 transition tracking-widest uppercase">Initiate Session</button>
                        </div>
                    </div>
                )}

                {rooms.map((room) => (
                    <div
                        key={room.id}
                        className={`flex-1 flex flex-col ${activeRoomId === room.id ? 'block' : 'hidden'}`}
                    >
                        <ChatScreen
                            sessionId={room.id}
                            username={room.username}
                            password={room.password}
                            alias={room.alias}
                            onUpdateAlias={(newAlias) => handleUpdateAlias(room.id, newAlias)}
                            onLogout={() => handleLeaveRoom(room.id)}
                            onJoinRoom={(data) => handleJoinOrCreate(data, false)}
                            onReceiveInvite={(data) => addNotification('invite', data)}
                            onReceiveRejection={(data) => addNotification('rejection', data)}
                            notificationCount={unreadCount}
                            onToggleNotifications={toggleNotifications}
                            onNewMessage={(msg) => handleNewMessage(room.id, msg)}
                            avatar={room.avatar}
                        />
                    </div>
                ))}

                {/* Real-time Toasts (Pop-outs) */}
                <div className="absolute top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
                    {toasts.map((t) => (
                        <div key={t.id} className="pointer-events-auto animate-in slide-in-from-right fade-in duration-300">
                            <div className={`p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-xl flex gap-3 ${t.type === 'invite' ? 'bg-slate-800/90 border-cyan-500/40 shadow-cyan-500/10' :
                                t.type === 'ping' ? 'bg-slate-800/90 border-purple-500/40 shadow-purple-500/10' :
                                    t.type === 'rejection' ? 'bg-slate-800/90 border-red-500/40 shadow-red-500/10' :
                                        'bg-slate-800/90 border-slate-700/80 shadow-slate-900/40'
                                }`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'invite' ? 'bg-cyan-500/10 text-cyan-400' :
                                    t.type === 'ping' ? 'bg-purple-500/10 text-purple-400' :
                                        t.type === 'rejection' ? 'bg-red-500/10 text-red-500' :
                                            'bg-slate-700/30 text-slate-300'
                                    }`}>
                                    {t.type === 'invite' ? <Zap className="w-5 h-5 animate-pulse" /> :
                                        t.type === 'rejection' ? <X className="w-5 h-5" /> :
                                            <Info className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0 pr-6 relative">
                                    <h5 className="text-white font-bold text-sm tracking-tight mb-0.5">{t.title}</h5>
                                    <p className="text-slate-400 text-xs truncate font-medium">{t.message}</p>

                                    {t.type === 'invite' && (
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => removeToast(t.id)} className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-[10px] font-bold hover:bg-slate-700 transition uppercase tracking-widest">Later</button>
                                            <button onClick={() => handleAcceptInvite(t)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] font-black hover:bg-cyan-600 transition tracking-widest uppercase shadow-lg shadow-cyan-500/20">Join</button>
                                        </div>
                                    )}

                                    <button onClick={() => removeToast(t.id)} className="absolute -top-1 -right-1 p-1 text-slate-500 hover:text-white transition group">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Notifications Sidebar/Drawer */}
                {showNotifications && (
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-800/95 backdrop-blur-md border-l border-slate-700 shadow-2xl z-40 animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-white font-bold uppercase tracking-wider text-sm">Communications</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 transition rounded-md ${showSettings ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-white'}`} title="Notification Settings">
                                    <Settings2 className="w-4 h-4" />
                                </button>
                                <button onClick={clearAllNotifications} className="p-1.5 text-slate-500 hover:text-red-400 transition" title="Clear All">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setShowNotifications(false)} className="p-1.5 text-slate-500 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {showSettings && (
                            <div className="p-4 bg-slate-900/50 border-b border-slate-700 animate-in slide-in-from-top duration-200">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 px-1">Alert Preferences</h4>
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={notifSettings.mentionsOnly}
                                                onChange={(e) => setNotifSettings({ ...notifSettings, mentionsOnly: e.target.checked })}
                                                className="peer h-4 w-4 opacity-0 absolute"
                                            />
                                            <div className="h-4 w-4 bg-slate-800 border border-slate-600 rounded peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-all flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition">Enable Mentions (@name)</span>
                                    </label>

                                    {notifSettings.mentionsOnly && (
                                        <div className="pl-7 space-y-2 animate-in slide-in-from-top duration-300">
                                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Mention Scope</p>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => setNotifSettings({ ...notifSettings, mentionScope: 'all' })}
                                                    className={`flex items-center gap-2 text-[10px] font-bold py-1 px-3 rounded-lg transition ${notifSettings.mentionScope === 'all' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${notifSettings.mentionScope === 'all' ? 'bg-purple-400' : 'bg-slate-700'}`} />
                                                    All Rooms (Include active)
                                                </button>
                                                <button
                                                    onClick={() => setNotifSettings({ ...notifSettings, mentionScope: 'inactive' })}
                                                    className={`flex items-center gap-2 text-[10px] font-bold py-1 px-3 rounded-lg transition ${notifSettings.mentionScope === 'inactive' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${notifSettings.mentionScope === 'inactive' ? 'bg-purple-400' : 'bg-slate-700'}`} />
                                                    Inactive Rooms Only
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-slate-700/50 space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Alert Volume</p>
                                            <span className="text-[9px] text-cyan-400 font-mono font-bold">{Math.round(notifSettings.notifVolume * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={notifSettings.notifVolume}
                                            onChange={(e) => setNotifSettings({ ...notifSettings, notifVolume: parseFloat(e.target.value) })}
                                            onMouseUp={playSound} // Test sound on change
                                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-10">
                            {notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-30">
                                    <Bell className="w-16 h-16 mb-2 stroke-[1]" />
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-center px-12 leading-relaxed">System Quiet. No Communications detected.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n.id} className={`p-4 rounded-2xl border-2 transition-all duration-300 ${n.type === 'invite' ? 'bg-cyan-500/5 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]' :
                                        n.type === 'ping' ? 'bg-purple-500/5 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)]' :
                                            'bg-slate-700/10 border-slate-700/30'
                                        }`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${n.type === 'invite' ? 'bg-cyan-500/10 text-cyan-400' :
                                                n.type === 'ping' ? 'bg-purple-500/10 text-purple-400' :
                                                    n.type === 'rejection' ? 'bg-red-500/10 text-red-500' :
                                                        'bg-slate-700/30 text-slate-400'
                                                }`}>
                                                {n.type === 'invite' ? 'Join Request' : n.type === 'ping' ? 'Mention' : n.type === 'message' ? 'New Message' : 'Rejection'}
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-mono italic opacity-50">{n.timestamp}</span>
                                        </div>

                                        {n.type === 'invite' ? (
                                            <div className="space-y-3">
                                                <p className="text-sm text-slate-200 leading-tight">
                                                    <span className="text-cyan-400 font-bold uppercase tracking-tight">{n.data.inviterName}</span> is inviting you to a private session.
                                                </p>
                                                {n.data.message && (
                                                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                                                        <p className="text-xs text-slate-400 italic break-words">"{n.data.message}"</p>
                                                    </div>
                                                )}
                                                <div className="flex gap-2 pt-1">
                                                    <button onClick={() => handleDeclineInvite(n)} className="flex-1 py-2 rounded-xl bg-slate-700/50 text-slate-300 text-[10px] font-bold hover:bg-slate-700 transition tracking-[0.1em] uppercase">Decline</button>
                                                    <button onClick={() => handleAcceptInvite(n)} className="flex-1 py-2 rounded-xl bg-cyan-500 text-white text-[10px] font-black hover:bg-cyan-600 transition shadow-lg shadow-cyan-400/10 tracking-[0.1em] uppercase">Accept</button>
                                                </div>
                                            </div>
                                        ) : n.type === 'ping' || n.type === 'message' ? (
                                            <div className="space-y-2">
                                                <p className="text-sm text-slate-200 leading-tight">
                                                    <span className={n.type === 'ping' ? 'text-purple-400 font-bold' : 'text-slate-100 font-bold'}>{n.data.sender}</span>: {n.data.content}
                                                </p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter bg-slate-800/80 px-2 py-1 rounded-lg italic">in {n.data.roomAlias}</span>
                                                    <button onClick={() => {
                                                        setActiveRoomId(n.data.roomId)
                                                        setRoomActivity(prev => ({ ...prev, [n.data.roomId]: { unread: 0, hasPing: false } }))
                                                        removeNotification(n.id)
                                                    }} className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white text-[10px] font-black uppercase tracking-[0.15em] transition-all">Jump</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="text-sm text-slate-200">
                                                    <span className="text-red-400 font-bold">{n.data.declinerName}</span> declined your invite.
                                                </p>
                                                {n.data.message && (
                                                    <p className="text-xs text-slate-500 italic font-mono bg-slate-900/40 p-2 rounded-lg mt-1 border border-red-500/10">"{n.data.message}"</p>
                                                )}
                                                <button onClick={() => removeNotification(n.id)} className="w-full mt-3 py-2 text-[10px] text-slate-500 hover:text-slate-300 transition uppercase tracking-[0.2em] font-black border border-slate-700/50 rounded-xl hover:bg-slate-700/30">Dismiss Communication</button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 bg-slate-900/50 border-t border-slate-700/50">
                            <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] text-center font-black">Encrypted Session Queue</p>
                        </div>
                    </div>
                )}

                {/* Rejection Form Modal */}
                {rejectionForm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 text-center">
                        <div className="bg-slate-800 border-2 border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-xl">
                                <X className="w-8 h-8 text-red-400" />
                            </div>
                            <h3 className="text-white font-black text-xl mb-2 tracking-tight">Abort invitation?</h3>
                            <p className="text-slate-400 text-sm mb-6 font-medium">Tell <span className="text-cyan-400 font-bold">{rejectionForm.declinerName}</span> why you declined:</p>
                            <textarea
                                value={rejectionForm.message}
                                onChange={(e) => setRejectionForm({ ...rejectionForm, message: e.target.value })}
                                placeholder="e.g., In a meeting, talk later!"
                                className="w-full h-32 bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition mb-6 resize-none shadow-inner"
                                autoFocus
                            />
                            <div className="flex gap-4">
                                <button onClick={() => { removeNotification(rejectionForm.notificationId); setRejectionForm(null); }} className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-600 transition">Cancel</button>
                                <button onClick={submitRejection} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition shadow-lg shadow-red-500/20">Send & Abort</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
