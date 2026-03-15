import { useState, useCallback } from 'react'
import AuthScreen from '../components/AuthScreen.jsx'
import ChatScreen from '../components/ChatScreen.jsx'
import RoomSidebar from '../components/RoomSidebar.jsx'

export default function EphemeralComms() {
    const [rooms, setRooms] = useState([]) // Array of { id, username, password }
    const [activeRoomId, setActiveRoomId] = useState(null)
    const [showAuth, setShowAuth] = useState(true)

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
            alias: data.alias || `Room ${rooms.length + 1}`
        }

        setRooms([...rooms, newRoom])
        setActiveRoomId(sessionId)
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

    const activeRoom = rooms.find(r => r.id === activeRoomId)

    return (
        <div className="h-screen bg-slate-950 flex overflow-hidden">
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
                            alias={room.alias}
                            onUpdateAlias={(newAlias) => handleUpdateAlias(room.id, newAlias)}
                            onLogout={() => handleLeaveRoom(room.id)}
                            onJoinRoom={(data) => handleJoinOrCreate(data, false)}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
