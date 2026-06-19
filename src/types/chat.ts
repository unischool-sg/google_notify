// ============================================================
// Google Chat API
// ============================================================

// GET /v1/spaces
export interface ChatSpace {
  name: string; // "spaces/{space}"
  spaceType: "SPACE_TYPE_UNSPECIFIED" | "SPACE" | "GROUP_CHAT" | "DIRECT_MESSAGE";
  displayName?: string;
}

export interface ListSpacesResponse {
  spaces?: ChatSpace[];
  nextPageToken?: string;
}

// GET /v1/{space}/messages
export interface ChatUser {
  name: string; // "users/{user}"
  displayName?: string;
  type?: "TYPE_UNSPECIFIED" | "HUMAN" | "BOT";
}

export interface ChatMessage {
  name: string; // "spaces/{space}/messages/{message}"
  sender?: ChatUser;
  createTime: string;
  text?: string;
}

export interface ListMessagesResponse {
  messages?: ChatMessage[];
  nextPageToken?: string;
}

// ============================================================
// アプリ独自の統一フォーマット (Google APIには無い)
// ============================================================

export interface UnreadNotification {
  source: "classroom" | "chat";
  id: string;
  title: string;
  link: string;
  timestamp: string; // updateTime もしくは createTime
  isUnread: boolean; // lastOpenedAt との比較で自分で算出する
}