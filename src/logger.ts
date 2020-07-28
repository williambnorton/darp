/** @module logger Basic logger, which can be extended to log into ElasticSearch */

export enum LogLevel {
    DEBUG = 1,
    INFO = 2,
    WARNING = 3,
    ERROR = 4,
    CRITICAL = 5,
}

enum LogTimezone {
    Local,
    PDT,
    UTC,
}

class Logger {
    logLevel: LogLevel;
    logTimezone: LogTimezone;

    constructor() {
        this.logLevel = LogLevel.DEBUG; // default level if env variable LOG_LEVEL is not available
        this.setLevel(); // checks if env variable LOG_LEVEL is available and sets the level accordingly
        this.logTimezone = LogTimezone.PDT;
    }

    setLevel(logLevel?: LogLevel) {
        let logLevelEnv = process.env.LOG_LEVEL;
        if (logLevel !== undefined) {
            this.logLevel = logLevel;
        } else if (logLevelEnv !== undefined && logLevelEnv in LogLevel) {
            //@ts-ignore
            this.logLevel = LogLevel[logLevelEnv]; // enum does support dict mapping as well
        }
    }

    log(message: string, messageLevel: number) {
        return;  //Vytas - quick test - I had a hard time adjusting level
        const now = new Date(Date.now());
        let timestamp: string;
        if (this.logTimezone === LogTimezone.UTC) {
            timestamp = now.toLocaleString("en-US", { timeZone: "UTC" });
        } else if (this.logTimezone === LogTimezone.PDT) {
            timestamp = now.toLocaleString("en-US", {
                timeZone: "America/Los_Angeles",
            });
        } else {
            timestamp = now.toLocaleString("en-US");
        }
        console.log(`${timestamp} - ${LogLevel[messageLevel]} - ${message}`); // enum supports reverse mapping
    }

    debug(message: string) {
        if (this.logLevel == LogLevel.DEBUG) {
            this.log(message, LogLevel.DEBUG);
        }
    }

    info(message: string) {
        if (this.logLevel <= LogLevel.INFO) {
            this.log(message, LogLevel.INFO);
        }
    }

    warning(message: string) {
        if (this.logLevel <= LogLevel.WARNING) {
            this.log(message, LogLevel.WARNING);
        }
    }

    error(message: string) {
        if (this.logLevel <= LogLevel.ERROR) {
            this.log(message, LogLevel.ERROR);
        }
    }

    critical(message: string) {
        if (this.logLevel <= LogLevel.CRITICAL) {
            this.log(message, LogLevel.CRITICAL);
        }
    }
}

// instantiate with new to make logger class into a singleton
export const logger = new Logger();
