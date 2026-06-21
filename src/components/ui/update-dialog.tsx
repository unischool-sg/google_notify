import type { Update } from "@tauri-apps/plugin-updater";
import { Modal } from "./modal";

type UpdateDialogProps = {
  update: Update;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDownloading: boolean;
};

const UpdateDialog = ({ update, isOpen, onCancel, onConfirm, isDownloading }: UpdateDialogProps) => (
  <Modal isOpen={isOpen} style={{ minWidth: 0, maxWidth: 420, width: "90vw" }}>
    <div style={{ padding: "1.5rem 0" }}>
      <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>アップデートがあります</h2>
      <p style={{ margin: "0.75rem 0 0", color: "#666", fontSize: "0.875rem" }}>
        バージョン {update.currentVersion} → {update.version}
      </p>
      {update.body && (
        <div style={{
          marginTop: "1rem",
          padding: "0.75rem",
          background: "#f5f5f5",
          borderRadius: 6,
          fontSize: "0.8125rem",
          color: "#333",
          whiteSpace: "pre-wrap",
          maxHeight: 200,
          overflowY: "auto",
        }}>
          {update.body}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        <button
          onClick={onCancel}
          disabled={isDownloading}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #ccc",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
          }}
        >後で</button>
        <button
          onClick={onConfirm}
          disabled={isDownloading}
          style={{
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: 6,
            background: "#1976d2",
            color: "#fff",
            cursor: isDownloading ? "not-allowed" : "pointer",
            opacity: isDownloading ? 0.7 : 1,
          }}
        >
          {isDownloading ? "ダウンロード中..." : "今すぐ更新"}
        </button>
      </div>
    </div>
  </Modal>
);

export { UpdateDialog };
