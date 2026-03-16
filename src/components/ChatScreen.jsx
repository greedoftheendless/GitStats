import { useState, useEffect, useRef } from 'react'
import {
    Send, Paperclip, LogOut, Copy, CheckCircle2,
    Lock, Users, Clock, Zap, FileText, Trash2, Edit2, Check, CheckCheck, X,
    ChevronLeft, ChevronRight, Bell
} from 'lucide-react'
import { io } from 'socket.io-client'

const BACKEND_URL = `http://${window.location.hostname}:3001`

export default function ChatScreen({
    sessionId,
    username,
    password,
    alias,
    onUpdateAlias,
    onLogout,
    onJoinRoom,
    onReceiveInvite,
    onReceiveRejection,
    notificationCount,
    onToggleNotifications,
    onNewMessage,
    pfp // New prop
}) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [onlineUsers, setOnlineUsers] = useState([]) // Array of { id, username, alias, pfp }
    const [socket, setSocket] = useState(null)
    const [status, setStatus] = useState('connecting')
    const [error, setError] = useState(null)
    const [showUsers, setShowUsers] = useState(false)
    const [aliasEdit, setAliasEdit] = useState(alias)
    const [typingUsers, setTypingUsers] = useState([])
    const [files, setFiles] = useState([])
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [copied, setCopied] = useState(false)
    const [connected, setConnected] = useState(false)
    const [joinError, setJoinError] = useState('')

    // Batch 2.2 states (Aliases & Rejections)
    const [isEditingAlias, setIsEditingAlias] = useState(false)
    const [tempAlias, setTempAlias] = useState(alias)

    // Batch 2.1 states
    const [isOnlineListVisible, setIsOnlineListVisible] = useState(true)
    const [inviteForm, setInviteForm] = useState(null) // { targetUser, message }

    // Batch 2 states
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editInput, setEditInput] = useState('')
    const [showClearOptions, setShowClearOptions] = useState(false)
    const [clearRequest, setClearRequest] = useState(null) // { requester }

    // Mention Autocomplete states
    const [mentionSearch, setMentionSearch] = useState('')
    const [showMentionList, setShowMentionList] = useState(false)
    const [mentionIndex, setMentionIndex] = useState(0)
    const mentionRef = useRef(null)


    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const socketRef = useRef(null)
    const chatContainerRef = useRef(null)

    // ── Socket.IO connection ─────────────────────────────────────────
    useEffect(() => {
        const newSocket = io(BACKEND_URL, { transports: ['websocket', 'polling'] })
        socketRef.current = newSocket
        setSocket(newSocket)

        newSocket.on('connect', () => {
            setConnected(true)
            setStatus('connected')
            newSocket.emit('join-session', { sessionId, username, password, alias, pfp })
        })

        newSocket.on('disconnect', () => {
            setConnected(false)
            setStatus('disconnected')
        })

        newSocket.on('join-error', ({ message }) => {
            setJoinError(message)
            setStatus('error')
        })

        newSocket.on('session-joined', ({ success, users, message }) => {
            if (success) {
                setOnlineUsers(users)
                setStatus('connected')
            } else {
                setError(message)
                setStatus('error')
            }
        })

        newSocket.on('user-joined', ({ username: newUser, users }) => {
            setOnlineUsers(users)
            addSystemMessage(`${newUser} joined the session`)
        })

        newSocket.on('user-left', ({ username: leftUser, users }) => {
            setOnlineUsers(users)
            addSystemMessage(`${leftUser} left the session`)
        })

        newSocket.on('message', (msg) => {
            console.log(`[msg-rcv] from ${msg.sender}: ${msg.content}`)
            setMessages((prev) => [...prev, { ...msg, isYou: msg.isYou }])
            if (onNewMessage) onNewMessage(msg)
            if (document.visibilityState === 'visible') {
                newSocket.emit('messages-read', { sessionId, messageIds: [msg.id], reader: username })
            }
        })

        newSocket.on('message-edited', ({ messageId, newContent }) => {
            console.log(`[edit-rcv] ${messageId}: ${newContent}`)
            setMessages((prev) => prev.map(m => m.id === messageId ? { ...m, content: newContent, edited: true } : m))
        })

        newSocket.on('messages-seen', ({ messageIds, reader }) => {
            setMessages((prev) => prev.map(m => messageIds.includes(m.id) ? { ...m, seen: true } : m))
        })

        newSocket.on('typing', ({ username: who, isTyping }) => {
            setTypingUsers((prev) => isTyping ? [...new Set([...prev, who])] : prev.filter((u) => u !== who))
        })

        newSocket.on('file-shared', (file) => {
            console.log(`[file-rcv] ${file.name}`)
            setFiles((prev) => [...prev, file])
        })

        newSocket.on('clear-permission-request', ({ requester }) => {
            console.log(`[clear-perm-req] from ${requester}`)
            setClearRequest({ requester })
        })

        newSocket.on('invite-received', (inviteData) => {
            console.log(`%c[INVITE-RCV] from ${inviteData.inviterName}`, 'background: #06b6d4; color: #fff; padding: 2px 5px; border-radius: 3px;')
            onReceiveInvite({ ...inviteData, targetSocket: socketRef.current })
        })

        newSocket.on('rejection-received', (rejectionData) => {
            console.log(`%c[REJECTION-RCV] from ${rejectionData.declinerName}`, 'background: #ef4444; color: #fff; padding: 2px 5px; border-radius: 3px;')
            onReceiveRejection(rejectionData)
        })

        newSocket.on('chat-cleared', ({ type }) => {
            console.log(`[chat-cleared] type: ${type}`)
            setMessages([])
            setFiles([])
            addSystemMessage(type === 'both' ? 'Chat history cleared by consensus' : 'Local chat history cleared')
            setShowClearOptions(false)
            setClearRequest(null)
        })

        return () => newSocket.disconnect()
    }, [sessionId, username, password, alias, pfp])

    // ── Helpers ──────────────────────────────────────────────────────
    const timestamp = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    const addSystemMessage = (content) => {
        setMessages((prev) => [...prev, { id: 'sys-' + Date.now(), isSystem: true, content, timestamp: timestamp() }])
    }

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    useEffect(() => scrollToBottom(), [messages])

    // ── Actions ──────────────────────────────────────────────────────
    const saveAlias = () => {
        if (!tempAlias.trim()) {
            setTempAlias(alias)
            setIsEditingAlias(false)
            return
        }
        onUpdateAlias(tempAlias)
        setIsEditingAlias(false)
    }

    const handleInviteUser = (targetUser) => {
        if (!socketRef.current || targetUser.isYou) return
        setInviteForm({ targetUser, message: '' })
    }

    const submitInvite = () => {
        if (!inviteForm || !socketRef.current) return

        const privateSessionId = Math.random().toString(36).substring(2, 10).toUpperCase()
        const privatePassword = Math.random().toString(36).substring(2, 8)

        socketRef.current.emit('invite-user', {
            targetId: inviteForm.targetUser.id,
            sessionId: privateSessionId,
            password: privatePassword,
            inviterName: username,
            message: inviteForm.message || 'Hey, join me in a private room!'
        })

        onJoinRoom({ sessionId: privateSessionId, username, password: privatePassword, pfp })
        addSystemMessage(`Sent invite to ${inviteForm.targetUser.alias}`)
        setInviteForm(null)
    }

    const handleSendMessage = (e) => {
        if (e) e.preventDefault()
        if (!input.trim() || !socket) return

        const msg = {
            id: Date.now().toString(),
            sender: alias,
            content: input.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isYou: true,
            pfp // Include user's pfp in message
        }

        socket.emit('message', { sessionId, ...msg })
        setMessages(prev => [...prev, msg])
        setInput('')
        setShowMentionList(false)
    }

    const filteredMentions = onlineUsers.filter(u =>
        u.alias.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        u.username.toLowerCase().includes(mentionSearch.toLowerCase())
    )

    const insertMention = (user) => {
        const words = input.split(' ')
        words[words.length - 1] = `@${user.alias} `
        setInput(words.join(' '))
        setShowMentionList(false)
    }

    const handleInputChange = (e) => {
        const val = e.target.value
        setInput(val)

        // Emit typing status
        if (socketRef.current) {
            socketRef.current.emit('typing', { sessionId, username, isTyping: val.length > 0 })
        }

        // Basic mention detection (last word starts with @)
        const lastWord = val.split(' ').pop()
        if (lastWord.startsWith('@')) {
            setMentionSearch(lastWord.slice(1))
            setShowMentionList(true)
            setMentionIndex(0)
        } else {
            setShowMentionList(false)
        }
    }

    const handleInputKeyDown = (e) => {
        if (showMentionList) {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setMentionIndex(i => (i + 1) % filteredMentions.length)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setMentionIndex(i => (i - 1 + filteredMentions.length) % filteredMentions.length)
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (filteredMentions.length > 0) {
                    e.preventDefault()
                    insertMention(filteredMentions[mentionIndex])
                }
            } else if (e.key === 'Escape') {
                setShowMentionList(false)
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const startEdit = (msg) => {
        setEditingMessageId(msg.id)
        setEditInput(msg.content)
    }

    const saveEdit = () => {
        if (!editInput.trim() || !socketRef.current) return
        socketRef.current.emit('edit-message', { sessionId, messageId: editingMessageId, newContent: editInput })
        setEditingMessageId(null)
    }

    const handleClearRequest = (type) => {
        socketRef.current?.emit('clear-request', { sessionId, type, requester: username })
        setShowClearOptions(false)
    }

    const handleClearResponse = (accepted) => {
        socketRef.current?.emit('clear-response', { sessionId, accepted })
        setClearRequest(null)
    }

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadstart = () => { setSelectedFile(file); setUploadProgress(0) }
        reader.onprogress = (event) => { if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 100) }
        reader.onload = () => {
            const fileData = {
                id: 'file-' + Date.now(),
                name: file.name,
                size: (file.size / 1024 / 1024).toFixed(2),
                uploadedBy: username,
                timestamp: timestamp(),
                data: reader.result // Base64
            }
            socketRef.current?.emit('file-shared', { sessionId, file: fileData })
            setSelectedFile(null)
        }
        reader.readAsDataURL(file)
    }

    const downloadFile = (file) => {
        const link = document.createElement('a')
        link.href = file.data
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const copySessionId = () => {
        navigator.clipboard.writeText(sessionId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (joinError) return (
        <div className="h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-red-500/40 rounded-xl p-8 text-center space-y-4 max-w-sm w-full">
                <p className="text-red-400 font-semibold text-lg">Couldn't join room</p>
                <p className="text-slate-400 text-sm">{joinError}</p>
                <button onClick={onLogout} className="w-full py-2 rounded-lg bg-slate-700 text-white text-sm">Go back</button>
            </div>
        </div>
    )

    return (
        <div className="h-screen bg-slate-900 flex flex-col">
            {/* Header */}
            <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 px-6 py-3 flex items-center justify-between z-20">
                {/* Left: Status & Session ID */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 flex-shrink-0">
                        <Lock className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter leading-none mb-1">{sessionId}</span>
                        <span className="flex items-center gap-1.5 leading-none">
                            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-red-500'}`} />
                            <span className="text-[9px] font-bold text-slate-400 tracking-widest">{connected ? 'SECURE_CHANNEL' : 'OFFLINE'}</span>
                        </span>
                    </div>
                </div>

                {/* Center: Highlighted & Editable Alias */}
                <div className="flex-1 flex justify-center min-w-0 px-4">
                    {isEditingAlias ? (
                        <div className="flex items-center gap-2">
                            <input
                                value={tempAlias}
                                onChange={(e) => setTempAlias(e.target.value)}
                                onBlur={saveAlias}
                                onKeyDown={(e) => e.key === 'Enter' && saveAlias()}
                                className="bg-slate-900 border border-cyan-500/50 rounded px-3 py-1 text-sm text-cyan-50 font-bold focus:outline-none w-full max-w-[200px] text-center"
                                autoFocus
                            />
                            <Check className="w-4 h-4 text-cyan-400 cursor-pointer" onClick={saveAlias} />
                        </div>
                    ) : (
                        <div
                            className="flex items-center gap-2 group cursor-pointer bg-cyan-500/5 px-4 py-1.5 rounded-full border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.05)] hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                            onClick={() => setIsEditingAlias(true)}
                        >
                            <h1 className="text-sm font-black text-cyan-400 truncate font-mono tracking-[0.2em] uppercase shadow-cyan-500/20">{alias}</h1>
                            <Edit2 className="w-3 h-3 text-cyan-400/40 group-hover:text-cyan-400 transition" />
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <button onClick={onToggleNotifications} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-cyan-400 transition relative">
                        <Bell className="w-5 h-5" />
                        {notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                                {notificationCount}
                            </span>
                        )}
                    </button>

                    <button onClick={copySessionId} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition">
                        {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>

                    <div className="relative">
                        <button onClick={() => setShowClearOptions(!showClearOptions)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-red-400 transition">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        {showClearOptions && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-30">
                                <button onClick={() => handleClearRequest('local')} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition">Clear Local</button>
                                <button onClick={() => handleClearRequest('both')} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 transition">Clear for Everyone</button>
                            </div>
                        )}
                    </div>

                    <button onClick={onLogout} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Clear Request Modal */}
            {clearRequest && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-white font-bold text-lg mb-2">Clear History?</h3>
                        <p className="text-slate-400 text-sm mb-6"><span className="text-cyan-400 font-semibold">{clearRequest.requester}</span> wants to clear the chat for everyone. Accept?</p>
                        <div className="flex gap-3">
                            <button onClick={() => handleClearResponse(false)} className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition">Decline</button>
                            <button onClick={() => handleClearResponse(true)} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition">Clear All</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Form Modal */}
            {inviteForm && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-5 h-5 text-cyan-400" />
                            <h3 className="text-white font-bold text-lg">Invite {inviteForm.targetUser.name}</h3>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">Invite them to a new private session. Add a message if you like:</p>
                        <textarea
                            value={inviteForm.message}
                            onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                            placeholder="e.g., Come over here for a second!"
                            className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition mb-6 resize-none"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setInviteForm(null)} className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition">Cancel</button>
                            <button onClick={submitInvite} className="flex-1 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition shadow-lg shadow-cyan-500/20">Send Invite</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden p-4 gap-4 relative">
                <div className="flex-1 flex flex-col min-w-0">
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                        {messages.map((msg) => msg.isSystem ? (
                            <div key={msg.id} className="flex justify-center"><span className="text-[10px] text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full uppercase tracking-tighter">{msg.content}</span></div>
                        ) : (
                            <div key={msg.id} className={`flex ${msg.isYou ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`flex gap-3 max-w-[80%] ${msg.isYou ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* PFP Circle */}
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 border-2 overflow-hidden flex items-center justify-center bg-slate-800 ${msg.isYou ? 'border-cyan-500/30' : 'border-slate-700'}`}>
                                        {msg.pfp ? (
                                            <img src={msg.pfp} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{msg.sender[0]}</span>
                                        )}
                                    </div>

                                    <div className={`space-y-1 ${msg.isYou ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 px-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.isYou ? 'text-cyan-400' : 'text-slate-400'}`}>{msg.sender}</span>
                                            <span className="text-[9px] text-slate-500 font-mono italic opacity-50">{msg.timestamp}</span>
                                        </div>
                                        <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-lg ${msg.isYou
                                            ? 'bg-gradient-to-br from-cyan-600 to-cyan-500 text-white rounded-tr-none border border-cyan-400/20'
                                            : msg.isSystem
                                                ? 'bg-slate-800/50 text-slate-400 italic border border-slate-700/50 rounded-tl-none'
                                                : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none'
                                            }`}>
                                            {editingMessageId === msg.id ? (
                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                    <textarea value={editInput} onChange={(e) => setEditInput(e.target.value)} className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg p-2 text-sm focus:outline-none" autoFocus />
                                                    <div className="flex justify-end gap-2 text-xs">
                                                        <button onClick={() => setEditingMessageId(null)} className="text-slate-400">Cancel</button>
                                                        <button onClick={saveEdit} className="text-cyan-400 font-bold">Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="break-words text-sm leading-relaxed">{msg.content}</p>
                                                    <div className="flex items-center justify-end gap-1.5 mt-1 opacity-50">
                                                        {msg.edited && <span className="text-[10px] italic">(edited)</span>}
                                                        <span className="text-[10px] tabular-nums">{msg.timestamp}</span>
                                                        {msg.isYou && (msg.seen ? <CheckCheck className="w-3 h-3 text-cyan-400" /> : <Check className="w-3 h-3" />)}
                                                    </div>
                                                </>
                                            )}

                                            {msg.isYou && editingMessageId !== msg.id && (
                                                <button onClick={() => startEdit(msg)} className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-cyan-400 transition">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {files.length > 0 && (
                        <div className="mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shared Vault ({files.length})</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                {files.map((file) => (
                                    <button key={file.id} onClick={() => downloadFile(file)} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-500/50 transition group text-left">
                                        <div className="p-2 rounded bg-slate-900 group-hover:bg-cyan-500/10 transition"><FileText className="w-4 h-4 text-cyan-400" /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-200 truncate">{file.name}</p>
                                            <p className="text-[10px] text-slate-500">{file.uploadedBy} • {file.size}MB</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 items-end">
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 transition border border-slate-700"><Paperclip className="w-6 h-6" /></button>
                        <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
                        <div className="flex-1 relative">
                            <div className="relative p-6 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-xl">
                                {/* Mention Autocomplete List */}
                                {showMentionList && filteredMentions.length > 0 && (
                                    <div className="absolute bottom-[calc(100%-8px)] left-6 right-6 bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-200">
                                        <div className="p-2 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">Mention Member</span>
                                            <span className="text-[9px] font-mono text-cyan-500/50 px-2 italic">Tab or Enter to select</span>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto no-scrollbar">
                                            {filteredMentions.map((user, idx) => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => insertMention(user)}
                                                    onMouseEnter={() => setMentionIndex(idx)}
                                                    className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${idx === mentionIndex ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300 hover:bg-slate-700/50'}`}
                                                >
                                                    <div className="w-8 h-8 rounded-full border border-slate-700 overflow-hidden bg-slate-900 flex items-center justify-center flex-shrink-0">
                                                        {user.pfp ? (
                                                            <img src={user.pfp} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-slate-500">{(user.alias || user.username || 'U')[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold font-mono tracking-tight">{user.alias || user.username || 'Member'}</span>
                                                        <span className="text-[9px] opacity-40 uppercase font-black">@{user.username || 'anonymous'}</span>
                                                    </div>
                                                    {idx === mentionIndex && <Zap className="w-3 h-3 ml-auto animate-pulse" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSendMessage} className="relative group">
                                    <textarea
                                        rows="1"
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyDown={handleInputKeyDown}
                                        placeholder={`Message ${aliasEdit}...`}
                                        className="w-full bg-slate-950/80 border-2 border-slate-800 rounded-3xl p-4 pr-32 text-white text-sm focus:outline-none focus:border-cyan-500/30 transition-all min-h-[56px] max-h-40 no-scrollbar shadow-inner group-hover:border-slate-700"
                                    />
                                    <button type="submit" disabled={!input.trim()} className="absolute right-4 bottom-4 p-3 rounded-full bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 transition shadow-lg shadow-cyan-500/10 transform active:scale-95">
                                        <Send className="w-6 h-6" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Toggle Button */}
                <button
                    onClick={() => setIsOnlineListVisible(!isOnlineListVisible)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-l-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition"
                    style={{ transform: `translateY(-50%) translateX(${isOnlineListVisible ? '-256px' : '0'})` }}
                >
                    {isOnlineListVisible ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <div className={`transition-all duration-300 overflow-hidden flex flex-col ${isOnlineListVisible ? 'w-64' : 'w-0 opacity-0'}`}>
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 h-full flex flex-col min-w-[256px]">
                        <div className="flex items-center gap-2 mb-6"><Users className="w-5 h-5 text-cyan-400" /><h2 className="font-bold text-white uppercase tracking-widest text-sm">Online</h2><span className="ml-auto bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold">{onlineUsers.length}</span></div>
                        <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                            {onlineUsers.map((u) => (
                                <div
                                    key={u.id}
                                    onClick={() => !u.isYou && handleInviteUser(u)}
                                    className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700/50 group ${!u.isYou ? 'cursor-pointer' : ''}`}
                                    title={!u.isYou ? `Invite ${u.alias || u.username} to private room` : ''}
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition overflow-hidden">
                                            {u.pfp ? (
                                                <img src={u.pfp} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-slate-500">{(u.alias || u.username || 'M')[0]}</span>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800 group-hover:scale-125 transition"></div>
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition truncate">{u.alias || u.username || 'Member'}</span>
                                            {u.username === username && <span className="text-[8px] bg-cyan-500/10 text-cyan-500 px-1 rounded font-black uppercase tracking-tighter">You</span>}
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter opacity-70 truncate">@{u.username || 'anonymous'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 space-y-4 pt-6 border-t border-slate-700/50">
                            <div className="flex gap-3 text-slate-500"><Clock className="w-4 h-4 flex-shrink-0" /><p className="text-[10px] leading-relaxed uppercase tracking-tight font-medium">Auto-destruction active. Persistence is zero.</p></div>
                            <div className="flex gap-3 text-slate-500"><Lock className="w-4 h-4 flex-shrink-0" /><p className="text-[10px] leading-relaxed uppercase tracking-tight font-medium">Memory-only storage. No logs, no metadata.</p></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
