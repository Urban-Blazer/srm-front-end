"use client";

import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography
} from "@mui/material";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import usePoolRanking from "../hooks/usePoolRanking";
import Avatar from "./Avatar";
import ExplorerAccountLink from "./ExplorerLink/ExplorerAccountLink";

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
        <TableCell align="left">Pool</TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align="left"
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "asc"}
              onClick={createSortHandler(headCell.id)}
              sx={{
                padding: "0px !important",
                textAlign: "left",
              }}
            >
              {headCell.label}
            </TableSortLabel>
          </TableCell>
        ))}
        <TableCell align="left">LP Fee</TableCell>
        <TableCell align="left">Burn Fee</TableCell>
        <TableCell align="left">Creator Fee</TableCell>
        <TableCell align="left">Rewards Fee</TableCell>
        <TableCell align="left">Royalty Wallet</TableCell>
      </TableRow>
    </TableHead>
  );
}

export default function PoolsStatsTable() {
  const [range, setRange] = useState<"24h" | "7d" | "all">("24h");
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<PoolSortKey>("timestamp");
  
  // Use the new hook to fetch pool ranking data
  const { poolRankingData, isLoading, error } = usePoolRanking(range);

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
    if (!orderBy || !poolRankingData) return [];

    return [...poolRankingData].sort((a, b) => {
      switch (orderBy) {
        case "buyVolume":
          return order === "asc"
            ? Number(parseInt(`${a.buyVolume}`.replace(",", ""))) -
                Number(parseInt(`${b.buyVolume}`.replace(",", "")))
            : Number(parseInt(`${b.buyVolume}`.replace(",", ""))) -
                Number(parseInt(`${a.buyVolume}`.replace(",", "")));
        case "sellVolume":
          return order === "asc"
            ? Number(parseInt(`${a.sellVolume}`.replace(",", ""))) -
                Number(parseInt(`${b.sellVolume}`.replace(",", "")))
            : Number(parseInt(`${b.sellVolume}`.replace(",", ""))) -
                Number(parseInt(`${a.sellVolume}`.replace(",", "")));
        case "totalVolume":
          return order === "asc"
            ? Number(parseInt(`${a.totalVolume}`.replace(",", ""))) -
                Number(parseInt(`${b.totalVolume}`.replace(",", "")))
            : Number(parseInt(`${b.totalVolume}`.replace(",", ""))) -
                Number(parseInt(`${a.totalVolume}`.replace(",", "")));
        case "timestamp":
          return order === "asc"
            ? Number(a.timestamp) - Number(b.timestamp)
            : Number(b.timestamp) - Number(a.timestamp);
        case "buyTxCount":
          return order === "asc"
            ? Number(a.buyTxCount) - Number(b.buyTxCount)
            : Number(b.buyTxCount) - Number(a.buyTxCount);
        case "sellTxCount":
          return order === "asc"
            ? Number(a.sellTxCount) - Number(b.sellTxCount)
            : Number(b.sellTxCount) - Number(a.sellTxCount);
        default:
          return 0;
      }
    });
  }, [poolRankingData, order, orderBy]);

  return (
    <div className="flex flex-col items-center min-h-[80vh] p-4 md:p-6 pt-20 pb-20 text-slate-100 bg-[#000306]">
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
        
        {error && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}>
            Error loading pool data: {error instanceof Error ? error.message : 'Unknown error'}
          </Alert>
        )}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress sx={{ color: '#61F98A' }} />
          </Box>
        )}

        {!isLoading && !error && sortedData.length === 0 && (
          <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(3, 169, 244, 0.1)', color: '#29b6f6' }}>
            No pool data available for the selected time range.
          </Alert>
        )}

        {!isLoading && !error && sortedData.length > 0 && (
        <TableContainer
          component={Paper}
          sx={{
            overflow: "auto",
            boxShadow: 3,
            bgcolor: "transparent",
            borderRadius: 0,
            border: "1px solid #444",
            "& .MuiTableCell-root": {
              padding: "8px 8px",
              borderColor: "#333",
              color: "#fff",
            },
            "& .MuiButtonBase-root:hover": {
              padding: "0px !important",
              border: "none !important",
            },
            "& .MuiButtonBase-root": {
              padding: "0px !important",
              border: "none !important",
            },
            "& .MuiTableRow-hover:hover": {
              backgroundColor: "#130e18 !important",
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
              backgroundColor: "#130e18",
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
                  <TableCell align="left" padding="normal">
                    <Box sx={{ minWidth: "160px", display: "flex", alignItems: "left", gap: 1 }}>
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
                      <Link
                        href={`/swap/${pool.coinA_symbol}/${pool.coinB_symbol}`}
                      >
                        <Typography variant="body2" sx={{ color: "#fff" }}>
                          {pool.coinA_symbol} / {pool.coinB_symbol}
                        </Typography>
                      </Link>
                    </Box>
                  </TableCell>
                  <TableCell align="left">{pool.buyTxCount}</TableCell>
                  <TableCell align="left">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "left",
                        justifyContent: "left",
                        gap: 0.5,
                      }}
                    >
                      {pool.coinA_image && (
                        <Avatar
                          src={pool.coinA_image}
                          className="w-5 h-5 aspect-square rounded-full token-icon"
                          alt="coinA"
                        />
                      )}
                      <Typography variant="body2" sx={{ color: "#fff" }}>
                        {Number(parseInt(`${pool.buyVolume}`))}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="left">{pool.sellTxCount}</TableCell>
                  <TableCell align="left">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "left",
                        justifyContent: "left",
                        gap: 0.5,
                      }}
                    >
                      {pool.coinA_image && (
                        <Avatar
                          src={pool.coinA_image}
                          className="w-5 h-5 aspect-square rounded-full token-icon"
                          alt="coinB"
                        />
                      )}
                      <Typography variant="body2" sx={{ color: "#fff" }}>
                        {Number(parseInt(`${pool.sellVolume}`))}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="left">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "left",
                        justifyContent: "left",
                        gap: 0.5,
                      }}
                    >
                      {pool.coinA_image && (
                        <Avatar
                          src={pool.coinA_image}
                          className="w-5 h-5 aspect-square rounded-full token-icon"
                          alt="coinB"
                        />
                      )}
                      <Typography variant="body2" sx={{ color: "#fff" }}>
                        {Number(
                          parseInt(`${pool.totalVolume}`.replace(",", ""))
                        )}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="left">
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
                  <TableCell align="left">
                    {formatBpsToPercent(pool.lp_builder_fee)}
                  </TableCell>
                  <TableCell align="left">
                    {formatBpsToPercent(pool.burn_fee)}
                  </TableCell>
                  <TableCell align="left">
                    {formatBpsToPercent(pool.creator_royalty_fee)}
                  </TableCell>
                  <TableCell align="left">
                    {formatBpsToPercent(pool.rewards_fee)}
                  </TableCell>
                  <TableCell align="left">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "left",
                        justifyContent: "left",
                        gap: 0.5,
                      }}
                    >
                      <ExplorerAccountLink
                        account={pool.creator_royalty_wallet}
                        className="flex items-center gap-1 text-white"
                      >
                        {pool.creator_royalty_wallet.slice(0, 6)}...
                        {pool.creator_royalty_wallet.slice(-4)}{" "}
                        <ExternalLinkIcon size={16} />
                      </ExplorerAccountLink>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="left">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No pools found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </div>
    </div>
  );
}
