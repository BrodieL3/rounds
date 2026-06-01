const {
  fetchEventInventory,
  fetchPerformerEvents,
  createTicketsDataClient,
} = require('../ticketsdata');

describe('ticketsdata', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('fetchEventInventory', () => {
    test('calls correct URL with query params', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          listings: [{ tier: 'GA', price: 45 }],
        }),
      });

      await fetchEventInventory(
        'user@example.com',
        'secret',
        'ticketmaster',
        'https://ticketmaster.com/event/123'
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const url = global.fetch.mock.calls[0][0];
      expect(url).toMatch(/^https:\/\/ticketsdata\.com\/fetch\?/);
      expect(url).toContain('username=user%40example.com');
      expect(url).toContain('password=secret');
      expect(url).toContain('platform=ticketmaster');
      expect(url).toContain(
        'event_url=' + encodeURIComponent('https://ticketmaster.com/event/123')
      );
    });

    test('returns parsed inventory on success', async () => {
      const payload = {
        status: 'success',
        listings: [
          { tier: 'GA', face_value: 45, fees: 8.5, status: 'On Sale' },
          { tier: 'VIP', face_value: 120, fees: 15, status: 'Sold Out' },
        ],
        transfer_rules: { allowed: true, deadline: '2025-06-01T00:00:00Z' },
        preview_links: { spotify: 'https://open.spotify.com/track/abc' },
      };
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => payload,
      });

      const result = await fetchEventInventory('u', 'p', 'eventbrite', 'url');
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(payload);
    });

    test('returns error object on HTTP failure', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      });

      const result = await fetchEventInventory('u', 'p', 'dice', 'url');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    test('returns error on network failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchEventInventory('u', 'p', 'ticketmaster', 'url');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('fetchPerformerEvents', () => {
    test('calls correct URL with query params', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', events: [] }),
      });

      await fetchPerformerEvents('user@example.com', 'secret', 'https://ra.co/dj/benuf');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const url = global.fetch.mock.calls[0][0];
      expect(url).toMatch(/^https:\/\/ticketsdata\.com\/events\?/);
      expect(url).toContain('username=user%40example.com');
      expect(url).toContain('password=secret');
      expect(url).toContain('performer_url=' + encodeURIComponent('https://ra.co/dj/benuf'));
    });

    test('returns parsed events list on success', async () => {
      const payload = {
        status: 'success',
        events: [
          { title: 'Warehouse Rave', date: '2025-07-01', venue: 'The Basement' },
        ],
      };
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => payload,
      });

      const result = await fetchPerformerEvents('u', 'p', 'url');
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(payload);
    });

    test('returns error object on HTTP failure', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      const result = await fetchPerformerEvents('u', 'p', 'url');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Server error');
    });
  });

  describe('createTicketsDataClient', () => {
    test('bakes credentials into methods', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', listings: [] }),
      });

      const client = createTicketsDataClient({
        username: 'u',
        password: 'p',
      });

      await client.fetchEventInventory('ticketmaster', 'url');
      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain('username=u');
      expect(url).toContain('password=p');
    });

    test('throws if username or password missing', () => {
      expect(() => createTicketsDataClient({ password: 'p' })).toThrow('username');
      expect(() => createTicketsDataClient({ username: 'u' })).toThrow('password');
    });
  });
});
