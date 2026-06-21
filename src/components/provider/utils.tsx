import { useEffect } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"

const UtilsProvider = () => {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      if (sessionStorage.getItem("profile"))
        localStorage.setItem("latest_view", new Date().toISOString());
      await getCurrentWindow().destroy();
    }).then((fn) => {
      if (disposed) {
        fn();
        return;
      }
      unlisten = fn;
    }).catch(() => {
      // 必要ならロギング
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return null;
}

export { UtilsProvider }