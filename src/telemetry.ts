import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export interface SdkTelemetryOptions {
  disabled?: boolean;
  deviceId?: string;
  storagePath?: string;
}

export interface SdkTelemetry {
  readonly enabled: boolean;
  readonly deviceId?: string;
  readonly initializationPending: boolean;
  headers(): Record<string, string>;
  markInitialized(): void;
}

interface TelemetryState {
  deviceId?: string;
  initializedAt?: string;
}

export function createSdkTelemetry(options: SdkTelemetryOptions = {}): SdkTelemetry {
  const disabled = options.disabled === true || process.env.ENGAGELAB_EMAIL_TELEMETRY_DISABLED === "1";
  if (disabled) {
    return {
      enabled: false,
      initializationPending: false,
      headers: () => ({}),
      markInitialized: () => undefined,
    };
  }

  const storagePath = options.storagePath || process.env.ENGAGELAB_EMAIL_TELEMETRY_FILE || defaultStoragePath();
  const state = readState(storagePath);
  const deviceId = options.deviceId || state.deviceId || randomUUID();
  if (deviceId !== state.deviceId) {
    writeState(storagePath, { ...state, deviceId });
  }

  let initializationPending = !state.initializedAt;
  return {
    enabled: true,
    deviceId,
    get initializationPending() {
      return initializationPending;
    },
    headers: () => ({
      "X-EngageLab-SDK-Device-ID": deviceId,
      ...(initializationPending ? { "X-EngageLab-SDK-Init": "1" } : {}),
    }),
    markInitialized: () => {
      if (!initializationPending) return;
      initializationPending = false;
      writeState(storagePath, { deviceId, initializedAt: new Date().toISOString() });
    },
  };
}

function defaultStoragePath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(configHome, "engagelab-email", "telemetry.json");
}

function readState(storagePath: string): TelemetryState {
  try {
    const state = JSON.parse(readFileSync(storagePath, "utf8")) as TelemetryState;
    return state && typeof state === "object" ? state : {};
  } catch {
    return {};
  }
}

function writeState(storagePath: string, state: TelemetryState): void {
  try {
    mkdirSync(dirname(storagePath), { recursive: true, mode: 0o700 });
    writeFileSync(storagePath, `${JSON.stringify(state)}\n`, { encoding: "utf8", mode: 0o600 });
  } catch {
    // Telemetry is best effort and must never affect an email request.
  }
}
