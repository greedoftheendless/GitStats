import { useState } from 'react'
import AuthScreen from '../components/AuthScreen'
import ChatScreen from '../components/ChatScreen'

export default function EphemeralComms() {
  const [sessionState, setSessionState] = useState('auth') // 'auth' or 'chat'
  const [session, setSession] = useState({
    id: '',
    username: '',
    password: ''
  })

  const handleJoinSession = (data) => {
    setSession({
      id: data.sessionId,
      username: data.username,
      password: data.password
    })
    setSessionState('chat')
  }

  const handleCreateSession = (data) => {
    // Generate a random 8-character session ID
    const newSessionId = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()

    setSession({
      id: newSessionId,
      username: data.username,
      password: data.password
    })
    setSessionState('chat')
  }

  const handleLogout = () => {
    setSession({
      id: '',
      username: '',
      password: ''
    })
    setSessionState('auth')
  }

  return (
    <>
      {sessionState === 'auth' ? (
        <AuthScreen
          onJoin={handleJoinSession}
          onCreate={handleCreateSession}
        />
      ) : (
        <ChatScreen
          sessionId={session.id}
          username={session.username}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}
