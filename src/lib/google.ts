class GoogleAPIClient {
  private readonly accessToken: string;
  private readonly apiBaseUrl: string;

  constructor(accessToken: string, apiBaseUrl?: string) {
    this.accessToken = accessToken;
    this.apiBaseUrl = apiBaseUrl ?? "https://www.googleapis.com";
  }

  async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export { GoogleAPIClient };