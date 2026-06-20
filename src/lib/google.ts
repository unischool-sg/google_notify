import type { ListCoursesResponse, ListCourseWorkResponse } from "../types/classroom";
import type { ListSpacesResponse, ListMessagesResponse } from "../types/chat";

class GoogleAPIClient {
  private readonly accessToken: string;
  private readonly apiBaseUrl: string;

  constructor(accessToken: string, apiBaseUrl?: string) {
    this.accessToken = accessToken;
    this.apiBaseUrl = apiBaseUrl ?? "https://www.googleapis.com";
  }

  private isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  async fetch(endpoint: string, options: RequestInit = {
    method: "GET",
  }): Promise<Response> {
    const url = this.isAbsoluteUrl(endpoint) 
    ? endpoint 
    : `${this.apiBaseUrl}${endpoint}`;
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

  // Google Classroom API
  async fetchCourses() {
    const url = `https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=50`;
    const res = await this.fetch(url);
    const data: ListCoursesResponse = await res.json();

    return data.courses ?? [];
  }

  async fetchCourseWorks(courseId: string) {
    const url = `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?orderBy=updateTime desc&pageSize=20`;
    const res = await this.fetch(url);
    const data: ListCourseWorkResponse = await res.json();

    return data.courseWork ?? [];
  }

  // Google Chat API
  async fetchChatSpaces() {
    const url = `https://chat.googleapis.com/v1/spaces?pageSize=50`;
    const res = await this.fetch(url);
    const data: ListSpacesResponse = await res.json();

    return data.spaces ?? [];
  }

  async fetchChatMessages(spaceName: string, filter: string) {
    const url = `https://chat.googleapis.com/v1/${spaceName}/messages?filter=${filter}&orderBy=createTime desc&pageSize=20`;
    const res = await this.fetch(url);
    const data: ListMessagesResponse = await res.json();

    return data.messages ?? [];
  }
}

export { GoogleAPIClient };