import { Plus, MessageSquare, X } from 'lucide-react'

export default function RoomSidebar({ rooms, activeRoomId, onSwitchRoom, onLeaveRoom, onAddRoom, roomActivity = {} }) {
    return (
        <div className="w-20 bg-slate-950 flex flex-col items-center py-6 gap-6 border-r border-slate-800">
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 no-scrollbar">
            </button>
        </div>
    ))
}

<button
    onClick={onAddRoom}
    className="w-12 h-12 rounded-2xl bg-slate-800 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 hover:rounded-xl transition-all border border-slate-700 border-dashed"
    title="Join another room"
>
    <Plus className="w-6 h-6" />
</button>
            </div >

    <div className="mt-auto">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 p-0.5">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[10px] text-white font-bold uppercase">
                {rooms[0]?.username?.substring(0, 2) || '??'}
            </div>
        </div>
    </div>
        </div >
    )
}
