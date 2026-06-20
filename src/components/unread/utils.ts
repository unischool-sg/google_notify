const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

export { formatDate };
