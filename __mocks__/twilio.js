/**
 * Mock for optional "twilio" package so provider tests run without installing twilio.
 */
let fetchImpl = () => Promise.resolve({});

function twilioClient(accountSid, authToken) {
  return {
    api: {
      accounts(sid) {
        return {
          fetch: () => fetchImpl(sid),
        };
      },
    },
  };
}

function __setMockFetch(fn) {
  fetchImpl = fn;
}

module.exports = {
  __esModule: true,
  default: twilioClient,
  __setMockFetch,
};
