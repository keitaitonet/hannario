"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState, useEffect, useState } from "react";
import { sendMessage } from "../_actions";

export function SendForm() {
  const [result, dispatch, isPending] = useActionState(sendMessage, {});
  const [snackOpen, setSnackOpen] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [threadId, setThreadId] = useState("");
  const [content, setContent] = useState("");

  const errors = result.validationErrors;
  const channelIdError = errors?.channelId?._errors?.[0];
  const threadIdError = errors?.threadId?._errors?.[0];
  const contentError = errors?.content?._errors?.[0];

  useEffect(() => {
    if (result.data?.ok) {
      setSnackOpen(true);
      setContent("");
    }
  }, [result]);

  return (
    <form action={dispatch}>
      <Stack spacing={2}>
        <TextField
          name="channelId"
          label="チャンネル ID"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          required
          slotProps={{ htmlInput: { required: false } }}
          error={!!channelIdError}
          helperText={channelIdError ?? "送信先チャンネルの Discord ID"}
          fullWidth
        />
        <TextField
          name="threadId"
          label="スレッド ID (任意)"
          value={threadId}
          onChange={(e) => setThreadId(e.target.value)}
          error={!!threadIdError}
          helperText={threadIdError ?? "指定するとスレッド宛に送信されます"}
          fullWidth
        />
        <TextField
          name="content"
          label="本文"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          multiline
          minRows={4}
          slotProps={{
            htmlInput: { maxLength: 2000, required: false },
          }}
          error={!!contentError}
          helperText={contentError ?? "最大 2000 文字"}
          fullWidth
        />
        <Box>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? "送信中…" : "送信"}
          </Button>
        </Box>
        {result.serverError && (
          <Alert severity="error">{result.serverError}</Alert>
        )}
      </Stack>
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
      >
        <Alert severity="success" onClose={() => setSnackOpen(false)}>
          送信キューに投入しました
        </Alert>
      </Snackbar>
    </form>
  );
}
