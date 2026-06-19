import { useState } from "react";
import { CircularProgress } from "@mui/material";

type Member = {
  name: string;
  href: string;
}
const members: Array<Member> = [
  { name: "tanahiro2010", href: "https://tanahiro2010.com" },
  { name: "田中博悠", href: "https://tanahiro2010.com" },
];

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