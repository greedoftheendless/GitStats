import { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  LogOut,
  Copy,
  CheckCircle2,
  Lock,
  Users,
  Clock,
  Zap,
  FileText,
  Trash2,
  Edit2,
  Check,
  CheckCheck,
  X,
  Bell,
} from "lucide-react";

import { io } from "socket.io-client";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;

export default function ChatScreen({
  sessionId,
  username,
  password,
  onLogout,
  onJoinRoom,
  onReceiveInvite,
  onReceiveRejection,
  notificationCount,
  onToggleNotifications,
}) {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([
    { id: "self", name: username, isYou: true },
  ]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Batch 2.1 states (Invites)
  const [inviteForm, setInviteForm] = useState(null); // { targetUser, message }

  // Batch 2 states
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [showClearOptions, setShowClearOptions] = useState(false);
  const [clearRequest, setClearRequest] = useState(null); // { requester }

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const chatContainerRef = useRef(null);

  // ── Socket.IO connection ─────────────────────────────────────────
  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-session", { sessionId, username, password });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("join-error", ({ message }) => setJoinError(message));

    socket.on("session-joined", ({ users }) => {
      setOnlineUsers(
        users.map((u) => ({
          id: u.id,
          name: u.username,
          isYou: u.id === socket.id,
        })),
      );
    });

    socket.on("user-joined", ({ username: newUser, users }) => {
      setOnlineUsers(
        users.map((u) => ({
          id: u.id,
          name: u.username,
          isYou: u.id === socket.id,
        })),
      );
      addSystemMessage(`${newUser} joined the session`);
    });

    socket.on("user-left", ({ username: leftUser, users }) => {
      setOnlineUsers(
        users.map((u) => ({
          id: u.id,
          name: u.username,
          isYou: u.id === socket.id,
        })),
      );
      addSystemMessage(`${leftUser} left the session`);
    });

    socket.on("message", (msg) => {
      setMessages((prev) => [
        ...prev,
        { ...msg, isYou: msg.sender === username && msg.isYou },
      ]);
      if (document.visibilityState === "visible") {
        socket.emit("messages-read", {
          sessionId,
          messageIds: [msg.id],
          reader: username,
        });
      }
    });

    socket.on("message-edited", ({ messageId, newContent }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: newContent, edited: true } : m,
        ),
      );
    });

    socket.on("messages-seen", ({ messageIds, reader }) => {
      setMessages((prev) =>
        prev.map((m) => (messageIds.includes(m.id) ? { ...m, seen: true } : m)),
      );
    });

    socket.on("typing", ({ username: who, isTyping }) => {
      setTypingUsers((prev) =>
        isTyping ? [...new Set([...prev, who])] : prev.filter((u) => u !== who),
      );
    });

    socket.on("file-shared", (file) => setFiles((prev) => [...prev, file]));

    socket.on("clear-permission-request", ({ requester }) =>
      setClearRequest({ requester }),
    );

    socket.on("invite-received", (inviteData) => {
      console.log(
        "%c[INVITE-RCV]",
        "background: #06b6d4; color: white; padding: 2px 5px;",
        inviteData,
      );
      onReceiveInvite({ ...inviteData, targetSocket: socketRef.current });
    });

    socket.on("rejection-received", (rejectionData) => {
      console.log(
        "%c[REJECTION-RCV]",
        "background: #ef4444; color: white; padding: 2px 5px;",
        rejectionData,
      );
      onReceiveRejection(rejectionData);
    });

    socket.on("chat-cleared", ({ type }) => {
      setMessages([]);
      setFiles([]);
      addSystemMessage(
        type === "both"
          ? "Chat was cleared by consensus"
          : "You cleared the chat locally",
      );
      setShowClearOptions(false);
      setClearRequest(null);
    });

    return () => socket.disconnect();
  }, [sessionId, username, password]);

  // ── Helpers ──────────────────────────────────────────────────────
  const timestamp = () =>
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const addSystemMessage = (content) => {
    setMessages((prev) => [
      ...prev,
      {
        id: "sys-" + Date.now(),
        isSystem: true,
        content,
        timestamp: timestamp(),
      },
    ]);
  };

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  // ── Actions ──────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!messageInput.trim() || !socketRef.current) return;
    socketRef.current.emit("message", {
      sessionId,
      content: messageInput,
      sender: username,
      timestamp: timestamp(),
    });
    setMessageInput("");
    socketRef.current.emit("typing", { sessionId, username, isTyping: false });
  };

  const startEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditInput(msg.content);
  };

  const saveEdit = () => {
    if (!editInput.trim() || !socketRef.current) return;
    socketRef.current.emit("edit-message", {
      sessionId,
      messageId: editingMessageId,
      newContent: editInput,
    });
    setEditingMessageId(null);
  };

  const handleClearRequest = (type) => {
    socketRef.current?.emit("clear-request", {
      sessionId,
      type,
      requester: username,
    });
    setShowClearOptions(false);
  };

  const handleClearResponse = (accepted) => {
    socketRef.current?.emit("clear-response", { sessionId, accepted });
    setClearRequest(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadstart = () => {
      setSelectedFile(file);
      setUploadProgress(0);
    };
    reader.onprogress = (event) => {
      if (event.lengthComputable)
        setUploadProgress((event.loaded / event.total) * 100);
    };
    reader.onload = () => {
      const fileData = {
        id: "file-" + Date.now(),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2),
        uploadedBy: username,
        timestamp: timestamp(),
        data: reader.result, // Base64
      };
      socketRef.current?.emit("file-shared", { sessionId, file: fileData });
      setSelectedFile(null);
    };
    reader.readAsDataURL(file);
  };

  const downloadFile = (file) => {
    const link = document.createElement("a");
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteUser = (targetUser) => {
    if (!socketRef.current || targetUser.isYou) return;
    setInviteForm({ targetUser, message: "" });
  };

  const submitInvite = () => {
    if (!inviteForm || !socketRef.current) return;

    const privateSessionId = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    const privatePassword = Math.random().toString(36).substring(2, 8);

    socketRef.current.emit("invite-user", {
      targetId: inviteForm.targetUser.id,
      sessionId: privateSessionId,
      password: privatePassword,
      inviterName: username,
      message: inviteForm.message || "Hey, join me in a private room!",
    });

    onJoinRoom({
      sessionId: privateSessionId,
      username,
      password: privatePassword,
    });
    addSystemMessage(`Sent invite to ${inviteForm.targetUser.name}`);
    setInviteForm(null);
  };

  if (joinError)
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-red-500/40 rounded-xl p-8 text-center space-y-4 max-w-sm w-full">
          <p className="text-red-400 font-semibold text-lg">
            Couldn't join room
          </p>
          <p className="text-slate-400 text-sm">{joinError}</p>
          <button
            onClick={onLogout}
            className="w-full py-2 rounded-lg bg-slate-700 text-white text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    );

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Zap className="w-5 h-5 text-cyan-400" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate font-mono tracking-widest">
              {sessionId}
            </h1>
            <p className="text-xs text-slate-400">
              {onlineUsers.length} online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleNotifications}
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-cyan-400 transition relative"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {notificationCount}
              </span>
            )}
          </button>

          <button
            onClick={copySessionId}
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition"
          >
            {copied ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowClearOptions(!showClearOptions)}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-red-400 transition"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            {showClearOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-30">
                <button
                  onClick={() => handleClearRequest("local")}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition"
                >
                  Clear Local
                </button>
                <button
                  onClick={() => handleClearRequest("both")}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 transition"
                >
                  Clear for Everyone
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Clear Request Modal */}
      {clearRequest && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-white font-bold text-lg mb-2">
              Clear History?
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              <span className="text-cyan-400 font-semibold">
                {clearRequest.requester}
              </span>{" "}
              wants to clear the chat for everyone. Accept?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleClearResponse(false)}
                className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition"
              >
                Decline
              </button>
              <button
                onClick={() => handleClearResponse(true)}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition"
              >
                Clear All
              </button>
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
              <h3 className="text-white font-bold text-lg">
                Invite {inviteForm.targetUser.name}
              </h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Invite them to a new private session. Add a message if you like:
            </p>
            <textarea
              value={inviteForm.message}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, message: e.target.value })
              }
              placeholder="e.g., Come over here for a second!"
              className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition mb-6 resize-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setInviteForm(null)}
                className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitInvite}
                className="flex-1 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition shadow-lg shadow-cyan-500/20"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2"
          >
            {messages.map((msg) =>
              msg.isSystem ? (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-[10px] text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full uppercase tracking-tighter">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div
                  key={msg.id}
                  className={`flex ${msg.isYou ? "justify-end" : "justify-start"} group animate-in fade-in slide-in-from-bottom duration-300`}
                >
                  <div
                    className={`relative max-w-[80%] px-4 py-2 rounded-2xl ${msg.isYou ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-50" : "bg-slate-800 border border-slate-700 text-slate-200"}`}
                  >
                    {!msg.isYou && (
                      <p className="text-[10px] font-bold text-cyan-500 mb-1 uppercase tracking-wide">
                        {msg.sender}
                      </p>
                    )}

                    {editingMessageId === msg.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <textarea
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg p-2 text-sm focus:outline-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="text-slate-400"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEdit}
                            className="text-cyan-400 font-bold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="break-words text-sm leading-relaxed">
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1 opacity-50">
                          {msg.edited && (
                            <span className="text-[10px] italic">(edited)</span>
                          )}
                          <span className="text-[10px] tabular-nums">
                            {msg.timestamp}
                          </span>
                          {msg.isYou &&
                            (msg.seen ? (
                              <CheckCheck className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <Check className="w-3 h-3" />
                            ))}
                        </div>
                      </>
                    )}

                    {msg.isYou && editingMessageId !== msg.id && (
                      <button
                        onClick={() => startEdit(msg)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-cyan-400 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={messagesEndRef} />
          </div>

          {files.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Shared Vault ({files.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => downloadFile(file)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-500/50 transition group text-left"
                  >
                    <div className="p-2 rounded bg-slate-900 group-hover:bg-cyan-500/10 transition">
                      <FileText className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {file.uploadedBy} • {file.size}MB
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 transition border border-slate-700"
            >
              <Paperclip className="w-6 h-6" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex-1 relative">
              <textarea
                rows="1"
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  socketRef.current?.emit("typing", {
                    sessionId,
                    username,
                    isTyping: e.target.value.length > 0,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Message..."
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition resize-none"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!messageInput.trim()}
              className="p-3 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 transition shadow-lg shadow-cyan-500/10 transform active:scale-95"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="w-64 hidden xl:block">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-white uppercase tracking-widest text-sm">
                Online
              </h2>
              <span className="ml-auto bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold">
                {onlineUsers.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
              {onlineUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => !u.isYou && handleInviteUser(u)}
                  className={`flex items-center gap-3 p-2 rounded-lg transition ${!u.isYou ? "cursor-pointer hover:bg-slate-700/50" : ""}`}
                  title={!u.isYou ? `Invite ${u.name} to private room` : ""}
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] animate-pulse" />
                  <p className="text-sm font-medium text-slate-300 truncate font-mono tracking-tight">
                    {u.name}
                    {u.isYou && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        (You)
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 space-y-4 pt-6 border-t border-slate-700/50">
              <div className="flex gap-3 text-slate-500">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <p className="text-[10px] leading-relaxed uppercase tracking-tight font-medium">
                  Auto-destruction active. Persistence is zero.
                </p>
              </div>
              <div className="flex gap-3 text-slate-500">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <p className="text-[10px] leading-relaxed uppercase tracking-tight font-medium">
                  Memory-only storage. No logs, no metadata.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
