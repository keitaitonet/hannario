"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { format } from "date-fns";
import Link from "next/link";
import type { AuditLogRow } from "../_data";

export function AuditTable({
  rows,
  cursor,
  nextCursor,
}: {
  rows: AuditLogRow[];
  cursor: number | null;
  nextCursor: number | null;
}) {
  return (
    <>
      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 900 }} aria-label="audit-logs">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>時刻</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>結果</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Meta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontFamily: "monospace" }}>{row.id}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {format(row.createdAt, "yyyy-MM-dd HH:mm:ss")}
                </TableCell>
                <TableCell>
                  {row.actor
                    ? (row.actor.name ?? `#${row.actor.id}`)
                    : "system"}
                </TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>
                  {row.action}
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.result}
                    color={row.result === "success" ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>
                  {row.targetType ? `${row.targetType}:${row.targetId}` : "—"}
                </TableCell>
                <TableCell>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      maxWidth: 480,
                    }}
                  >
                    {JSON.stringify(row.meta, null, 2)}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  監査ログがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mt: 2, justifyContent: "space-between" }}
      >
        <Button
          component={Link}
          href="/audit"
          size="small"
          disabled={cursor === null}
        >
          ← 最新へ
        </Button>
        <Button
          component={Link}
          href={nextCursor !== null ? `/audit?cursor=${nextCursor}` : "#"}
          size="small"
          disabled={nextCursor === null}
        >
          過去 →
        </Button>
      </Stack>
    </>
  );
}
