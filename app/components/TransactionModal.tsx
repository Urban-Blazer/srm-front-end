import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";

interface TransactionModalProps {
    open: boolean;
    onClose: () => void;
    logs: string[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({ open, onClose, logs }) => {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Transaction Progress</DialogTitle>
            <DialogContent dividers>
                <div style={{ maxHeight: "300px", overflowY: "auto", fontFamily: "monospace" }}>
                    {logs.map((log, index) => (
                        <p key={index} style={{ margin: "5px 0" }}>{log}</p>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TransactionModal;