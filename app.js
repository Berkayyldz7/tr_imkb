// const { MarketDataService } = require("./services/merket_data_service");
// const { FxuSettlementRecorder } = require("./services/fxu_settlement_recorder");
// const { SettlementAverage } = require("./services/SettlementAverage");

// const fs = require("fs");

// const marketData = new MarketDataService();
// const settlementAverage = new SettlementAverage();

// try {
//   const text = fs.readFileSync("./data/fxu-settlements.json", "utf8");
//   const rows = JSON.parse(text);
//   settlementAverage.init(rows);
// } catch (error) {
//   settlementAverage.init([]);
// }

// marketData.start();

// const recorder = new FxuSettlementRecorder(marketData, settlementAverage, {
//   intervalMs: 200,
//   outputFile: "./data/fxu-settlements.json",
// });

// recorder.start();

// setInterval(() => {
//   const bist = marketData.getBistSnapshot();
//   const fxu = marketData.getFxuSnapshot();

//   const fxu_settlement = marketData.getViopSettlementPrice();
//   const bist_close = marketData.getBistClosePrice();

//   const avg5 = settlementAverage.getAverage5();

//   if (!bist || !fxu) {
//     console.log("BIST veya FXU verisi henüz alınamadı, bekleniyor...");
//     return;
//   }

//   console.log("BIST last:", bist.last);
//   console.log("FXU last:", fxu.last);
//   console.log("FXU settlement price:", fxu_settlement);
//   console.log("BIST close price:", bist_close);

//   console.log("FXU settlement 5 günlük ortalama:", avg5);

//   // Strateji kosullari burada yazilacak
//   // if (bist.last > bist.dayClose && fxu.last > fxu.dayClose) {
//   //   emir gonder
//   // }


//   // fxu_settlement_ortalama ( avg5 ) al ( 5 günlük )
//   // kontratın son fiyatını al ( fxu.last )

//   // eğer kontratın son fiyatı fxu_settlement_ortalamalarının üstündeyse ve mevcut pozisyon yoksa 1 adet long emir ( viopbuyorder ) aç
//     // Eğer mevcut pozisyon var ve yönü short ise önce kapat sonra long aç ( 2 adet  long emir )

//   // eğer kontratın son fiyatı fxu_settlement_ortalamalarının altındaysa ve mevcut pozisyon yoksa short emir aç ( 1 adet )
//     // Eğer mevcut pozisyon var ve yönü long ise önce kapat sonra short ( viopsellorder ) aç ( 2 adet emir )

  



// }, 1000);


// const { MarketDataService } = require("./services/merket_data_service");
// const { FxuSettlementRecorder } = require("./services/fxu_settlement_recorder");
// const { SettlementAverage } = require("./services/SettlementAverage");
// const { MeksaApi } = require("./services/api_engine");

// const fs = require("fs");

// const marketData = new MarketDataService();
// const settlementAverage = new SettlementAverage();

// const api = new MeksaApi({
//   customerNo: process.env.CUSTOMER_NO,
//   token: process.env.TOKEN,
// });

// try {
//   const text = fs.readFileSync("./data/fxu-settlements.json", "utf8");
//   const rows = JSON.parse(text);
//   settlementAverage.init(rows);
// } catch (error) {
//   settlementAverage.init([]);
// }

// marketData.start();

// const recorder = new FxuSettlementRecorder(marketData, settlementAverage, {
//   intervalMs: 10000,
//   outputFile: "./data/fxu-settlements.json",
// });

// recorder.start();

// let isTradeRunning = false;

// setInterval(async () => {
//   if (isTradeRunning) return;

//   const bist = marketData.getBistSnapshot();
//   const fxu = marketData.getFxuSnapshot();
//   const avg5 = settlementAverage.getAverage5();

//   const fxuSettlement = marketData.getViopSettlementPrice();
//   const bistClose = marketData.getBistClosePrice();

//   if (!bist || !fxu || !avg5) {
//     console.log("BIST, FXU veya avg5 verisi henüz hazır değil, bekleniyor...");
//     return;
//   }

//   const fxuLast = Number(fxu.last);
//   const settlementAverage5 = Number(avg5);

//   if (!Number.isFinite(fxuLast) || !Number.isFinite(settlementAverage5)) {
//     return;
//   }

//   console.log("FXU last:", fxu.last);
//   console.log("FXU settlement price:", fxuSettlement);
//   console.log("FXU settlement 5 günlük ortalama:", avg5);

//   isTradeRunning = true;

//   try {
//     const position = await api.getViopPositionsDetails();

//     let positionSide = "NONE";

//     if (position && position.sozlesmeAdi === process.env.VIOP_SOZLESME) {
//       const positionAmount = Number(position.tutar || 0);

//       if (positionAmount > 0) {
//         positionSide = "LONG";
//       }

//       if (positionAmount < 0) {
//         positionSide = "SHORT";
//       }
//     }

//     if (fxuLast > settlementAverage5) {
//       if (positionSide === "NONE") {
//         // await api.placeViopBuyOrder({
//         //   sozlesme: process.env.VIOP_SOZLESME,
//         //   quantity: 1,
//         //   orderType: "PKP",
//         //   duration: "KIE",
//         //   aksamSeansi: 0,
//         // });

//         console.log("LONG emir gonderildi");
//       }

//       if (positionSide === "SHORT") {
//         // await api.placeViopBuyOrder({
//         //   sozlesme: process.env.VIOP_SOZLESME,
//         //   quantity: 2,
//         //   orderType: "PKP",
//         //   duration: "KIE",
//         //   aksamSeansi: 0,
//         // });

