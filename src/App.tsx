import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { Update } from "@tauri-apps/plugin-updater";
import { HasChildrenRoute, BaseRoute } from "./types/routes";
import { routes } from "./config/routes";
import Layout from "./components/layout/layout";
import { UpdateDialog } from "./components/ui/update-dialog";
import "./App.css";

const joinPaths = (parent: string, child: string): string => {
  if (child === "/") return "/";
  if (child.startsWith("/")) return child;
  const p = parent === "" || parent === "/" ? "" : parent;
  return `${p}/${child}`.replace(/\/+/g, "/");
}

const flattenRoutes = (route: HasChildrenRoute, parent = ""): Array<BaseRoute> => {
  const fullPath = joinPaths(parent, route.path);
  const me: BaseRoute = { path: fullPath, element: route.element };
  const kids = route.children ? route.children.flatMap((child) => flattenRoutes(child, fullPath)) : [];
  return [me, ...kids];
}

const flatRoutes: Array<BaseRoute> = routes.flatMap((route) => flattenRoutes(route, ""));

function App() {
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    ;(async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) setPendingUpdate(update);
      } catch {
        // オフラインや未設定時は何もしない
      }
    })();
  }, []);

  const handleUpdateCancel = useCallback(() => {
    pendingUpdate?.close();
    setPendingUpdate(null);
  }, [pendingUpdate]);

  const handleUpdateConfirm = useCallback(async () => {
    if (!pendingUpdate) return;
    setIsDownloading(true);
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await pendingUpdate.downloadAndInstall();
      await relaunch();
    } catch {
      setIsDownloading(false);
      setPendingUpdate(null);
    }
  }, [pendingUpdate]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {flatRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Route>
        </Routes>
      </BrowserRouter>

      <UpdateDialog
        update={pendingUpdate!}
        isOpen={pendingUpdate !== null}
        onCancel={handleUpdateCancel}
        onConfirm={handleUpdateConfirm}
        isDownloading={isDownloading}
      />
    </>
  )
}

export default App;
