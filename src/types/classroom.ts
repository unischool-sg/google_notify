// ============================================================
// Google Classroom API
// ============================================================

// GET /v1/courses
export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  room?: string;
  ownerId: string;
  creationTime: string; // RFC3339
  updateTime: string;
  courseState: "COURSE_STATE_UNSPECIFIED" | "ACTIVE" | "ARCHIVED" | "PROVISIONED" | "DECLINED" | "SUSPENDED";
  alternateLink: string;
}

export interface ListCoursesResponse {
  courses?: ClassroomCourse[];
  nextPageToken?: string;
}

// GET /v1/courses/{courseId}/courseWork
export interface ClassroomCourseWork {
  courseId: string;
  id: string;
  title: string;
  description?: string;
  state: "COURSE_WORK_STATE_UNSPECIFIED" | "PUBLISHED" | "DRAFT" | "DELETED";
  alternateLink: string;
  creationTime: string;
  updateTime: string; // 編集も未読扱いするので、これを判定に使う
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number; seconds?: number };
  maxPoints?: number;
  workType: "COURSE_WORK_TYPE_UNSPECIFIED" | "ASSIGNMENT" | "SHORT_ANSWER_QUESTION" | "MULTIPLE_CHOICE_QUESTION";
}

export interface ListCourseWorkResponse {
  courseWork?: ClassroomCourseWork[];
  nextPageToken?: string;
}

// GET /v1/courses/{courseId}/announcements
export interface ClassroomAnnouncement {
  courseId: string;
  id: string;
  text: string;
  state: "ANNOUNCEMENT_STATE_UNSPECIFIED" | "PUBLISHED" | "DRAFT" | "DELETED";
  alternateLink: string;
  creationTime: string;
  updateTime: string;
}

export interface ListAnnouncementsResponse {
  announcements?: ClassroomAnnouncement[];
  nextPageToken?: string;
}