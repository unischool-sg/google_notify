import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HasChildrenRoute, BaseRoute } from "./types/routes";
import { routes } from "./config/routes";
import Layout from "./components/layout/layout";
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
  useEffect(() => {
    ;(async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const { relaunch } = await import("@tauri-apps/plugin-process");
        const update = await check();
        if (update?.available) {
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch {
        // オフラインや未設定時は何もしない
      }
    })();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {flatRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
