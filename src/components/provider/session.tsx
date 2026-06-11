import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SiGoogle } from "react-icons/si";
import { Loading } from "../screen/loading";
import { Modal } from "../ui/modal";
import styles from "../../styles/session.module.css";

const SessionProvider = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true); // 最初はログインしてるという状態で（モーダルが開かないため）

  useEffect(() => {
    const currentSession = localStorage.getItem("session");
    if (currentSession) return setIsLoading(false);
    setIsLoggedIn(false);
    setIsLoading(false);
  }, []);

  const handleButtonClick = () => invoke("login");



  if (isLoading) return <Loading />;
  if (!isLoading && !isLoggedIn) return (
    <Modal
      isOpen={!isLoggedIn}
      style={{ minWidth: 0, maxWidth: 400, width: "90vw" }}
    >
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>ログイン</h1>
          <p className={styles.subtitle}>Google アカウントで続行</p>
        </div>
        <button className={styles.loginBtn} onClick={handleButtonClick}>
          <SiGoogle />
          Sign in with Google
        </button>
      </div>
    </Modal>
  );
  return null;
};

export { SessionProvider };