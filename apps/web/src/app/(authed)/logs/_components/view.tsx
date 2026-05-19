"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";

type LogLine = {
  time: number;
  level: number;
  msg: string;
  mod?: string;
};

const MAX_LINES = 500;

export function LogsView() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const es = new EventSource("/logs/stream");
    es.onmessage = (e) => {
      try {
        const obj = JSON.parse(e.data) as LogLine;
        setLines((prev) => {
          const next = [...prev, obj];
          return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
        });
      } catch {
        // pino JSON 以外は無視
      }
    };
    return () => es.close();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: lines 更新ごとに末尾へ
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        ログ
      </Typography>
      <Box
        ref={ref}
        component="pre"
        sx={{
          height: "calc(100vh - 200px)",
          overflow: "auto",
          fontFamily: "monospace",
          fontSize: 12,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          p: 2,
          m: 0,
        }}
      >
        {lines.length === 0
          ? "(ログなし)"
          : lines.map((l, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: time だけだと重複
              <div key={`${l.time}-${i}`}>
                {formatTime(l.time)} {levelLabel(l.level)}{" "}
                {l.mod ? `[${l.mod}] ` : ""}
                {l.msg}
              </div>
            ))}
      </Box>
    </Box>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTime(t: number): string {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function levelLabel(level: number): string {
  if (level >= 60) return "FATAL";
  if (level >= 50) return "ERROR";
  if (level >= 40) return "WARN ";
  if (level >= 30) return "INFO ";
  if (level >= 20) return "DEBUG";
  return "TRACE";
}
