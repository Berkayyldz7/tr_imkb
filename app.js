const {MeksaApi} = require("./services/api_engine");
const { LiveDataClient } = require("./services/live_data");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "./.env")
});

async function main() {
  const liveDataClient = new LiveDataClient();
  await liveDataClient.start();

  const api = new MeksaApi({
    customerNo: process.env.CUSTOMER_NO,
    password: process.env.PASSWORD,
    token: process.env.TOKEN,

  });
  try {

    if (liveDataClient.getLatestPrice("XU100") < 20000) {
      console.log("XU100 20000 altında, işlem yapılıyor...");
      // Burada alım/satım işlemi yapılabilir

      free_balance = await api.getViopFreeBalanceDetails();
      console.log("Viop bakiye:", free_balance || []);
    }




  } catch (error) {
    console.error("Hata:", error.message);
  }
}

if (require.main === module) {
  main();
}