import type { ClassroomCourseWork } from "../types/classroom";
import { useState, useEffect } from 'react';
import { GoogleAPIClient } from '../lib/google';


const useClassroom = () => {
  const [classroomWorks, setClassroomWorks] = useState<Array<ClassroomCourseWork>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      setError(new Error("アクセストークンが見つかりません"));
      return;
    }

    const fetchClassroomWorks = async () => {
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
  }, []);

  return { classroomWorks, loading, error } as const;
}

export { useClassroom };