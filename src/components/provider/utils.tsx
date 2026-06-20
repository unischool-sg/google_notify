import { useEffect } from "react"

const UtilsProvider = () => {
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem("latest_view", new Date().toISOString());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  return null;
}

export { UtilsProvider }