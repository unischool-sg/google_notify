export interface LoginResponse {
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
}
