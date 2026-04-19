const fs = require("fs");
const path = require("path");
const { LiveDataClient } = require("./live_data");

class DayCloseRecorder {
  constructor({
    xu100Code = "XU100",
    viopCode = "F_XU0300426",
    outputFile = path.resolve(__dirname, "../data/dayclose-history.json"),
    tempDir = path.resolve(__dirname, "../data/tmp"),
    liveDataClient = null,
  } = {}) {
    this.xu100Code = xu100Code;
    this.viopCode = viopCode;
    this.outputFile = outputFile;
    this.tempDir = tempDir;

    this.liveDataClient =
      liveDataClient ||
      new LiveDataClient({
        sources: [
          {
            name: "dlyd",
            brokerUrl: "wss://dltest.radix.matriksdata.com:443/market",
            subscriptions: [`mx/symbol/${this.xu100Code}@lvl2`],
          },
          {
            name: "real",
            brokerUrl: "wss://rttest.radix.matriksdata.com:443/market",
            subscriptions: [`mx/derivative/${this.viopCode}`],
          },
        ],
      });

    this.pollTimer = null;
    this.windowTimer = null;
    this.finalizeTimer = null;
  }

  async start() {
    fs.mkdirSync(this.tempDir, { recursive: true });

    await this.liveDataClient.start();

    this._scheduleWindowStart();
    this._scheduleFinalize();
  }

