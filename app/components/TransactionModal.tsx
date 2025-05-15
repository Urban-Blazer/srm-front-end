import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { Spinner } from "@components/Spinner";
import Image from "next/image";
import React from "react";

interface TransactionModalProps {
    open: boolean;
    onClose: () => void;
    logs: string[];
    isProcessing: boolean;
    transactionProgress?: {
        image: string;
        text: string;
    }
}

const TransactionModal: React.FC<TransactionModalProps> = ({ open, onClose, logs, isProcessing, transactionProgress }) => {
    return (
        <Dialog open={open} onClose={!isProcessing ? onClose : undefined} maxWidth="sm" sx={{backgroundColor: '#6A1B9A78'}}>
            {/* <DialogTitle sx={{backgroundColor: '#000306', color: '#21B573'}}>{transactionProgress?.text}</DialogTitle> */}
            <DialogContent dividers sx={{backgroundColor: '#000306'}}>
                <div style={{ maxHeight: "650px", overflowY: "auto", fontFamily: "monospace", color: '#fff' }} className="relative flex items-center flex-col">
                    <Image
                        src={transactionProgress?.image ?? ''}
                        alt="Sui Rewards Me App Logo"
                        width={250} /* Adjusted size for mobile fit */
                        height={120}
                        priority
                    />
                    {transactionProgress?.image === '/images/txn_loading.png' ? <Spinner /> : null}   
                    {logs.slice(logs.length - 3).map((log, index) => (
                        <p key={index} style={{ margin: "5px 0" }}>{log}</p>
                    ))}  
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TransactionModal;
