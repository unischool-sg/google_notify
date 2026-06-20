import { useState, useEffect } from 'react';
import { GoogleAPIClient } from '../lib/google';

const useProfile = (token: string) => {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(() => token ? true : false);
  const [error, setError] = useState<Error | null>(
    () => token ? null : new Error("アクセストークンが必要です")
  );

  useEffect(() => {
    if (!token) return;

    const client = new GoogleAPIClient(token);
    client.fetch("/oauth2/v3/userinfo").then(async (response) => {
      if (!response.ok) throw new Error("リクエストが失敗しました");
      return response.json();
    }).then((data: Record<string, unknown>) => {
      setProfile(data);
      setIsLoading(false);
    }).catch((e) => {
      console.error(e);
      setProfile(null);
      setIsLoading(false);
      setError(new Error("プロフィールの取得に失敗しました"));
    });
  }, [token]);

  return { isLoading, profile, error } as const;
}

export { useProfile };