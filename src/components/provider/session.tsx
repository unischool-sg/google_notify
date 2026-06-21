import type { LoginResponse } from "../../types/auth";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Typography } from "@mui/material";
import { useProfile } from "../../hooks/use-profile";
import { Loading } from "../screen/loading";
import { GoogleSignInButton } from "../ui/google-sign-in-button";
import { Modal } from "../ui/modal";
import { sleep } from "../../lib/sleep";

const storeTokenData = (res: LoginResponse) => {
  localStorage.setItem("access_token", res.access_token);
  if (res.refresh_token) {
    localStorage.setItem("refresh_token", res.refresh_token);
  } else {
    localStorage.removeItem("refresh_token");
  }
  localStorage.setItem("expires_at", String(Date.now() + res.expires_in * 1000));
};

const SessionProvider = () => {
  const storedToken = localStorage.getItem("access_token");
  const [token, setToken] = useState<string | null>(storedToken);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!storedToken);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const { isLoading: isProfileLoading, profile, error } = useProfile(token ?? "");

  useEffect(() => {
    if (profile && !error) {
      sessionStorage.setItem("profile", JSON.stringify(profile));
    } else {
      sessionStorage.removeItem("profile");
    }
  }, [profile, error]);

  const handleButtonClick = async () => {
    setIsLoggingIn(true);
    try {
      const res = await invoke<LoginResponse>("login");
      storeTokenData(res);
      setToken(res.access_token);
      setIsLoggedIn(true);
      await sleep(3);
      location.reload();
    } catch (e) {
      console.error("Login failed:", e);
      alert(`ログインに失敗しました\n${e}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isProfileLoading) return <Loading />;
  if (!isLoggedIn || error) return (
    <Modal
      isOpen={!isLoggedIn}
      style={{ minWidth: 0, maxWidth: 400, width: "90vw" }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, py: 1 }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h1" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            ログイン
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Google アカウントで続行
          </Typography>
        </Box>

        <GoogleSignInButton
          onClick={handleButtonClick}
          loading={isLoggingIn}
          loadingLabel="Signing in..."
        />
      </Box>
    </Modal>
  );
  return null;
};

export { SessionProvider };
