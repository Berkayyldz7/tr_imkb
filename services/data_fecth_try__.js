const mqtt = require("mqtt");
const pb = require("protobufjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const BIST_URL = "wss://dltest.radix.matriksdata.com:443/market";
const VIOP_URL = "wss://rttest.radix.matriksdata.com:443/market";

class LiveMarketReader {
  constructor({
    bistCode = "XU100",
    viopCode = process.env.VIOP_SOZLESME,
    timeoutMs = 10000,
  } = {}) {
    if (!viopCode) {
      throw new Error("VIOP_SOZLESME .env icinde tanimli olmali.");
    }

    this.bistCode = bistCode;
    this.viopCode = viopCode;
    this.timeoutMs = timeoutMs;

    this.bistWaiters = [];
    this.viopWaiters = [];

    this.bistClient = null;
    this.viopClient = null;
    this.started = false;

    this.options = {
      reconnectPeriod: 3000,
      connectTimeout: 5000,
      keepalive: 60,
      username: "JWT",
      password: process.env.PWDd,
      rejectUnauthorized: false,
      qos: 0,
      protocolVersion: 3,
      protocolId: "MQIsdp",
    };

    this.symbolMessage = pb
      .loadSync(path.resolve(__dirname, "./proto/Symbol.proto"))
      .lookupType("messages.SymbolMessage");

    this.derivativeMessage = pb
      .loadSync(path.resolve(__dirname, "./proto/Derivative.proto"))
      .lookupType("messages.DerivativeMessage");
  }

  async start() {
    if (this.started) {
      return;
    }

    await Promise.all([
      this._connectBist(),
      this._connectViop(),
    ]);

    this.started = true;
  }

  async stop() {
    const closers = [];

    if (this.bistClient) {
      const client = this.bistClient;
      this.bistClient = null;
      closers.push(new Promise((resolve) => client.end(false, {}, resolve)));
    }

    if (this.viopClient) {
      const client = this.viopClient;
      this.viopClient = null;
      closers.push(new Promise((resolve) => client.end(false, {}, resolve)));
    }

    await Promise.all(closers);
    this.started = false;
  }

  async getBist100Data({ timeoutMs = this.timeoutMs } = {}) {
    return this._waitForNextData(this.bistWaiters, timeoutMs, "BIST100 veri zaman asimi.");
  }

  async getFxu030Data({ timeoutMs = this.timeoutMs } = {}) {
    return this._waitForNextData(this.viopWaiters, timeoutMs, "FXU030 veri zaman asimi.");
  }

  _waitForNextData(waiters, timeoutMs, timeoutMessage) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = waiters.findIndex((item) => item.resolve === resolve);
        if (index >= 0) {
          waiters.splice(index, 1);
        }

        reject(new Error(timeoutMessage));
      }, timeoutMs);

      waiters.push({
        resolve: (data) => {
          clearTimeout(timer);
          resolve(data);
        },
      });
    });
  }

  _resolveWaiters(waiters, data) {
    if (!waiters.length) {
      return;
    }

    const pending = waiters.splice(0, waiters.length);

    for (const waiter of pending) {
      waiter.resolve(data);
    }
  }

  _connectBist() {
    return new Promise((resolve, reject) => {
      const client = mqtt.connect(BIST_URL, this.options);
      this.bistClient = client;

      let settled = false;

      const subscribe = () => {
        client.subscribe(`mx/symbol/${this.bistCode}@lvl2`, (error, granted) => {
          if (error) {
            if (!settled) {
              settled = true;
              reject(error);
            }
            return;
          }

          if (!granted || !granted.length) {
            if (!settled) {
              settled = true;
              reject(new Error("BIST100 subscribe onayi alinmadi."));
            }
            return;
          }

          if (!settled) {
            settled = true;
            resolve();
          }
        });
      };

      client.on("connect", subscribe);

      client.on("message", (topic, payload) => {
        if (!topic.includes("mx/symbol")) {
          return;
        }

        try {
          const decoded = this.symbolMessage.decode(payload);

          if (decoded.symbolCode !== this.bistCode) {
            return;
          }

          this._resolveWaiters(this.bistWaiters, {
            topic,
            receivedAt: new Date().toISOString(),
            raw: decoded,
          });
        } catch (error) {
          console.error("BIST100 decode hatasi:", error.message);
        }
      });

      client.on("error", (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        } else {
          console.error("BIST100 socket hatasi:", error.message);
        }
      });
    });
  }

  _connectViop() {
    return new Promise((resolve, reject) => {
      const client = mqtt.connect(VIOP_URL, this.options);
      this.viopClient = client;

      let settled = false;

      const subscribe = () => {
        client.subscribe(`mx/derivative/${this.viopCode}`, (error, granted) => {
          if (error) {
            if (!settled) {
              settled = true;
              reject(error);
            }
            return;
          }

          if (!granted || !granted.length) {
            if (!settled) {
              settled = true;
              reject(new Error("FXU030 subscribe onayi alinmadi."));
            }
            return;
          }

          if (!settled) {
            settled = true;
            resolve();
          }
        });
      };

      client.on("connect", subscribe);

      client.on("message", (topic, payload) => {
        if (!topic.includes("mx/derivative")) {
          return;
        }

        try {
          const decoded = this.derivativeMessage.decode(payload);

          if (decoded.symbolCode !== this.viopCode) {
            return;
          }

          this._resolveWaiters(this.viopWaiters, {
            topic,
            receivedAt: new Date().toISOString(),
            raw: decoded,
          });
        } catch (error) {
          console.error("FXU030 decode hatasi:", error.message);
        }
      });

      client.on("error", (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        } else {
          console.error("FXU030 socket hatasi:", error.message);
        }
      });
    });
  }
}

module.exports = {
  LiveMarketReader,
};
