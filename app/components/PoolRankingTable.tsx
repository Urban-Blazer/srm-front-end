"use client";

import React, { useEffect, useState } from "react";
import CopyIcon from "@svg/copy-icon.svg";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Box,
  SelectChangeEvent,
  Tooltip,
  Chip,
} from "@mui/material";
import Avatar from "./Avatar";

type Pool = {
  pool_id: string;
  buyTxCount: number;
  sellTxCount: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  lp_builder_fee: string;
  burn_fee: string;
  creator_royalty_fee: string;
  rewards_fee: string;
  creator_royalty_wallet: string;
  timestamp: string;
  coinA_symbol?: string;
  coinB_symbol?: string;
  coinA_image?: string;
  coinB_image?: string;
  coinA_decimals?: number;
};

type PoolSortKey =
  | "buyVolume"
  | "sellVolume"
  | "totalVolume"
  | "timestamp"
  | "buyTxCount"
  | "sellTxCount";
type Order = "asc" | "desc";

interface HeadCell {
  id: PoolSortKey;
  label: string;
  numeric: boolean;
}

const headCells: HeadCell[] = [
  { id: "buyTxCount", label: "Buy TXs", numeric: true },
  { id: "buyVolume", label: "Buy Volume", numeric: true },
  { id: "sellTxCount", label: "Sell TXs", numeric: true },
  { id: "sellVolume", label: "Sell Volume", numeric: true },
  { id: "totalVolume", label: "Total Volume", numeric: true },
  { id: "timestamp", label: "Created", numeric: true },
];

const formatBpsToPercent = (bps: string) => {
  const num = Number(bps);
  return isNaN(num) ? "-" : `${(num / 100).toFixed(2)}%`;
};

const timeAgoFromTimestamp = (timestamp: string): string => {
  const now = Date.now();
  const diffMs = now - Number(timestamp);
  const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
  const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.length > 0 ? parts.join(" ") : "just now";
};

interface EnhancedTableHeadProps {
  onRequestSort: (
    event: React.MouseEvent<unknown>,
    property: PoolSortKey
  ) => void;
  order: Order;
  orderBy: string | null;
}

function EnhancedTableHead(props: EnhancedTableHeadProps) {
  const { order, orderBy, onRequestSort } = props;

  const createSortHandler =
    (property: PoolSortKey) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <TableHead>
      <TableRow>
        <TableCell>Pool</TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align="center"
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "asc"}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
            </TableSortLabel>
          </TableCell>
        ))}
        <TableCell align="center">LP Fee</TableCell>
        <TableCell align="center">Burn Fee</TableCell>
        <TableCell align="center">Creator Fee</TableCell>
        <TableCell align="center">Rewards Fee</TableCell>
        <TableCell align="center">Royalty Wallet</TableCell>
      </TableRow>
    </TableHead>
  );
}

