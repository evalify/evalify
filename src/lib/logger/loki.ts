import 'server-only';
import { createLogger, transports, format } from "winston";
import LokiTransport from "winston-loki";

const loki_url = process.env.LOKI_URL;

let logger;

if (loki_url && process.env.NODE_ENV !== "production") {
  logger = createLogger({
    level: "info",
    format: format.json(),
    transports: [
      new LokiTransport({
        host: loki_url,
        labels: { app: "evalify" },
        json: true,
        batching: true,
      }),
      new transports.Console(),
    ],
  });
} else {
  logger = createLogger({
    level: "info",
    format: format.json(),
    transports: [
      new transports.Console(),
    ],
  });
  console.warn("LOKI_URL environment variable is not set, using console transport only");
}

export default logger;
