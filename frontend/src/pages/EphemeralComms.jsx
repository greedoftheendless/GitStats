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
                {showAuth ? (
                    <AuthScreen
                        onJoin={(data) => handleJoinOrCreate(data, false)}
                        onCreate={(data) => handleJoinOrCreate(data, true)}
                        onCancel={rooms.length > 0 ? () => setShowAuth(false) : null}
                    />
                ) : activeRoom ? (
                    <ChatScreen
                        key={activeRoom.id} // Re-mount ChatScreen per room for clean socket isolation
                        sessionId={activeRoom.id}
                        username={activeRoom.username}
                        password={activeRoom.password}
                        onLogout={handleLogout}
                    />
                ) : (
                    <div className="flex-1 bg-slate-900 flex items-center justify-center text-slate-500">
                        Select or create a room to start chatting
                    </div>
                )}
            </div>
        </div>
    )
}
