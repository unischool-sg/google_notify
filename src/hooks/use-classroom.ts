import type { ClassroomCourseWork } from "../types/classroom";
import { useState, useEffect } from 'react';
import { GoogleAPIClient } from '../lib/google';


const useClassroom = (token: string | null) => {
  const [classroomWorks, setClassroomWorks] = useState<Array<ClassroomCourseWork>>([]);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<Error | null>(
    () => token ? null : new Error("アクセストークンが見つかりません")
  );

  useEffect(() => {
    const fetchClassroomWorks = async () => {
      if (!token) return;

      const client = new GoogleAPIClient(token);
      
      try {
        const courses = await client.fetchCourses();
        const works = await Promise.all(courses.map(async (course) => {
          const courseWorks = await client.fetchCourseWorks(course.id);
          return courseWorks;
        }));
        setClassroomWorks(works.flat());
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchClassroomWorks();
  }, [token]);

  return { classroomWorks, loading, error } as const;
}

export { useClassroom };