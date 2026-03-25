import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

interface OverwriteConfirmContextType {
  /**
   * Show a confirmation dialog and resolve with the user's choice.
   */
  confirm: (message: string) => Promise<boolean>;
}

const OverwriteConfirmContext = createContext<
  OverwriteConfirmContextType | undefined
>(undefined);

interface OverwriteConfirmProviderProps {
  children: ReactNode;
}

/** Single source of truth for overwrite confirmation copy. */
const OVERWRITE_BASE = "Applying will overwrite your manual changes.";
export const OVERWRITE_MSG = `${OVERWRITE_BASE} Continue?`;
export const getOverwriteMessageBulk = (count: number): string =>
  `${OVERWRITE_BASE} Apply ${count} suggestion${count > 1 ? "s" : ""} anyway?`;

const DEFAULT_MESSAGE = OVERWRITE_MSG;

/** Only one dialog is active at a time. If confirm() is called again before the user answers, the previous promise resolves with false and the new message is shown. */
export const OverwriteConfirmProvider: React.FC<
  OverwriteConfirmProviderProps
> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>(DEFAULT_MESSAGE);
  const resolverRef = useRef<(value: boolean) => void>();

  const confirm = useCallback((msg: string) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = undefined;
    }
    setMessage(msg || DEFAULT_MESSAGE);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = undefined;
    }
  };

  return (
    <OverwriteConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={open}
        onClose={() => handleClose(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Overwrite AI Suggestions?</DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => handleClose(true)}
            color="primary"
            variant="contained"
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </OverwriteConfirmContext.Provider>
  );
};

export const useOverwriteConfirm = (): OverwriteConfirmContextType => {
  const ctx = useContext(OverwriteConfirmContext);
  if (!ctx) {
    throw new Error(
      "useOverwriteConfirm must be used within an OverwriteConfirmProvider",
    );
  }
  return ctx;
};