export default function PoolRankingTable() {
  const [data, setData] = useState<Pool[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [range, setRange] = useState<"24h" | "7d" | "all">("24h");
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<PoolSortKey | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/pool-ranking?range=${range}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("[DEBUG] Fetch failed:", err);
      }
    };

    fetchData();
  }, [range]);

  const handleRequestSort = (
    _event: React.MouseEvent<unknown>,
    property: PoolSortKey
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleRangeChange = (event: SelectChangeEvent) => {
    setRange(event.target.value as "24h" | "7d" | "all");
  };

  const sortedData = React.useMemo(() => {
    if (!orderBy) return data;

    return [...data].sort((a, b) => {
      const aVal =
        orderBy === "timestamp"
          ? Number(a[orderBy])
          : parseFloat(a[orderBy] as any);
      const bVal =
        orderBy === "timestamp"
          ? Number(b[orderBy])
          : parseFloat(b[orderBy] as any);

      return order === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data, order, orderBy]);

  return (
    <div className="flex flex-col items-center min-h-[80vh] p-4 md:p-6 pt-20 pb-20 text-slate-100 bg-[#000306]">
      <h1 className="pt-10 text-2xl md:text-3xl font-bold mb-6 text-center">
        POOL RANKING
      </h1>

      <div className="w-full max-w-7xl px-2 md:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: "bold",
              color: "#fff",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            POOL STATISTICS
          </Typography>

          <FormControl
            size="small"
            sx={{
              minWidth: 120,
              borderRadius: 0,
              ".MuiOutlinedInput-root": {
                color: "#fff",
                borderColor: "#444",
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#666",
                },
              },
              ".MuiSelect-icon": {
                color: "#fff",
              },
              ".MuiSelect-select": {
                color: "#fff",
              },
            }}
          >
            <Select
              value={range}
              onChange={handleRangeChange}
              displayEmpty
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: "#14110c",
                    color: "#fff",
                    borderRadius: 0,
                    border: "1px solid #444",
                    "& .MuiMenuItem-root": {
                      color: "#fff",
                      "&:hover": {
                        bgcolor: "#1a1712",
                      },
                      "&.Mui-selected": {
                        bgcolor: "#1a1712",
                        color: "#61F98A",
                        "&:hover": {
                          bgcolor: "#1a1712",
                        },
                      },
                    },
                  },
                },
              }}
              sx={{
                bgcolor: "#14110c",
                borderRadius: 0,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#444",
                },
                "& .MuiSelect-select": {
                  backgroundColor: "#000",
                },
              }}
            >
              <MenuItem value="24h">24h</MenuItem>
              <MenuItem value="7d">7d</MenuItem>
              <MenuItem value="all">Lifetime</MenuItem>
            </Select>
          </FormControl>
        </div>

        <TableContainer
          component={Paper}
          sx={{
            overflow: "auto",
            boxShadow: 3,
            bgcolor: "#14110c",
            borderRadius: 0,
            border: "1px solid #444",
            "& .MuiTableCell-root": {
              borderColor: "#333",
              color: "#fff",
            },
            "& .MuiTableRow-hover:hover": {
              backgroundColor: "#1a1712 !important",
            },
            "& .MuiTableSortLabel-root": {
              color: "#fff",
              "&.Mui-active": {
                color: "#61F98A",
              },
              "& .MuiTableSortLabel-icon": {
                color: "#61F98A !important",
              },
            },
            "& .MuiTableHead-root": {
              backgroundColor: "#0a0a0a",
            },
          }}
        >
          <Table sx={{ minWidth: 750 }} aria-labelledby="poolRankingTable">
            <EnhancedTableHead
              order={order}
              orderBy={orderBy}
              onRequestSort={handleRequestSort}
            />
            <TableBody>
              {sortedData.map((pool) => (
                <TableRow key={pool.pool_id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {pool.coinA_image && (
                        <Avatar
                          src={pool.coinA_image}
                          className="w-5 h-5 aspect-square rounded-full token-icon"
                          alt=""
                        />
                      )}
                      {pool.coinB_image && (
                        <Avatar
                          src={pool.coinB_image}
                          className="w-5 h-5 aspect-square rounded-full token-icon"
                          alt=""
                        />
                      )}
                      <Typography variant="body2" sx={{ color: "#fff" }}>
                        {pool.coinA_symbol} / {pool.coinB_symbol}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">{pool.buyTxCount}</TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.5,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "#fff" }}>
                        {pool.buyVolume}
                      </Typography>
                      {pool.coinA_image && (
                        <Avatar
                          src={pool.coinA_image}
                          className="w-5 h-5 aspect-square rounded-full token-icon"
                          alt="coinA"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{pool.sellTxCount}</TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.5,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "#fff" }}>
                        {pool.sellVolume}
                      </Typography>
                      {pool.coinA_image && (
                        <Avatar
                          src={pool.coinA_image}
                          className="w-5 h-5 aspect-square rounded-full token-icon"
                          alt="coinB"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.5,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "#fff" }}>
                        {pool.totalVolume}
                      </Typography>
                      {pool.coinA_image && (
                        <Avatar
                          src={pool.coinA_image}
                          className="w-5 h-5 aspect-square rounded-full token-icon"
                          alt="coinB"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={timeAgoFromTimestamp(pool.timestamp)}
                      size="small"
                      sx={{
                        fontSize: "0.75rem",
                        bgcolor: "#1a1712",
                        color: "#61F98A",
                        border: "1px solid #333",
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {formatBpsToPercent(pool.lp_builder_fee)}
                  </TableCell>
                  <TableCell align="center">
                    {formatBpsToPercent(pool.burn_fee)}
                  </TableCell>
                  <TableCell align="center">
                    {formatBpsToPercent(pool.creator_royalty_fee)}
                  </TableCell>
                  <TableCell align="center">
                    {formatBpsToPercent(pool.rewards_fee)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        {pool.creator_royalty_wallet.slice(0, 6)}...{pool.creator_royalty_wallet.slice(-4)}
                      </Typography>
                      <Tooltip title={copiedText === pool.creator_royalty_wallet ? "Copied!" : "Copy wallet address"}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopy(pool.creator_royalty_wallet)}
                          sx={{ 
                            color: "#fff",
                            backgroundColor: "transparent",
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 9H11C9.89543 9 9 9.89543 9 11V20C9 21.1046 9.89543 22 11 22H20C21.1046 22 22 21.1046 22 20V11C22 9.89543 21.1046 9 20 9Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No pools found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}
