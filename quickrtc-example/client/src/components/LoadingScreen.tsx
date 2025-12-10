/**
 * LoadingScreen component displays a loading indicator while connecting.
 */
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <p className="text-xl text-gray-600">Connecting...</p>
    </div>
  );
}
