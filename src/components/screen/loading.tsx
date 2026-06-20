import { type Member, members } from "../../constants/member";
import { useState } from "react";
import { CircularProgress } from "@mui/material";

type LoadingProps = {
  isFullscreen?: boolean;
}

const Loading = ({ isFullscreen = true }: LoadingProps) => {
  const [member, _setMember] = useState<Member>(() => members[Math.floor(Math.random() * members.length)]);

  return (
    <main className={`loading ${isFullscreen ? "fullscreen" : "inset"}`}>
      <div>
        <CircularProgress aria-label="Loading…"/>
        <span className="credit">Powered by <a href="https://unischool.jp">UniSchool</a> - <a href={member.href}>{member.name}</a></span>
      </div>
    </main>
  )
}

export { Loading };