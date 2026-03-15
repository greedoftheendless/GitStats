import { Plus, MessageSquare, X } from 'lucide-react'

export default function RoomSidebar({ rooms, activeRoomId, onSwitchRoom, onLeaveRoom, onAddRoom }) {
    return (
        <div className="w-20 bg-slate-950 flex flex-col items-center py-6 gap-6 border-r border-slate-800">
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 no-scrollbar">
                {rooms.map((room) => (
                    <div key={room.id} className="relative group">
                        <button
                            onClick={() => onSwitchRoom(room.id)}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${activeRoomId === room.id
                                ? 'bg-cyan-500 text-white rounded-xl'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white hover:rounded-xl'
                                }`}
                            title={room.alias || room.id}
                        >
                            <span className="text-xs font-bold uppercase tracking-widest">
                                {(() => {
                                    const text = room.alias || room.id;
                                    const parts = text.split(/[\s_-]+/);
                                    if (parts.length > 1) {
                                        return (parts[0][0] + parts[1][0]).substring(0, 2);
                                    }
                                    return text.substring(0, 2);
                                })()}
                            </span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onLeaveRoom(room.id)
                            }}
                            className="absolute -top-1 -right-1 bg-slate-900 border border-slate-700 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}

                <button
                    onClick={onAddRoom}
                    className="w-12 h-12 rounded-2xl bg-slate-800 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 hover:rounded-xl transition-all border border-slate-700 border-dashed"
                    title="Join another room"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            <div className="mt-auto">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[10px] text-white font-bold uppercase">
                        {rooms[0]?.username?.substring(0, 2) || '??'}
                    </div>
                </div>
            </div>
        </div>
    )
}
