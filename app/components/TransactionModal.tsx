import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { Spinner } from "@components/Spinner";
import Image from "next/image";
import React from "react";
import ExplorerTxLink from "./ExplorerLink/ExplorerTxLink";

interface TransactionModalProps {
    open: boolean;
    onClose: () => void;
    logs: string[];
    isProcessing: boolean;
    transactionProgress?: {
        image: string;
        text: string;
    }
    digest?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ open, onClose, logs, isProcessing, transactionProgress, digest }) => {
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
                    {transactionProgress?.image === '/images/txn_failed.png' ? <p style={{ margin: "5px 0", color: 'white' }}>
                        {logs.slice(logs.length - 1).map((log, index) => (
                            <p key={index} style={{ margin: "5px 0" }}>{log}</p>
                        ))}  
                    </p> : null}   
                    {digest ? (
                        <ExplorerTxLink txHash={digest}>
                            <p style={{ margin: "5px 0", color: 'white' }}>View on Sui Explorer</p>
                        </ExplorerTxLink>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TransactionModal;

