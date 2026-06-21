import { useEffect, useMemo, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useClassroom } from "../hooks/use-classroom";
import { Loading } from "../components/screen/loading";
import { ClassroomCard } from "../components/unread/classroom-card";

const TEST_MODE = true; // false にすると期間フィルタが有効に
const INITIAL_DISPLAY_COUNT = 7;
const LOAD_MORE_COUNT = 10;

const developers = [
  { name: "tanahiro2010", href: "https://tanahiro2010.com" },
  { name: "田中博悠", href: "https://tanahiro2010.com" },
];

const IndexPage = () => {
  const token = localStorage.getItem("access_token");
  const classroomResult = useClassroom(token);
  const latestView = TEST_MODE ? null : localStorage.getItem("latest_view");
  const since = latestView && !isNaN(new Date(latestView).getTime())
    ? latestView
    : new Date(0).toISOString();

  const [developer] = useState(() =>
    developers[Math.floor(Math.random() * developers.length)]
  );
  const [appVersion, setAppVersion] = useState("");
  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("0.1.0"));
  }, []);
  const [classroomLimit, setClassroomLimit] = useState(INITIAL_DISPLAY_COUNT);

  const unreadItems = useMemo(() => {
    return classroomResult.loading ? [] :
      classroomResult.classroomWorks.filter(
        (work) => new Date(work.updateTime) > new Date(since)
      );
  }, [classroomResult.classroomWorks, classroomResult.loading, since]);
  const profile = useMemo(() => {
    try {
      const profileRaw = sessionStorage.getItem("profile");
      if (!profileRaw) return null;
      return JSON.parse(profileRaw);
    } catch {
      return null;
    }
  }, []);
  const userName = typeof profile?.name === "string" ? profile.name : null;
  if (classroomResult.loading) return <Loading isFullscreen={false} />;
  if (classroomResult.error) {
    return (
      <Container maxWidth="md" sx={{ py: 3, height: "100vh", boxSizing: "border-box" }}>
        <Typography variant="h1" gutterBottom>
          Classroom
        </Typography>
        <Alert severity="error" sx={{ mt: 3 }}>
          <Typography>Classroomの取得に失敗しました</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
            {classroomResult.error.message}
          </Typography>
        </Alert>
      </Container>
    );
  }

  const unreadTotal = unreadItems.length;

  return (
    <Container
      maxWidth="md"
      sx={{
        py: 3,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="h1">未読アイテム</Typography>
          {unreadTotal > 0 && (
            <Chip
              label={unreadTotal}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ bgcolor: "primary.light", border: "none", fontWeight: 500 }}
            />
          )}
        </Stack>
        {userName && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ようこそ {userName} さん
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 3, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Typography
          variant="h2"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.04em", mb: 1.5 }}
        >
          Classroom ({unreadItems.length})
        </Typography>
        {unreadItems.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ py: 2 }}>
            未読はありません
          </Typography>
        ) : (
          <>
            <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {unreadItems.slice(0, classroomLimit).map((work) => (
                <ClassroomCard key={work.id} work={work} />
              ))}
            </Box>
            {classroomLimit < unreadItems.length && (
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={() => setClassroomLimit((p) => p + LOAD_MORE_COUNT)}
                sx={{ mt: 1, color: "text.secondary" }}
              >
                さらに表示
              </Button>
            )}
          </>
        )}
      </Box>

      <Divider sx={{ mt: 2 }} />
      <Typography
        variant="caption"
        color="text.disabled"
        align="center"
        sx={{ pt: 2, flexShrink: 0, "& a": { color: "text.secondary" } }}
      >
        v{appVersion} &middot; Powered by{" "}
        <Link href="https://unischool.jp" underline="hover" color="inherit">
          UniSchool
        </Link>
        {" - "}
        <Link href={developer.href} underline="hover" color="inherit">
          {developer.name}
        </Link>
      </Typography>
    </Container>
  );
};

export { IndexPage };
