import { invoke } from "@tauri-apps/api/core";
import type { ListCoursesResponse, ListCourseWorkResponse } from "../types/classroom";
import type { ListSpacesResponse, ListMessagesResponse } from "../types/chat";
import type { LoginResponse } from "../types/auth";

class GoogleAPIClient {
  private accessToken: string;
  private readonly apiBaseUrl: string;

  constructor(accessToken: string, apiBaseUrl?: string) {
    this.accessToken = accessToken;
    this.apiBaseUrl = apiBaseUrl ?? "https://www.googleapis.com";
  }

  private async ensureValidToken(): Promise<string> {
    const expiresAt = localStorage.getItem("expires_at");
    if (expiresAt && Date.now() < Number(expiresAt) - 60_000) {
      return this.accessToken;
    }

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return this.accessToken;

    try {
      const res = await invoke<LoginResponse>("refresh_token", { refreshToken });
      localStorage.setItem("access_token", res.access_token);
      localStorage.setItem("expires_at", String(Date.now() + res.expires_in * 1000));
      this.accessToken = res.access_token;
    } catch (e) {
      console.error("Token refresh failed:", e);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("expires_at");
      window.location.reload();
    }
    return this.accessToken;
  }

  private isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  async fetch(endpoint: string, options: RequestInit = {
    method: "GET",
  }): Promise<Response> {
    const token = await this.ensureValidToken();
    const url = this.isAbsoluteUrl(endpoint) 
    ? endpoint 
    : `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  // Google Classroom API
  async fetchCourses() {
    const url = new URL(`https://classroom.googleapis.com/v1/courses`);
    url.searchParams.append("courseStates", "ACTIVE");
    url.searchParams.append("pageSize", "50");
    
    const res = await this.fetch(url.toString());
    const data: ListCoursesResponse = await res.json();

    return data.courses ?? [];
  }

  async fetchCourseWorks(courseId: string) {
    const url = new URL(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`);
    url.searchParams.append("orderBy", "updateTime desc");
    url.searchParams.append("pageSize", "20");

    const res = await this.fetch(url.toString());
    const data: ListCourseWorkResponse = await res.json();

    return data.courseWork ?? [];
  }

  // Google Chat API
  async fetchChatSpaces() {
    const url = new URL(`https://chat.googleapis.com/v1/spaces`);
    url.searchParams.append("pageSize", "50");

    const res = await this.fetch(url.toString());
    const data: ListSpacesResponse = await res.json();

    return data.spaces ?? [];
  }

  async fetchChatMessages(spaceName: string, filter: string) {
    const url = new URL(`https://chat.googleapis.com/v1/${spaceName}/messages`);
    url.searchParams.append("filter", filter);
    url.searchParams.append("orderBy", "createTime desc");
    url.searchParams.append("pageSize", "20");
    
    const res = await this.fetch(url.toString());
    const data: ListMessagesResponse = await res.json();

    return data.messages ?? [];
  }
}

export { GoogleAPIClient };