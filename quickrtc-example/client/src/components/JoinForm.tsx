interface JoinFormProps {
  name: string;
  roomId: string;
  error: string | null;
  onNameChange: (name: string) => void;
  onRoomIdChange: (roomId: string) => void;
  onJoin: () => void;
}

/**
 * JoinForm component displays the conference join form.
 * Allows users to enter their name and room ID before joining.
 */
export function JoinForm({
  name,
  roomId,
  error,
  onNameChange,
  onRoomIdChange,
  onJoin,
}: JoinFormProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-5">
      <h1 className="text-3xl font-bold mb-8">QuickRTC Demo</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 max-w-sm w-full">
          {error}
        </div>
      )}

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <input
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your Name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
        />
        <input
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => onRoomIdChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
        />
        <button
          className="w-full p-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          onClick={onJoin}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