//         console.log("SHORT kapatildi ve LONG acildi");
//       }
//     }

//     if (fxuLast < settlementAverage5) {
//       if (positionSide === "NONE") {
//         // await api.placeViopSellOrder({
//         //   sozlesme: process.env.VIOP_SOZLESME,
//         //   quantity: 1,
//         //   orderType: "PKP",
//         //   duration: "KIE",
//         //   aksamSeansi: 0,
//         // });

//         console.log("SHORT emir gonderildi");
//       }

//       if (positionSide === "LONG") {
//         // await api.placeViopSellOrder({
//         //   sozlesme: process.env.VIOP_SOZLESME,
//         //   quantity: 2,
//         //   orderType: "PKP",
//         //   duration: "KIE",
//         //   aksamSeansi: 0,
//         // });

//         console.log("LONG kapatildi ve SHORT acildi");
//       }
//     }
//   } catch (error) {
//     console.error("Emir strateji hatasi:", error.message);
//   } finally {
//     isTradeRunning = false;
//   }
// }, 2000);


const { MarketDataService } = require("./services/merket_data_service");
const { FxuSettlementRecorder } = require("./services/fxu_settlement_recorder");
const { SettlementAverage } = require("./services/SettlementAverage");
const { MeksaApi } = require("./services/api_engine");

const fs = require("fs");

const marketData = new MarketDataService();
const settlementAverage = new SettlementAverage();

const api = new MeksaApi({
  customerNo: process.env.CUSTOMER_NO,
  token: process.env.TOKEN,
});

try {
  const text = fs.readFileSync("./data/fxu-settlements.json", "utf8");
  const rows = JSON.parse(text);
  settlementAverage.init(rows);
} catch (error) {
  settlementAverage.init([]);
}

marketData.start();

const recorder = new FxuSettlementRecorder(marketData, settlementAverage, {
  intervalMs: 10000,
  outputFile: "./data/fxu-settlements.json",
});

recorder.start();

let isTradeRunning = false;

setInterval(async () => {
  if (isTradeRunning) return;

  const bist = marketData.getBistSnapshot();
  const fxu = marketData.getFxuSnapshot();
  const avg5 = settlementAverage.getAverage5();

  const fxuSettlement = marketData.getViopSettlementPrice();
  const bistClose = marketData.getBistClosePrice();

  if (!bist || !fxu || avg5 == null) {
    console.log("BIST, FXU veya avg5 verisi henüz hazır değil, bekleniyor...");
    return;
  }

  const fxuLast = Number(fxu.last);
  const settlementAverage5 = Number(avg5);

  if (!Number.isFinite(fxuLast) || !Number.isFinite(settlementAverage5)) {
    console.log("FXU last veya avg5 sayısal değil, tur atlandı.");
    return;
  }

  console.log("FXU last:", fxuLast);
  console.log("FXU settlement price:", fxuSettlement);
  console.log("FXU settlement 5 günlük ortalama:", settlementAverage5);

  isTradeRunning = true;

  try {
    const position = await api.getViopPositionsDetails();

    let positionSide = "NONE";

    if (position && position.sozlesmeAdi === process.env.VIOP_SOZLESME) {
      const positionAmount = Number(position.tutar || 0);

      if (positionAmount > 0) {
        positionSide = "LONG";
      } else if (positionAmount < 0) {
        positionSide = "SHORT";
      }
    }

    if (fxuLast > settlementAverage5) {
      if (positionSide === "NONE") {
        await api.placeViopBuyOrder({
          sozlesme: process.env.VIOP_SOZLESME,
          quantity: 1,
          orderType: "PKP",
          duration: "KIE",
          aksamSeansi: 0,
        });

        console.log("Sinyal LONG: Pozisyon yoktu, 1 adet LONG acildi.");
      } else if (positionSide === "SHORT") {
        await api.placeViopBuyOrder({
          sozlesme: process.env.VIOP_SOZLESME,
          quantity: 2,
          orderType: "PKP",
          duration: "KIE",
          aksamSeansi: 0,
        });

        console.log("Sinyal LONG: SHORT kapatildi ve LONG acildi.");
      } else if (positionSide === "LONG") {
        console.log("Sinyal LONG: Zaten LONG pozisyon var, yeni poz alinmadi.");
      }

      return;
    }

    if (fxuLast < settlementAverage5) {
      if (positionSide === "NONE") {
        await api.placeViopSellOrder({
          sozlesme: process.env.VIOP_SOZLESME,
          quantity: 1,
          orderType: "PKP",
          duration: "KIE",
          aksamSeansi: 0,
        });

        console.log("Sinyal SHORT: Pozisyon yoktu, 1 adet SHORT acildi.");
      } else if (positionSide === "LONG") {
        await api.placeViopSellOrder({
          sozlesme: process.env.VIOP_SOZLESME,
          quantity: 2,
          orderType: "PKP",
          duration: "KIE",
          aksamSeansi: 0,
        });

        console.log("Sinyal SHORT: LONG kapatildi ve SHORT acildi.");
      } else if (positionSide === "SHORT") {
        console.log("Sinyal SHORT: Zaten SHORT pozisyon var, yeni poz alinmadi.");
      }

      return;
    }

    console.log("FXU last avg5'e esit, islem yapilmadi.");
  } catch (error) {
    console.error("Emir strateji hatasi:", error.message);
  } finally {
    isTradeRunning = false;
  }
}, 2000);