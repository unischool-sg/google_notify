import type { ChatSpace, ChatMessage } from "../types/chat";
import { useState, useEffect } from 'react';
import { GoogleAPIClient } from '../lib/google';

const useChat = (filter: string) => {
  const [chatMessages, setChatMessages] = useState<Array<ChatSpace & { messages: ChatMessage[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      setError(new Error("アクセストークンが見つかりません"));
      return;
    }

    const fetchChatMessages = async () => {
      const client = new GoogleAPIClient(token);
      try {
        const spaces = await client.fetchChatSpaces();
        const messages = await Promise.all(spaces.map(async (space) => {
          const chatMessages = await client.fetchChatMessages(space.name, filter);
          return { ...space, messages: chatMessages };
        }));
        setChatMessages(messages);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatMessages();
  }, []);

  return { chatMessages, loading, error } as const;
}

export { useChat };