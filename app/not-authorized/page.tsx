export default function NotAuthorized() {
  return (
    <div className="h-screen flex items-center justify-center text-center">
      <div>
        <h1 className="text-3xl font-bold">Not Authorized</h1>
        <p className="mt-2 text-gray-600">You do not have access to this area.</p>
      </div>
    </div>
  );
}
