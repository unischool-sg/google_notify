import { Outlet } from "react-router-dom";
import { SessionProvider } from "../provider/session";
import { UtilsProvider } from "../provider/utils";

const Layout = () => {
    return (
      <>
      <Outlet />

      { /* Providers */ }
      <SessionProvider />
      <UtilsProvider />
      </>
    );
}

export default Layout;