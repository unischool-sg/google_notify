class GoogleAPIClient {
  private readonly accessToken: string;
  private readonly apiBaseUrl: string;

  constructor(accessToken: string, apiBaseUrl?: string) {
    this.accessToken = accessToken;
    this.apiBaseUrl = apiBaseUrl ?? "https://www.googleapis.com";
  }

  async fetch(endpoint: string, options: RequestInit = {
    method: "GET",
  }): Promise<Response> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }
}

export { GoogleAPIClient };