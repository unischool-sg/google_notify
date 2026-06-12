import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SiGoogle } from "react-icons/si";
import { GoogleAPIClient } from "../../lib/google";
import { Loading } from "../screen/loading";
import { Modal } from "../ui/modal";
import styles from "../../styles/session.module.css";

const SessionProvider = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  useEffect(() => {
    const currentSession = localStorage.getItem("access_token");
    if (currentSession) return setIsLoading(false);
    setIsLoggedIn(false);
    setIsLoading(false);
  }, []);

  const handleButtonClick = async () => {
    setIsLoggingIn(true);
    try {
      const token = await invoke<string>("login");
      localStorage.setItem("access_token", token);
      const client = new GoogleAPIClient(token);
      try {
        const profile = await client.fetch("/oauth2/v3/userinfo", {
          method: "GET"
        });
      } catch (e) {
        
      }
      setIsLoggedIn(true);
    } catch (e) {
      console.error("Login failed:", e);
    } finally {
      setIsLoggingIn(false);
    }
  };

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

        <button
          className={styles.loginBtn}
          onClick={handleButtonClick}
          disabled={isLoggingIn}
        >
          <SiGoogle />
          {isLoggingIn ? "ログイン中..." : "Sign in with Google"}
        </button>
      </div>
    </Modal>
  );
  return null;
};

export { SessionProvider };
