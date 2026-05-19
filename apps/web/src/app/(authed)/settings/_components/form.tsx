"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState, useEffect, useState } from "react";
import { updateSettings } from "../_actions";

export function SettingsForm({ defaultName }: { defaultName: string }) {
  const [result, dispatch, isPending] = useActionState(updateSettings, {});
  const [name, setName] = useState(defaultName);
  const [snackOpen, setSnackOpen] = useState(false);
  const nameError = result.validationErrors?.name?._errors?.[0];

  useEffect(() => {
    if (result.data?.ok) setSnackOpen(true);
  }, [result]);

  return (
    <form action={dispatch}>
      <Stack spacing={2}>
        <TextField
          name="name"
          label="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          slotProps={{
            htmlInput: { maxLength: 100, required: false },
          }}
          error={!!nameError}
          helperText={nameError}
          fullWidth
        />
        <Box>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? "保存中…" : "保存"}
          </Button>
        </Box>
        {result.serverError && (
          <Alert severity="error">{result.serverError}</Alert>
        )}
      </Stack>
      <Snackbar open={snackOpen} onClose={() => setSnackOpen(false)}>
        <Alert severity="success" onClose={() => setSnackOpen(false)}>
          保存しました
        </Alert>
      </Snackbar>
    </form>
  );
}
