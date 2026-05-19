"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useState, useTransition } from "react";
import { grantUser } from "../_actions";

export type UserRow = {
  id: number;
  name: string | null;
  subPrefix: string;
  grantedAt: string | null;
  grantedBy: string | null;
  isSelf: boolean;
};

export function UsersTable({ rows }: { rows: UserRow[] }) {
  const [target, setTarget] = useState<UserRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConfirm = () => {
    if (!target) return;
    const userId = target.id;
    startTransition(async () => {
      setError(null);
      const result = await grantUser({ userId });
      if (result?.serverError) {
        setError(result.serverError);
        return;
      }
      if (result?.validationErrors) {
        setError("入力値が不正です");
        return;
      }
      setSuccess(true);
      setTarget(null);
    });
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="small" aria-label="users">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>名前</TableCell>
              <TableCell>Cognito sub</TableCell>
              <TableCell>状態</TableCell>
              <TableCell>付与者</TableCell>
              <TableCell>付与日時</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.id}</TableCell>
                <TableCell>
                  {row.name ?? "—"}
                  {row.isSelf && (
                    <Chip
                      label="自分"
                      size="small"
                      sx={{ ml: 1 }}
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>
                  {row.subPrefix}…
                </TableCell>
                <TableCell>
                  {row.grantedAt ? (
                    <Chip label="承認済" color="success" size="small" />
                  ) : (
                    <Chip label="承認待ち" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>{row.grantedBy ?? "—"}</TableCell>
                <TableCell>{row.grantedAt ?? "—"}</TableCell>
                <TableCell align="right">
                  {!row.grantedAt && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => setTarget(row)}
                      disabled={pending}
                    >
                      権限付与
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  ユーザーがいません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={target !== null}
        onClose={() => !pending && setTarget(null)}
      >
        <DialogTitle>権限を付与しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {target?.name ?? `#${target?.id}`}{" "}
            に管理画面へのアクセス権限を付与します。
          </DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)} disabled={pending}>
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={pending}
          >
            {pending ? "付与中…" : "付与する"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          権限を付与しました
        </Alert>
      </Snackbar>
    </>
  );
}
