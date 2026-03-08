/**
 * Custom error page. Provides a fallback when Next.js would otherwise load
 * its internal dist/pages/_error (which can be missing in Next 16 dev/Turbopack).
 * Kept minimal to avoid cascading errors.
 */
function Error({ statusCode }) {
  const message =
    statusCode === 404
      ? 'The page could not be found.'
      : statusCode
        ? `An error ${statusCode} occurred on the server.`
        : 'An error occurred on the client.';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {statusCode ?? 'Error'}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
      <a
        href="/dashboard"
        className="text-primary-600 dark:text-primary-400 hover:underline"
      >
        Go to dashboard
      </a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
