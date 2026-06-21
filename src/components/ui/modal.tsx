import { CSSProperties } from "react";
import { Dialog, DialogContent } from "@mui/material";

type ModalProps = {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
};

export const Modal = ({ isOpen, onClose, className, children, style }: ModalProps) => (
  <Dialog
    open={isOpen}
    onClose={onClose}
    slotProps={{
      paper: {
        className,
        style,
      },
    }}
  >
    <DialogContent>{children}</DialogContent>
  </Dialog>
);
