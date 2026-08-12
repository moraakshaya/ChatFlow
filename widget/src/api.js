const BASE_URL = 'http://localhost:3000/api/v1';

export const createApiClient = (token) => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  return {
    getConversations: async () => {
      const res = await fetch(`${BASE_URL}/conversations`, { headers });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json();
    },
    getMessages: async (conversationId) => {
      const res = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, { headers });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    sendMessage: async (conversationId, content, senderId) => {
      // Create a temporary client message id for deduplication (handled if the backend supports it, else just for tracking)
      const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const res = await fetch(`${BASE_URL}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ conversationId, senderId, content, type: 'text', clientMessageId })
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    }
  };
};