  async stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.windowTimer) {
      clearTimeout(this.windowTimer);
      this.windowTimer = null;
    }

    if (this.finalizeTimer) {
      clearTimeout(this.finalizeTimer);
      this.finalizeTimer = null;
    }

    await this.liveDataClient.stop();
  }

  _scheduleWindowStart() {
    const now = new Date();
    const nextStart = this._buildTurkeyDate(2, 55, 0);

    if (now >= nextStart) {
      nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    }

    const delay = nextStart.getTime() - now.getTime();

    this.windowTimer = setTimeout(() => {
      this._resetTodaySampleFile();
      this._startPollingWindow();
      this._scheduleWindowStart();
    }, delay);
  }

  _startPollingWindow() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.pollTimer = setInterval(() => {
      const turkeyNow = this._getTurkeyParts(new Date());

      if (turkeyNow.time < "02:55:00" || turkeyNow.time > "03:00:00") {
        return;
      }

      this._captureSymbol(this.xu100Code, turkeyNow);
      this._captureSymbol(this.viopCode, turkeyNow);
    }, 3000);

    const stopAt = this._buildTurkeyDate(3, 0, 0);
    const stopDelay = stopAt.getTime() - Date.now();

    setTimeout(() => {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }, Math.max(stopDelay, 0));
  }

  _captureSymbol(symbolCode, turkeyNow) {
    const latest = this.liveDataClient.getLatest(symbolCode);
    if (!latest) {
      return;
    }

    const dayClose = Number(latest.dayClose);
    if (!Number.isFinite(dayClose) || dayClose <= 0) {
      return;
    }

    const sample = {
      symbolCode,
      date: turkeyNow.date,
      time: turkeyNow.time,
      updateDate: latest.updateDate || null,
      dayClose,
      last: Number(latest.last),
      bid: Number(latest.bid),
      ask: Number(latest.ask),
      capturedAt: new Date().toISOString(),
    };

    fs.appendFileSync(this._getSampleFilePath(turkeyNow.date), `${JSON.stringify(sample)}\n`, "utf8");
  }

  _scheduleFinalize() {
    const now = new Date();
    const nextFinalize = this._buildTurkeyDate(3, 0, 0);

    if (now >= nextFinalize) {
      nextFinalize.setUTCDate(nextFinalize.getUTCDate() + 1);
    }

    const delay = nextFinalize.getTime() - now.getTime();

    this.finalizeTimer = setTimeout(() => {
      try {
        this.finalizeToday();
      } catch (error) {
        console.error("Finalize hatasi:", error.message);
      } finally {
        this._cleanupTempFiles();
        this._scheduleFinalize();
      }
    }, delay);
  }

  finalizeToday(date = null) {
    const turkeyDate = date || this._getTurkeyParts(new Date()).date;
    const samples = this._readJsonLines(this._getSampleFilePath(turkeyDate));

    const xu100Record = this._pickClosingRecord(samples, this.xu100Code, turkeyDate);
    const viopRecord = this._pickClosingRecord(samples, this.viopCode, turkeyDate);

    const data = this._loadMainJson();

    if (!Array.isArray(data[this.xu100Code])) {
      data[this.xu100Code] = [];
    }

    if (!Array.isArray(data[this.viopCode])) {
      data[this.viopCode] = [];
    }

    if (xu100Record) {
      this._upsertDailyRecord(data[this.xu100Code], turkeyDate, xu100Record.dayClose);
    }

    if (viopRecord) {
      this._upsertDailyRecord(data[this.viopCode], turkeyDate, viopRecord.dayClose);
    }

    data.updatedAt = this._getTurkeyIsoString();
    this._writeMainJson(data);

    console.log("Gun sonu kaydi alindi:", {
      [this.xu100Code]: xu100Record ? { date: turkeyDate, dayClose: xu100Record.dayClose } : null,
      [this.viopCode]: viopRecord ? { date: turkeyDate, dayClose: viopRecord.dayClose } : null,
      updatedAt: data.updatedAt,
    });
  }

  _pickClosingRecord(samples, symbolCode, date) {
    const filtered = samples.filter((item) => {
      return (
        item &&
        item.symbolCode === symbolCode &&
        item.date === date &&
        item.time >= "02:55:00" &&
        item.time <= "03:00:00" &&
        Number(item.dayClose) > 0
      );
    });

    if (!filtered.length) {
      return null;
    }

    return filtered[filtered.length - 1];
  }

  _upsertDailyRecord(list, date, dayClose) {
    const index = list.findIndex((item) => item && item.date === date);

    if (index >= 0) {
      list[index].dayClose = dayClose;
      return;
    }

    list.push({ date, dayClose });
  }

  _loadMainJson() {
    if (!fs.existsSync(this.outputFile)) {
      return {
        [this.xu100Code]: [],
        [this.viopCode]: [],
        updatedAt: null,
      };
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(this.outputFile, "utf8"));

      return {
        ...parsed,
        [this.xu100Code]: Array.isArray(parsed[this.xu100Code]) ? parsed[this.xu100Code] : [],
        [this.viopCode]: Array.isArray(parsed[this.viopCode]) ? parsed[this.viopCode] : [],
      };
    } catch (error) {
      console.error("Ana JSON okunamadi:", error.message);
      return {
        [this.xu100Code]: [],
        [this.viopCode]: [],
        updatedAt: null,
      };
    }
  }

  _writeMainJson(data) {
    fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2), "utf8");
  }

  _getSampleFilePath(date) {
    return path.join(this.tempDir, `samples-${date}.jsonl`);
  }

  _resetTodaySampleFile() {
    const today = this._getTurkeyParts(new Date()).date;
    fs.writeFileSync(this._getSampleFilePath(today), "", "utf8");
  }

  _readJsonLines(filePath) {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, "utf8").trim();
    if (!content) {
      return [];
    }

    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  _cleanupTempFiles() {
    if (!fs.existsSync(this.tempDir)) {
      return;
    }

    const files = fs.readdirSync(this.tempDir);

    for (const file of files) {
      const fullPath = path.join(this.tempDir, file);
      const stats = fs.statSync(fullPath);
      const ageMs = Date.now() - stats.mtimeMs;

      if (ageMs > 2 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(fullPath);
      }
    }
  }

  _getTurkeyParts(date) {
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const formatted = formatter.format(date).replace(" ", "T");
    const [day, time] = formatted.split("T");

    return { date: day, time };
  }

  _getTurkeyIsoString() {
    const parts = this._getTurkeyParts(new Date());
    return `${parts.date}T${parts.time}+03:00`;
  }

  _buildTurkeyDate(hour, minute, second) {
    const parts = this._getTurkeyParts(new Date());
    return new Date(`${parts.date}T${this._pad(hour)}:${this._pad(minute)}:${this._pad(second)}+03:00`);
  }

  _pad(value) {
    return String(value).padStart(2, "0");
  }
}

module.exports = {
  DayCloseRecorder,
};
