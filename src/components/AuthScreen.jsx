import { useState } from 'react'
import { Zap, Eye, EyeOff } from 'lucide-react'

export default function AuthScreen({ onJoin, onCreate, onCancel, initialIdentity }) {
    const [mode, setMode] = useState('join') // 'join' or 'create'
    const [sessionId, setSessionId] = useState('')
    const [username, setUsername] = useState(initialIdentity?.username || '')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const [avatar, setAvatar] = useState(initialIdentity?.avatar || { color: 'bg-cyan-500', icon: '👤' })

    const AVATARS = [
        { color: 'bg-cyan-500', icon: '👤' },
        { color: 'bg-black-500', icon: '💀' },
        { color: 'bg-violet-500', icon: '👻' },
        { color: 'bg-emerald-500', icon: '🐲' },
        { color: 'bg-rose-500', icon: '🦊' },
        { color: 'bg-amber-500', icon: '🐯' },
        { color: 'bg-indigo-500', icon: '👾' },
        { color: 'bg-orange-500', icon: '🤖' },
        { color: 'bg-red-400', icon: '👽' },
    ]

    const handleCustomUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            setAvatar({ color: 'bg-slate-700', icon: reader.result, isImage: true })
        }
        reader.readAsDataURL(file)
    }

    const handleJoin = () => {
        if (!sessionId.trim() || sessionId.length !== 8) {
            setErrorMessage('Session ID must be exactly 8 characters')
            return
        }
        if (!username.trim()) {
            setErrorMessage('Username required')
            return
        }
        if (!password.trim()) {
            setErrorMessage('Password required')
            return
        }
        onJoin({ sessionId, username, password, avatar })
        setErrorMessage('')
    }

    const handleCreate = () => {
        if (!username.trim()) {
            setErrorMessage('Username required')
            return
        }
        if (!password.trim() || password.length < 4) {
            setErrorMessage('Password must be at least 4 characters')
            return
        }
        onCreate({ username, password, avatar })
        setErrorMessage('')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Animated background glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" />
                <div className="absolute bottom-20 right-10 w-72 h-72 bg-violet-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-500">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Zap className="w-8 h-8 text-cyan-400" />
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                            Ephemeral
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm font-light tracking-wide">
                        Temporary. Secure. Gone Forever.
                    </p>
                </div>

                {/* Avatar Selection */}
                <div className="mb-6 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 px-1">Select Identity</label>
                    <div className="grid grid-cols-5 gap-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        {AVATARS.map((a, i) => (
                            <button
                                key={i}
                                onClick={() => setAvatar(a)}
                                className={`h-10 w-full rounded-lg flex items-center justify-center text-xl transition-all duration-300 transform ${avatar.icon === a.icon
                                    ? `ring-2 ring-white scale-110 shadow-lg ${a.color}`
                                    : `hover:scale-105 opacity-40 hover:opacity-100 ${a.color}`}`}
                            >
                                {a.icon}
                            </button>
                        ))}

                        {/* Custom Upload Button */}
                        <div className="relative">
                            <input
                                type="file"
                                id="avatar-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleCustomUpload}
                            />
                            <label
                                htmlFor="avatar-upload"
                                className={`h-10 w-full rounded-lg flex items-center justify-center text-xl cursor-pointer transition-all duration-300 transform bg-slate-700 border-2 border-dashed border-slate-600 hover:border-cyan-500/50 ${avatar.isImage ? 'ring-2 ring-white scale-110 shadow-lg !bg-cyan-500/20 !border-cyan-500' : 'opacity-40 hover:opacity-100'}`}
                            >
                                {avatar.isImage ? (
                                    <img src={avatar.icon} alt="Custom" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <span className="text-cyan-400 font-bold">+</span>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => { setMode('join'); setErrorMessage('') }}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${mode === 'join'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        Join Session
                    </button>
                    <button
                        onClick={() => { setMode('create'); setErrorMessage('') }}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${mode === 'create'
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        Create New
                    </button>
                </div>

                {/* Join form */}
                {mode === 'join' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div>
                            <label className="block text-sm text-slate-300 mb-2 font-medium">Session ID</label>
                            <input
                                type="text"
                                value={sessionId}
                                onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                                placeholder="e.g., ABC12345"
                                maxLength="8"
                                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition text-center tracking-widest font-mono text-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-2 font-medium">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Your name"
                                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-2 font-medium">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Session password"
                                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition"
                                />
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {errorMessage}
                            </div>
                        )}

                        <div className="flex gap-3">
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-3 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-all transform hover:scale-105 active:scale-95"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleJoin}
                                className={`${onCancel ? 'flex-1' : 'w-full'} px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold hover:from-cyan-600 hover:to-cyan-700 transition-all transform hover:scale-105 active:scale-95`}
                            >
                                Join Session
                            </button>
                        </div>
                    </div>
                )}

                {/* Create form */}
                {mode === 'create' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div>
                            <label className="block text-sm text-slate-300 mb-2 font-medium">Your Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="How should others see you?"
                                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-2 font-medium">Session Password</label>
                            <p className="text-xs text-slate-500 mb-2">Others will need this to join</p>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min 4 characters"
                                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                                />
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {errorMessage}
                            </div>
                        )}

                        <div className="flex gap-3">
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-3 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-all transform hover:scale-105 active:scale-95"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleCreate}
                                className={`${onCancel ? 'flex-1' : 'w-full'} px-4 py-3 rounded-lg bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold hover:from-violet-600 hover:to-violet-700 transition-all transform hover:scale-105 active:scale-95`}
                            >
                                Create Session
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-slate-700">
                    <p className="text-slate-500 text-center text-xs">
                        💡{' '}
                        {mode === 'join'
                            ? "Don't have a session ID? Switch to 'Create New' to start one."
                            : 'Share your session ID with others so they can join.'}
                    </p>
                </div>
            </div>
        </div>
    )
}
