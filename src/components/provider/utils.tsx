import { useEffect } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"

const UtilsProvider = () => {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWindow().onCloseRequested(async () => {
      if (sessionStorage.getItem("profile"))
        localStorage.setItem("latest_view", new Date().toISOString());
    }).then((fn) => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []);

  return null;
}

export { UtilsProvider }