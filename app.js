// const {MeksaApi} = require("./services/api_engine");
// const { LiveDataClient } = require("./services/live_data");
// const dotenv = require("dotenv");
// const path = require("path");

// dotenv.config({
//   path: path.resolve(__dirname, "./.env")
// });

// async function main() {
//   const liveDataClient = new LiveDataClient();
//   await liveDataClient.start();

//   const api = new MeksaApi({
//     customerNo: process.env.CUSTOMER_NO,
//     password: process.env.PASSWORD,
//     token: process.env.TOKEN,

//   });
//   try {



//     // if (liveDataClient.getLatestPrice("XU100") < 20000) {
//     //   console.log("XU100 20000 altında, işlem yapılıyor...");
//     //   // Burada alım/satım işlemi yapılabilir

//     //   free_balance = await api.getViopFreeBalanceDetails();
//     //   console.log("Viop bakiye:", free_balance || []);
//     // }




//   // setInterval(() => {
//   //   console.log("XU100 latest:", liveDataClient.getLatest("XU100"));
//   //   console.log("F_XU0300426 latest:", liveDataClient.getLatest("F_XU0300426"));
//   // }, 3000);

//   xu_price = liveDataClient.getLatest("XU100");
//   console.log("XU100 latest price:", xu_price);

//   f_xu_price = liveDataClient.getLatest("F_XU0300426");
//   console.log("F_XU0300426 latest price:", f_xu_price);




//   } catch (error) {
//     console.error("Hata:", error.message);
//   }
// }

// if (require.main === module) {
//   main();
// }



////////////////////////////////////////////////////////////////

// data_flow.js için ayrılan ksıım

////////////////////////////////////////////////////////////////

// const { LiveMarketStream } = require("./services/data_flow");

// async function main() {
//   const stream = new LiveMarketStream();
//   await stream.start();

//   let xu100Data = null;
//   let viopData = null;

//   stream.onXu100((data) => {
//     xu100Data = data;
//     console.log("guncel xu100:", xu100Data.last);
//   });

//   stream.onViop((data) => {
//     viopData = data;
//     console.log("guncel viop:", viopData.last);
//   });
// }

// main().catch((error) => {
//   console.error(error.message);
//   process.exit(1);
// });



////////////////////////////////////////////////////////////////

// data_fecth_try.js için ayrılan ksıım

////////////////////////////////////////////////////////////////

// const { LiveMarketReader } = require("./services/data_fecth_try");

// async function main() {
//   const market = new LiveMarketReader();
//   await market.start();

//   while (true) {
//     try {
//       const [bist, fxu] = await Promise.all([
//         market.getBist100Data(),
//         market.getFxu030Data(),
//       ]);

//       const bistData = bist.raw;
//       const fxuData = fxu.raw;

//       if (bistData.dayClose && fxuData.dayClose) {
//         console.log("BIST:", bistData);
//         console.log("FXU:", fxuData);

//         // Strateji burada:
//         // if (bistData.last > bistData.dayClose && fxuData.last > fxuData.dayClose) {
//         //   emir gonder
//         // }
//       }
//     } catch (error) {
//       console.error("Veri bekleme hatasi:", error.message);
//     }
//   }
// }

// main().catch((error) => {
//   console.error(error.message);
//   process.exit(1);
// });


const { MarketDataService } = require("./services/merket_data_service");
const { FxuSettlementRecorder } = require("./services/fxu_settlement_recorder");

const marketData = new MarketDataService();

marketData.start();

const recorder = new FxuSettlementRecorder(marketData, {
  intervalMs: 2000,
  outputFile: "./data/fxu-settlements.json",
});

recorder.start();

setInterval(() => {
  const bist = marketData.getBistSnapshot();
  const fxu = marketData.getFxuSnapshot();

  const fxu_settlement = marketData.getViopSettlementPrice();
  const bist_close = marketData.getBistClosePrice();

  if (!bist || !fxu) {
    console.log("BIST veya FXU verisi henüz alınamadı, bekleniyor...");
    return;
  }

  console.log("BIST last:", bist.last);
  console.log("FXU last:", fxu.last);
  console.log("FXU settlement price:", fxu_settlement);
  console.log("BIST close price:", bist_close);

  // Strateji kosullari burada yazilacak
  // if (bist.last > bist.dayClose && fxu.last > fxu.dayClose) {
  //   emir gonder
  // }


  // fxu_settlement_ortalama al ( 5 günlük )
  // kontratın son fiyatını al

  // eğer kontratın son fiyatı fxu_settlement_ortalamalarının üstündeyse ve mevcut pozisyon yoksa 1 adet long emir aç
    // Eğer mevcut pozisyonun yönü short ise önce kapat sonra long aç ( 2 adet emir )

  // eğer kontratın son fiyatı fxu_settlement_ortalamalarının altındaysa ve mevcut pozisyon yoksa short emir aç
    // Eğer mevcut pozisyonun yönü long ise önce kapat sonra short aç ( 2 adet emir )

  



}, 1000);



