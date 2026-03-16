/**
 * Ephemeral Comms – Socket.IO Backend
 *
 * Sessions are stored purely in-memory (Map).
 * When the server restarts (or session owner leaves), all data is gone. Fully ephemeral.
 *
 * Events (client → server):
 *   join-session  { sessionId, username, password }
 *   message       { sessionId, sender, content, timestamp }
 *   typing        { sessionId, username, isTyping }
 *   file-shared   { sessionId, file: { id, name, size, uploadedBy, timestamp } }
 *
 * Events (server → client):
 *   session-joined  { users }
 *   join-error      { message }
 *   user-joined     { userId, username, users }
 *   user-left       { username, users }
 *   message         { id, sender, content, timestamp }
 *   typing          { username, isTyping }
 *   file-shared     { id, name, size, uploadedBy, timestamp }
 */

import { createServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import cors from 'cors'

const PORT = 3001

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    maxHttpBufferSize: 50 * 1024 * 1024 // Allow up to 50MB for file transfers
})

// ── In-memory session store ──────────────────────────────────────────────────
// sessions: Map<sessionId, { password: string, users: Map<socketId, { id, username }> }>
const sessions = new Map()

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', activeSessions: sessions.size }))

// ── Socket.IO events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    let currentSessionId = null
    let currentUsername = null

    // ── Join or create a session ────────────────────────────────────────────
    socket.on('join-session', ({ sessionId, username, password, avatar }) => {
        if (!sessionId || !username || !password) {
            socket.emit('join-error', { message: 'Missing session ID, username, or password.' })
            return
        }

        const sid = sessionId.toUpperCase().trim()

        if (sessions.has(sid)) {
            // Session exists – verify password
            const session = sessions.get(sid)
            if (session.password !== password) {
                socket.emit('join-error', { message: 'Wrong password for this session.' })
                return
            }
            // Add user to existing session
            session.users.set(socket.id, { id: socket.id, username, avatar })
        } else {
            // Create new session
            sessions.set(sid, {
                password,
                users: new Map([[socket.id, { id: socket.id, username, avatar }]])
            })
        }

        currentSessionId = sid
        currentUsername = username

        socket.join(sid)

        const users = Array.from(sessions.get(sid).users.values())

        // Confirm to the joining user
        socket.emit('session-joined', { users })

        // Notify others in the room
        socket.to(sid).emit('user-joined', { userId: socket.id, username, users })

        console.log(`[+] ${username} (${socket.id}) joined session ${sid}`)
    })

    // ── Broadcast a chat message ────────────────────────────────────────────
    socket.on('message', ({ sessionId, sender, content, avatar, timestamp }) => {
        if (!sessionId || !sessions.has(sessionId)) return
        const msg = {
            id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            sender,
            content,
            avatar,
            timestamp
        }
        // Broadcast to everyone else in the room (not the sender)
        socket.to(sessionId).emit('message', { ...msg, isYou: false })
        // Confirm back to sender with isYou: true
        socket.emit('message', { ...msg, isYou: true })
    })

    // ── Typing indicator ────────────────────────────────────────────────────
    socket.on('typing', ({ sessionId, username: who, isTyping }) => {
        if (!sessionId) return
        socket.to(sessionId).emit('typing', { username: who, isTyping })
    })

    // ── Message Editing ────────────────────────────────────────────────────
    socket.on('edit-message', ({ sessionId, messageId, newContent }) => {
        if (!sessionId || !sessions.has(sessionId)) return
        io.to(sessionId).emit('message-edited', { messageId, newContent })
    })

    // ── Chat Clear ─────────────────────────────────────────────────────────
    socket.on('clear-request', ({ sessionId, type, requester }) => {
        if (!sessionId || !sessions.has(sessionId)) return
        if (type === 'local') {
            socket.emit('chat-cleared', { type: 'local' })
        } else {
            // Request permission from others
            socket.to(sessionId).emit('clear-permission-request', { requester })
        }
    })

    socket.on('clear-response', ({ sessionId, accepted }) => {
        if (!sessionId || !sessions.has(sessionId)) return
        if (accepted) {
            io.to(sessionId).emit('chat-cleared', { type: 'both' })
        }
    })

    // ── Read Receipts ──────────────────────────────────────────────────────
    socket.on('messages-read', ({ sessionId, messageIds, reader }) => {
        if (!sessionId || !sessions.has(sessionId)) return
        socket.to(sessionId).emit('messages-seen', { messageIds, reader })
    })

    // ── File shared ─────────────────────────────────────────────────────────
    socket.on('file-shared', ({ sessionId, file }) => {
        if (!sessionId || !file) return
        // file now contains 'data' (base64)
        io.to(sessionId).emit('file-shared', file)
    })

    // ── Room Invitations ─────────────────────────────────────────────────────
    socket.on('invite-user', ({ targetId, sessionId, password, inviterName, message }) => {
        console.log(`[invite] ${inviterName} (${socket.id}) -> ${targetId} for room: ${sessionId}`)
        const targetSocket = io.sockets.sockets.get(targetId)
        if (targetSocket) {
            console.log(`[invite] Target socket found. Emitting 'invite-received'.`)
            io.to(targetId).emit('invite-received', {
                sessionId,
                password,
                inviterName,
                message,
                inviterId: socket.id
            })
        } else {
            console.warn(`[invite] Target socket NOT FOUND: ${targetId}`)
        }
    })

    socket.on('invite-rejected', ({ targetId, message, declinerName }) => {
        console.log(`[reject] ${declinerName} (${socket.id}) -> ${targetId}`)
        const targetSocket = io.sockets.sockets.get(targetId)
        if (targetSocket) {
            io.to(targetId).emit('rejection-received', {
                message,
                declinerName
            })
        } else {
            console.warn(`[reject] Target socket NOT FOUND: ${targetId}`)
        }
    })

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        if (!currentSessionId || !sessions.has(currentSessionId)) return

        const session = sessions.get(currentSessionId)
        session.users.delete(socket.id)

        const users = Array.from(session.users.values())
        io.to(currentSessionId).emit('user-left', { username: currentUsername, users })

        console.log(`[-] ${currentUsername} (${socket.id}) left session ${currentSessionId}`)

        // Clean up empty sessions
        if (session.users.size === 0) {
            sessions.delete(currentSessionId)
            console.log(`[x] Session ${currentSessionId} closed (empty)`)
        }
    })
})

// ── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Ephemeral Comms backend running on http://0.0.0.0:${PORT}`)
    console.log(`   Tablet / LAN access: http://<your-local-ip>:${PORT}`)
})
