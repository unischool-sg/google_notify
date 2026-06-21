import { type Member, members } from "../../constants/member";
import { useMemo } from "react";
import { Box, CircularProgress, Link, Typography } from "@mui/material";

type LoadingProps = {
  isFullscreen?: boolean;
};

const Loading = ({ isFullscreen = true }: LoadingProps) => {
  /* eslint-disable react-hooks/purity */
  const member = useMemo<Member>(() => members[Math.floor(Math.random() * members.length)], []);

  return (
    <Box
      component="main"
      className={`loading ${isFullscreen ? "fullscreen" : "inset"}`}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <CircularProgress aria-label="Loading…" />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          Powered by{" "}
          <Link href="https://unischool.jp" color="inherit" underline="hover">
            UniSchool
          </Link>
          {" - "}
          <Link href={member.href} color="inherit" underline="hover">
            {member.name}
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export { Loading };
