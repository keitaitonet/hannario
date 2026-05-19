"use client";

import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useActionState, useEffect, useMemo, useState } from "react";
import { sendMessage } from "../_actions";
import type { RecentDestination } from "../_data";

type Destination = { channelId: string; threadId: string };

type Option = RecentDestination & {
  key: string;
  label: string;
};

const EMPTY_DESTINATION: Destination = { channelId: "", threadId: "" };

function toOption(d: RecentDestination): Option {
  const channelLabel = d.channelName ? `#${d.channelName}` : d.channelId;
  const threadLabel = d.threadId ? ` › ${d.threadName ?? d.threadId}` : "";
  return {
    ...d,
    key: `${d.channelId}:${d.threadId ?? ""}`,
    label: `${channelLabel}${threadLabel}`,
  };
}

export function SendForm({
  recentDestinations,
}: {
  recentDestinations: RecentDestination[];
}) {
  const [result, dispatch, isPending] = useActionState(sendMessage, {});
  const [snackOpen, setSnackOpen] = useState(false);
  const [manualMode, setManualMode] = useState(recentDestinations.length === 0);
  const [selected, setSelected] = useState<Option | null>(null);
  const [destination, setDestination] =
    useState<Destination>(EMPTY_DESTINATION);
  const [content, setContent] = useState("");

  const options = useMemo(
    () => recentDestinations.map(toOption),
    [recentDestinations],
  );

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

  const channelId = manualMode
    ? destination.channelId
    : (selected?.channelId ?? "");
  const threadId = manualMode
    ? destination.threadId
    : (selected?.threadId ?? "");

  return (
    <form action={dispatch}>
      <input type="hidden" name="channelId" value={channelId} />
      <input type="hidden" name="threadId" value={threadId} />
      <Stack spacing={2}>
        {manualMode ? (
          <>
            <TextField
              label="チャンネル ID"
              value={destination.channelId}
              onChange={(e) =>
                setDestination((d) => ({ ...d, channelId: e.target.value }))
              }
              required
              slotProps={{ htmlInput: { required: false } }}
              error={!!channelIdError}
              helperText={channelIdError ?? "送信先チャンネルの Discord ID"}
              fullWidth
            />
            <TextField
              label="スレッド ID (任意)"
              value={destination.threadId}
              onChange={(e) =>
                setDestination((d) => ({ ...d, threadId: e.target.value }))
              }
              error={!!threadIdError}
              helperText={threadIdError ?? "指定するとスレッド宛に送信されます"}
              fullWidth
            />
            {recentDestinations.length > 0 && (
              <Box>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => {
                    setManualMode(false);
                    setDestination(EMPTY_DESTINATION);
                  }}
                >
                  最近の宛先から選ぶ
                </Link>
              </Box>
            )}
          </>
        ) : (
          <>
            <Autocomplete
              options={options}
              value={selected}
              onChange={(_, value) => setSelected(value)}
              getOptionLabel={(option) => option.label}
              getOptionKey={(option) => option.key}
              isOptionEqualToValue={(option, value) => option.key === value.key}
              renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                  <li key={key} {...rest}>
                    <Stack>
                      <Typography variant="body2">{option.label}</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {option.channelId}
                        {option.threadId ? ` / ${option.threadId}` : ""}
                      </Typography>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="宛先"
                  required
                  slotProps={{
                    ...params.slotProps,
                    htmlInput: {
                      ...params.slotProps.htmlInput,
                      required: false,
                    },
                  }}
                  error={!!channelIdError || !!threadIdError}
                  helperText={
                    channelIdError ??
                    threadIdError ??
                    "最近送信したチャンネル / スレッドから選択"
                  }
                />
              )}
              fullWidth
            />
            <Box>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => {
                  setManualMode(true);
                  setSelected(null);
                }}
              >
                宛先を手動で入力する
              </Link>
            </Box>
          </>
        )}
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
