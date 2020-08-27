"use strict";
/** @module logger Basic logger, which can be extended to log into ElasticSearch */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 1] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARNING"] = 3] = "WARNING";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["CRITICAL"] = 5] = "CRITICAL";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
var LogTimezone;
(function (LogTimezone) {
    LogTimezone[LogTimezone["Local"] = 0] = "Local";
    LogTimezone[LogTimezone["PDT"] = 1] = "PDT";
    LogTimezone[LogTimezone["UTC"] = 2] = "UTC";
})(LogTimezone || (LogTimezone = {}));
var Logger = /** @class */ (function () {
    function Logger() {
        this.logLevel = LogLevel.DEBUG; // default level if env variable LOG_LEVEL is not available
        this.setLevel(); // checks if env variable LOG_LEVEL is available and sets the level accordingly
        this.logTimezone = LogTimezone.PDT;
    }
    Logger.prototype.setLevel = function (logLevel) {
        var logLevelEnv = process.env.LOG_LEVEL;
        if (logLevel !== undefined) {
            this.logLevel = logLevel;
        }
        else if (logLevelEnv !== undefined && logLevelEnv in LogLevel) {
            //@ts-ignore
            this.logLevel = LogLevel[logLevelEnv]; // enum does support dict mapping as well
        }
    };
    Logger.prototype.log = function (message, messageLevel) {
        var now = new Date(Date.now());
        var timestamp;
        if (this.logTimezone === LogTimezone.UTC) {
            timestamp = now.toLocaleString("en-US", { timeZone: "UTC" });
        }
        else if (this.logTimezone === LogTimezone.PDT) {
            timestamp = now.toLocaleString("en-US", {
                timeZone: "America/Los_Angeles",
            });
        }
        else {
            timestamp = now.toLocaleString("en-US");
        }
        console.log(timestamp + " - " + LogLevel[messageLevel] + " - " + message); // enum supports reverse mapping
    };
    Logger.prototype.debug = function (message) {
        if (this.logLevel == LogLevel.DEBUG) {
            this.log(message, LogLevel.DEBUG);
        }
    };
    Logger.prototype.info = function (message) {
        if (this.logLevel <= LogLevel.INFO) {
            this.log(message, LogLevel.INFO);
        }
    };
    Logger.prototype.warning = function (message) {
        if (this.logLevel <= LogLevel.WARNING) {
            this.log(message, LogLevel.WARNING);
        }
    };
    Logger.prototype.error = function (message) {
        if (this.logLevel <= LogLevel.ERROR) {
            this.log(message, LogLevel.ERROR);
        }
    };
    Logger.prototype.critical = function (message) {
        if (this.logLevel <= LogLevel.CRITICAL) {
            this.log(message, LogLevel.CRITICAL);
        }
    };
    return Logger;
}());
// instantiate with new to make logger class into a singleton
exports.logger = new Logger();
