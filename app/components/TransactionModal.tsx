import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

interface TransactionModalProps {
    open: boolean;
    onClose: () => void;
    logs: string[];
    isProcessing: boolean;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ open, onClose, logs, isProcessing }) => {
    return (
        <Dialog open={open} onClose={!isProcessing ? onClose : undefined} fullWidth maxWidth="sm">
            <DialogTitle>Transaction Progress</DialogTitle>
            <DialogContent dividers>
                <div style={{ maxHeight: "300px", overflowY: "auto", fontFamily: "monospace" }}>
                    {logs.map((log, index) => (
                        <p key={index} style={{ margin: "5px 0" }}>{log}</p>
                    ))}
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={isProcessing} // ✅ Keeps button disabled while processing
                    onClick={onClose}
                    sx={{
                        backgroundColor: isProcessing ? "#6c757d" : "#28a745",
                        color: "blue",
                        minWidth: "200px",
                        "&:hover": {
                            backgroundColor: isProcessing ? "#5a6268" : "#218838",
                        },
                    }}
                >
                    {isProcessing ? "Processing Transaction..." : "Transaction Completed"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TransactionModal;
