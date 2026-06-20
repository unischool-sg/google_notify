import { useEffect } from "react"

const UtilsProvider = () => {
  useEffect(() => {
    const timer = setInterval(() => {
      if (sessionStorage.getItem("profile")) // ログインできているなら
        localStorage.setItem("latest_view", new Date().toISOString());
    }, 10 * 1000);

    return () => clearInterval(timer);
  }, []);

  return null;
}

export { UtilsProvider }