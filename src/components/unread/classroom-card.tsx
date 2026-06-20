import type { ClassroomCourseWork } from "../../types/classroom";
import { formatDate } from "./utils";
import styles from "../../styles/index.module.css";

const dueLabel = (work: ClassroomCourseWork) => {
  if (!work.dueDate) return null;
  const d = work.dueDate;
  const t = work.dueTime;
  const date = `${d.year}/${d.month}/${d.day}`;
  const time = t ? ` ${String(t.hours).padStart(2, "0")}:${String(t.minutes).padStart(2, "0")}` : "";
  return <span className={styles.dueLabel}>期限 {date + time}</span>;
};

const ClassroomCard = ({ work }: { work: ClassroomCourseWork }) => (
  <div className={styles.card}>
    <div className={styles.cardBody}>
      <p className={styles.cardTitle}>{work.title}</p>
      <div className={styles.cardMeta}>
        <span>更新: {formatDate(work.updateTime)}</span>
        {dueLabel(work)}
      </div>
    </div>
    <a
      className={styles.cardLink}
      href={work.alternateLink}
      target="_blank"
      rel="noopener noreferrer"
    >開く</a>
  </div>
);

export { ClassroomCard };
