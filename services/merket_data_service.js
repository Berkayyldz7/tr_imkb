const mqtt = require("mqtt");
const pb = require("protobufjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

class MarketDataService {
  constructor() {
    this.symbolMessage = pb
      .loadSync(path.resolve(__dirname, "./proto/Symbol.proto"))
      .lookupType("messages.SymbolMessage");

    this.derivativeMessage = pb
      .loadSync(path.resolve(__dirname, "./proto/Derivative.proto"))
      .lookupType("messages.DerivativeMessage");

    this.state = {
      bist: null,
      bistTime: null,
      fxu: null,
      fxuTime: null,
    };

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

    this.bistClient = null;
    this.fxuClient = null;
    this.debugTimer = null;
  }

  start() {
    this.bistClient = mqtt.connect("wss://dltest.radix.matriksdata.com:443/market", this.options);
    this.fxuClient = mqtt.connect("wss://rttest.radix.matriksdata.com:443/market", this.options);

    this.bistClient.on("connect", () => {
      console.log("BIST socket baglandi");

      this.bistClient.subscribe("mx/symbol/XU100@lvl2", (error) => {
        if (error) {
          console.error("BIST subscribe hatasi:", error.message);
        }
      });
    });

    this.fxuClient.on("connect", () => {
      console.log("FXU socket baglandi");

      this.fxuClient.subscribe(`mx/derivative/${process.env.VIOP_SOZLESME}`, (error) => {
        if (error) {
          console.error("FXU subscribe hatasi:", error.message);
        }
      });
    });

    this.bistClient.on("message", (topic, payload) => {
      try {
        const decoded = this.symbolMessage.decode(payload);

        this.state.bist = this.symbolMessage.toObject(decoded, {
          longs: Number,
          enums: String,
          defaults: true,
        });

        this.state.bistTime = Date.now();
      } catch (error) {
        console.error("BIST decode hatasi:", error.message);
      }
    });

    this.fxuClient.on("message", (topic, payload) => {
      try {
        const decoded = this.derivativeMessage.decode(payload);

        this.state.fxu = this.derivativeMessage.toObject(decoded, {
          longs: Number,
          enums: String,
          defaults: true,
        });

        this.state.fxuTime = Date.now();
      } catch (error) {
        console.error("FXU decode hatasi:", error.message);
      }
    });

    this.bistClient.on("error", (error) => {
      console.error("BIST socket hatasi:", error.message);
    });

    this.fxuClient.on("error", (error) => {
      console.error("FXU socket hatasi:", error.message);
    });

    // this.debugTimer = setInterval(() => {
    //   if (!this.state.bist || !this.state.fxu) {
    //     return;
    //   }

    //   const bistLive = this.isFresh(this.state.bistTime);
    //   const fxuLive = this.isFresh(this.state.fxuTime);

    //   if (!bistLive || !fxuLive) {
    //     return;
    //   }

    //   console.log("BIST snapshot:", this.state.bist);
    //   console.log("FXU snapshot:", this.state.fxu);
    // }, 1000);
  }

  getBistSnapshot() {
    return this.state.bist;
  }

  getFxuSnapshot() {
    return this.state.fxu;
  }

  getAllSnapshots() {
    return {
      bist: this.state.bist,
      bistTime: this.state.bistTime,
      fxu: this.state.fxu,
      fxuTime: this.state.fxuTime,
    };
  }

  getBistSnapshotWithTime() {
    if (!this.state.bist) return null;

  return {
    data: this.state.bist,
    receivedAt: this.state.bistTime,
    marketTime: this.state.bist.updateDate
    };
  }
  
  getFxuSnapshotWithTime() {  
    if (!this.state.fxu) return null;

  return {
    data: this.state.fxu,
    receivedAt: this.state.fxuTime,
    marketTime: this.state.fxu.updateDate
    };
  }

  getViopSettlementPrice() {
    if (!this.state.fxu) return null;
    return this.state.fxu.settlement
  }

  getBistClosePrice(){
    if (!this.state.bist) return null;
    return this.state.bist.dayClose
  }

  isFresh(ts, maxAgeMs = 10000) {
    if (!ts) return false;
    return Date.now() - ts < maxAgeMs;
  }
}

module.exports = {
  MarketDataService,
};
