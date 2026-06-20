import { useMemo, useState } from "react";
import { useClassroom } from "../hooks/use-classroom";
import { useChat } from "../hooks/use-chat";
import { Loading } from "../components/screen/loading";
import { ClassroomCard } from "../components/unread/classroom-card";
import { ChatSpaceSection } from "../components/unread/chat-card";
import styles from "../styles/index.module.css";

const TEST_MODE = true; // false にすると期間フィルタが有効に

const developers = [
  { name: "tanahiro2010", href: "https://tanahiro2010.com" },
  { name: "田中博悠", href: "https://tanahiro2010.com" },
];

const IndexPage = () => {
  const classroomResult = useClassroom();
  const latestView = localStorage.getItem("latest_view");
  const since = latestView && !isNaN(new Date(latestView).getTime())
    ? latestView
    : new Date(0).toISOString();
  const chatResult = useChat(`createTime > "${since}"`);

  const [developer] = useState(() =>
    developers[Math.floor(Math.random() * developers.length)]
  );

  const unreadItems = useMemo(() => {
    const classroom = classroomResult.loading ? [] :
      classroomResult.classroomWorks.filter(
        (work) => new Date(work.updateTime) > new Date(since)
      );
    const chat = chatResult.loading ? [] : chatResult.chatMessages;
    return { classroom, chat };
  }, [classroomResult.classroomWorks, classroomResult.loading, chatResult.chatMessages, chatResult.loading, since]);

  if (classroomResult.loading || chatResult.loading) return <Loading isFullscreen={false} />;

  const profileRaw = sessionStorage.getItem("profile");
  const profile = profileRaw ? JSON.parse(profileRaw) as Record<string, unknown> : null;
  const userName = typeof profile?.name === "string" ? profile.name : null;

  const unreadTotal = unreadItems.classroom.length +
    unreadItems.chat.reduce((acc, s) => acc + s.messages.length, 0);

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
        <h2>Classroom ({unreadItems.classroom.length})</h2>
        {unreadItems.classroom.length === 0 ? (
          <div className={styles.empty}>未読はありません</div>
        ) : (
          unreadItems.classroom.map((work) => (
            <ClassroomCard key={work.id} work={work} />
          ))
        )}
      </section>

      <section className={styles.section}>
        <h2>Google Chat ({unreadItems.chat.reduce((acc, s) => acc + s.messages.length, 0)})</h2>
        {unreadItems.chat.length === 0 ? (
          <div className={styles.empty}>未読はありません</div>
        ) : (
          unreadItems.chat.map((space) => (
            <ChatSpaceSection key={space.name} space={space} />
          ))
        )}
      </section>

      <footer className={styles.footer}>
        Powered by <a href="https://unischool.jp">UniSchool</a> - <a href={developer.href}>{developer.name}</a>
      </footer>
    </div>
  );
};

export { IndexPage };