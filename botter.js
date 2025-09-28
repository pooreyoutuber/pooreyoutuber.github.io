import http from 'k6/http';

export let options = {
  scenarios: {
    constant_rate: {
      executor: 'constant-arrival-rate',
      rate: 3,               // requests per second → 3 x 300s = 900 requests
      timeUnit: '1s',
      duration: '5m',        // 5 minutes
      preAllocatedVUs: 20,   // reserve 20 virtual users
      maxVUs: 100,           // up to 100 if needed
    },
  },
};

export default function () {
  const url = 'https://your-test-site.com/'; // <-- CHANGE THIS to your test server URL
  http.get(url);
}
