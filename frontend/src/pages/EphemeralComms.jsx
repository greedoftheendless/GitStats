import { useState, useCallback } from 'react'
import AuthScreen from '../components/AuthScreen.jsx'
import ChatScreen from '../components/ChatScreen.jsx'
import RoomSidebar from '../components/RoomSidebar.jsx'
import { Bell, X, Zap, Check, Trash2 } from 'lucide-react'

export default function EphemeralComms() {
    const [rooms, setRooms] = useState([]) // Array of { id, username, password }
    const [activeRoomId, setActiveRoomId] = useState(null)
    const [showAuth, setShowAuth] = useState(true)

    // Global Notification states
    const [notifications, setNotifications] = useState([]) // Array of { id, type, data, timestamp, read }
    const [showNotifications, setShowNotifications] = useState(false)
    const [rejectionForm, setRejectionForm] = useState(null) // { targetId, declinerName, targetSocket, notificationId }

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
            password: data.password
        }

        setRooms([...rooms, newRoom])
        setActiveRoomId(sessionId)
        setShowAuth(false)
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

    // Notification Handlers
    const addNotification = (type, data) => {
        const newNotif = {
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
            type,
            data,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false
        }
        setNotifications(prev => [newNotif, ...prev])
    }

    const handleAcceptInvite = (notif) => {
        const { sessionId, password } = notif.data
        const username = rooms.length > 0 ? rooms[0].username : 'User'
        handleJoinOrCreate({ sessionId, username, password })
        removeNotification(notif.id)
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

    const unreadCount = notifications.filter(n => !n.read).length

    const activeRoom = rooms.find(r => r.id === activeRoomId)

    return (
        <div className="h-screen bg-slate-950 flex overflow-hidden font-sans">
            {rooms.length > 0 && (
                <RoomSidebar
                    rooms={rooms}
                    activeRoomId={activeRoomId}
                    onSwitchRoom={(id) => {
                        setActiveRoomId(id)
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
                        Select or create a room to start chatting
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
                            onLogout={handleLogout}
                            onJoinRoom={(data) => handleJoinOrCreate(data, false)}
                            onReceiveInvite={(data) => addNotification('invite', data)}
                            onReceiveRejection={(data) => addNotification('rejection', data)}
                            notificationCount={unreadCount}
                            onToggleNotifications={() => setShowNotifications(!showNotifications)}
                        />
                    </div>
                ))}

                {/* Notifications Sidebar/Drawer */}
                {showNotifications && (
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-800 border-l border-slate-700 shadow-2xl z-40 animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-white font-bold uppercase tracking-wider text-sm">Notifications</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={clearAllNotifications} className="p-1.5 text-slate-500 hover:text-red-400 transition" title="Clear All">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setShowNotifications(false)} className="p-1.5 text-slate-500 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
                                    <Bell className="w-12 h-12 mb-2 stroke-[1]" />
                                    <p className="text-xs font-medium uppercase tracking-widest text-center px-8">No active communications found in the stream.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n.id} className={`p-4 rounded-xl border transition-all duration-300 ${n.type === 'invite' ? 'bg-cyan-500/5 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]' : 'bg-red-500/5 border-red-500/20'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${n.type === 'invite' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {n.type === 'invite' ? 'Join Request' : 'Rejection'}
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-mono italic">{n.timestamp}</span>
                                        </div>

                                        {n.type === 'invite' ? (
                                            <div className="space-y-3">
                                                <p className="text-sm text-slate-200 leading-tight">
                                                    <span className="text-cyan-400 font-bold">{n.data.inviterName}</span> is inviting you to a private session.
                                                </p>
                                                {n.data.message && (
                                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                                                        <p className="text-xs text-slate-400 italic break-words">"{n.data.message}"</p>
                                                    </div>
                                                )}
                                                <div className="flex gap-2 pt-1">
                                                    <button onClick={() => handleDeclineInvite(n)} className="flex-1 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition">Decline</button>
                                                    <button onClick={() => handleAcceptInvite(n)} className="flex-1 py-1.5 rounded-lg bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-600 transition shadow-lg shadow-cyan-400/10">Accept</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="text-sm text-slate-200">
                                                    <span className="text-red-400 font-bold">{n.data.declinerName}</span> declined your invite.
                                                </p>
                                                {n.data.message && (
                                                    <p className="text-xs text-slate-500 italic font-mono">"{n.data.message}"</p>
                                                )}
                                                <button onClick={() => removeNotification(n.id)} className="w-full mt-2 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition uppercase tracking-widest font-bold">Dismiss</button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 bg-slate-900/50 border-t border-slate-700/50">
                            <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] text-center font-bold">Encrypted Session Queue</p>
                        </div>
                    </div>
                )}

                {/* Rejection Form Modal */}
                {rejectionForm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 text-center">
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                <X className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Send Message?</h3>
                            <p className="text-slate-400 text-sm mb-4">Tell <span className="text-cyan-400 font-semibold">{rejectionForm.declinerName}</span> why you declined:</p>
                            <textarea
                                value={rejectionForm.message}
                                onChange={(e) => setRejectionForm({ ...rejectionForm, message: e.target.value })}
                                placeholder="e.g., In a meeting, talk later!"
                                className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition mb-4 resize-none"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button onClick={() => { removeNotification(rejectionForm.notificationId); setRejectionForm(null); }} className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition">Cancel</button>
                                <button onClick={submitRejection} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition">Send Msg</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
