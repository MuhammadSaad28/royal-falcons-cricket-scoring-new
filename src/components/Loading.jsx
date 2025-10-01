export default function Loading({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-cricket-200"></div>
        <div className="w-12 h-12 rounded-full border-4 border-cricket-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
}