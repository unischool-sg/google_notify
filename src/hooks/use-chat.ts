import type { ChatSpace, ChatMessage } from "../types/chat";
import { useState, useEffect } from 'react';
import { GoogleAPIClient } from '../lib/google';

const useChat = (token: string, filter: string) => {
  const [chatMessages, setChatMessages] = useState<Array<ChatSpace & { messages: ChatMessage[] }>>([]);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<Error | null>(
    () => token ? null : new Error("アクセストークンが見つかりません")
  );

  useEffect(() => {
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
  }, [token, filter]);

  return { chatMessages, loading, error } as const;
}

export { useChat };