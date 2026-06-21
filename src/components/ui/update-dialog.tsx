import type { Update } from "@tauri-apps/plugin-updater";
import {
  Box,
  Button,
  DialogActions,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
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
    <DialogTitle sx={{ p: 0, pb: 1 }}>アップデートがあります</DialogTitle>
    <DialogContentText sx={{ color: "text.secondary" }}>
      バージョン {update.currentVersion} → {update.version}
    </DialogContentText>
    {update.body && (
      <Box
        sx={{
          mt: 2,
          p: 1.5,
          bgcolor: "grey.100",
          borderRadius: 1,
          fontSize: "0.8125rem",
          color: "text.primary",
          whiteSpace: "pre-wrap",
          maxHeight: 200,
          overflowY: "auto",
        }}
      >
        <Typography variant="body2" component="div">
          {update.body}
        </Typography>
      </Box>
    )}
    <DialogActions sx={{ px: 0, pt: 3, pb: 0 }}>
      <Button onClick={onCancel} disabled={isDownloading} variant="outlined" color="inherit">
        後で
      </Button>
      <Button onClick={onConfirm} disabled={isDownloading} variant="contained">
        {isDownloading ? "ダウンロード中..." : "今すぐ更新"}
      </Button>
    </DialogActions>
  </Modal>
);

export { UpdateDialog };
