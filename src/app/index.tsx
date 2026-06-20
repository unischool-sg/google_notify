import { useMemo, useState } from "react";
import { useClassroom } from "../hooks/use-classroom";
import { Loading } from "../components/screen/loading";
import { ClassroomCard } from "../components/unread/classroom-card";
import styles from "../styles/index.module.css";

const TEST_MODE = false; // false にすると期間フィルタが有効に
const INITIAL_DISPLAY_COUNT = 7;
const LOAD_MORE_COUNT = 10;

const developers = [
  { name: "tanahiro2010", href: "https://tanahiro2010.com" },
  { name: "田中博悠", href: "https://tanahiro2010.com" },
];

const IndexPage = () => {
  const token = useMemo(() => localStorage.getItem("access_token"), [localStorage]);
  const classroomResult = useClassroom(token);
  const latestView = TEST_MODE ? null : localStorage.getItem("latest_view");
  const since = latestView && !isNaN(new Date(latestView).getTime())
    ? latestView
    : new Date(0).toISOString();

  const [developer] = useState(() =>
    developers[Math.floor(Math.random() * developers.length)]
  );
  const [classroomLimit, setClassroomLimit] = useState(INITIAL_DISPLAY_COUNT);

  const unreadItems = useMemo(() => {
    return classroomResult.loading ? [] :
      classroomResult.classroomWorks.filter(
        (work) => new Date(work.updateTime) > new Date(since)
      );
  }, [classroomResult.classroomWorks, classroomResult.loading, since]);

  if (classroomResult.loading) return <Loading isFullscreen={false} />;
  if (classroomResult.error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}><h1>Classroom</h1></div>
        <section className={styles.section}>
          <div className={styles.error}>
            <p>Classroomの取得に失敗しました</p>
            <p className={styles.errorDetail}>{classroomResult.error.message}</p>
          </div>
        </section>
      </div>
    );
  }

  const profile = useMemo(() => {
    try {
      const profileRaw = sessionStorage.getItem("profile");
      if (!profileRaw) return null;
      return JSON.parse(profileRaw);
    } catch {
      return null;
    }
  }, [sessionStorage]);
  const userName = typeof profile?.name === "string" ? profile.name : null;

  const unreadTotal = unreadItems.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          未読アイテム
          {unreadTotal > 0 && <span className={styles.badge}>{unreadTotal}</span>}
        </h1>
        {userName && <div className={styles.welcome}>ようこそ {userName} さん</div>}
      </div>

      <section className={styles.section}>
        <h2>Classroom ({unreadItems.length})</h2>
        {unreadItems.length === 0 ? (
          <div className={styles.empty}>未読はありません</div>
        ) : (
          <>
            <div className={styles.scrollArea}>
              {unreadItems.slice(0, classroomLimit).map((work) => (
                <ClassroomCard key={work.id} work={work} />
              ))}
            </div>
            {classroomLimit < unreadItems.length && (
              <button className={styles.showMore} onClick={() => setClassroomLimit((p) => p + LOAD_MORE_COUNT)}>
                さらに表示
              </button>
            )}
          </>
        )}
      </section>

      <footer className={styles.footer}>
        Powered by <a href="https://unischool.jp">UniSchool</a> - <a href={developer.href}>{developer.name}</a>
      </footer>
    </div>
  );
};

export { IndexPage };