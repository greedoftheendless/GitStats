import { Plus, X } from 'lucide-react'

export default function RoomSidebar({ rooms, activeRoomId, onSwitchRoom, onLeaveRoom, onAddRoom, roomActivity = {}, userAvatar }) {
    return (
        <div className="w-20 bg-slate-950 flex flex-col items-center py-6 gap-6 border-r border-slate-800">
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 no-scrollbar">
                {rooms.map((room) => {
                    const activity = roomActivity[room.id] || { unread: 0, hasPing: false }
                    return (
                        <div key={room.id} className="relative group">
                            <button
                                onClick={() => onSwitchRoom(room.id)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative ${activeRoomId === room.id
                                    ? 'bg-cyan-500 text-white rounded-xl'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white hover:rounded-xl'
                                    }`}
                                title={room.alias || room.id}
                            >
                                <span className="text-xs font-bold">
                                    {(() => {
                                        const text = room.alias || room.id;
                                        const parts = text.split(/[\s_-]+/);
                                        if (parts.length > 1) {
                                            return (parts[0][0] + parts[1][0]).substring(0, 2).toUpperCase();
                                        }
                                        return text.substring(0, 2).toUpperCase();
                                    })()}
                                </span>

                                {activity.unread > 0 && activeRoomId !== room.id && (
                                    <div className={`absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-950 text-[10px] font-bold text-white shadow-lg ${activity.hasPing ? 'bg-purple-500' : 'bg-cyan-500'}`}>
                                        {activity.unread > 9 ? '+' : activity.unread}
                                    </div>
                                )}

                                {activity.hasPing && activeRoomId !== room.id && (
                                    <div className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                )}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onLeaveRoom(room.id)
                                }}
                                className="absolute -top-1 -right-1 bg-slate-900 border border-slate-700 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400 z-10"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )
                })}

                <button
                    onClick={onAddRoom}
                    className="w-12 h-12 rounded-2xl bg-slate-800 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 hover:rounded-xl transition-all border border-slate-700 border-dashed"
                    title="Join another room"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            <div className="mt-auto">
                <div className={`w-10 h-10 rounded-full p-0.5 ${userAvatar?.color || 'bg-gradient-to-br from-cyan-500 to-violet-500'}`}>
                    <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-sm overflow-hidden">
                        {userAvatar?.isImage ? (
                            <img src={userAvatar.icon} alt="You" className="w-full h-full object-cover" />
                        ) : (
                            userAvatar?.icon || '👤'
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
