import { useState, useEffect, useRef } from 'react'
import {
  Send, Paperclip, LogOut, Copy, CheckCircle2,
  Lock, Users, Clock, Zap, FileText, MessageCircle
} from 'lucide-react'

export default function ChatScreen({ sessionId, username, onLogout }) {
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [onlineUsers, setOnlineUsers] = useState([
    { id: 'user-1', name: username, isYou: true }
  ])
  const [typingUsers, setTypingUsers] = useState([])
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [copied, setCopied] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Send message
  const sendMessage = () => {
    if (!messageInput.trim()) return

    const newMessage = {
      id: 'msg-' + Date.now(),
      sender: username,
      content: messageInput,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      isYou: true
    }

    setMessages([...messages, newMessage])
    setMessageInput('')
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      alert('File must be under 50MB')
      return
    }

    setSelectedFile(file)
    setUploadProgress(0)

    // Simulate upload
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          const newFile = {
            id: 'file-' + Date.now(),
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2),
            uploadedBy: username,
            timestamp: new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          }
          setFiles([...files, newFile])
          setSelectedFile(null)
          return 100
        }
        return prev + Math.random() * 30
      })
    }, 300)
  }

  // Simulate typing indicator
  const handleMessageInputChange = (e) => {
    setMessageInput(e.target.value)

    clearTimeout(typingTimeoutRef.current)
    if (!typingUsers.includes(username)) {
      setTypingUsers([...typingUsers, username])
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTypingUsers((prev) => prev.filter((u) => u !== username))
    }, 3000)
  }

  // Copy session ID
  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">
                {sessionId}
              </h1>
              <p className="text-xs text-slate-400">
                {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} online
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={copySessionId}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition text-sm"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Copy ID</span>
              </>
            )}
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <MessageCircleIcon className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isYou ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom duration-300`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.isYou
                        ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-50'
                        : 'bg-slate-700 text-slate-100'
                    }`}
                  >
                    {!msg.isYou && (
                      <p className="text-xs font-semibold text-slate-400 mb-1">
                        {msg.sender}
                      </p>
                    )}
                    <p className="break-words">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* File uploads display */}
          {files.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Shared Files ({files.length})
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 p-2 rounded bg-slate-700/50 text-slate-200 text-sm hover:bg-slate-700 transition"
                  >
                    <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="text-xs text-slate-400">
                        {file.uploadedBy} • {file.size}MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
            <input
              type="text"
              value={messageInput}
              onChange={handleMessageInputChange}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition"
            />
            <button
              onClick={sendMessage}
              disabled={!messageInput.trim()}
              className="flex-shrink-0 p-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white transition transform hover:scale-105 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Upload progress */}
          {selectedFile && uploadProgress < 100 && (
            <div className="mt-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-200 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">{Math.round(uploadProgress)}%</p>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Online users */}
        <div className="w-64 flex-shrink-0 hidden lg:flex flex-col">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-white">Online</h2>
              <span className="ml-auto px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                {onlineUsers.length}
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {onlineUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/50 transition"
                >
                  <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0 animate-pulse"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {user.name}
                      {user.isYou && <span className="text-xs text-slate-400 ml-1">(you)</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Messages auto-delete when session ends</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>All data stays in memory—nothing is logged</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageCircleIcon(props) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}
