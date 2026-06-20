import type { ChatSpace, ChatMessage } from "../../types/chat";
import { formatDate } from "./utils";
import styles from "../../styles/index.module.css";

const ChatMessageItem = ({ msg }: { msg: ChatMessage }) => (
  <div className={styles.messageItem}>
    {msg.sender?.displayName && (
      <div className={styles.messageSender}>{msg.sender.displayName}</div>
    )}
    <div className={styles.messageText}>{msg.text ?? "(画像など)"}</div>
    <div className={styles.messageTime}>{formatDate(msg.createTime)}</div>
  </div>
);

const ChatSpaceSection = ({ space }: { space: ChatSpace & { messages: ChatMessage[] } }) => (
  <div className={styles.chatCard}>
    <div className={styles.spaceName}>{space.displayName ?? space.name}</div>
    {space.messages.map((msg) => (
      <ChatMessageItem key={msg.name} msg={msg} />
    ))}
  </div>
);

export { ChatSpaceSection };
