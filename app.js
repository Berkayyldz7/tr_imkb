const { MeksaApi } = require("./services/api_engine");
const dotenv = require("dotenv");

dotenv.config();



async function main() {
  const api = new MeksaApi({
    customerNo: process.env.CUSTOMER_NO,
    password: process.env.PASSWORD,
    rumuz: process.env.RUMUZ,
  });

  try {
    await api.createToken();
    console.log("Token alindi:", api.token);

    const balance = await api.getSpotBalance();
    console.log("Spot bakiye:", balance.data.CBK?.[0]?.fields?.[0]);

    const orders = await api.getSpotOrders();
    console.log(
      "Son emirler:",
      (orders.data.HGI || []).map((item) => item.fields)
    );
  } catch (error) {
    console.error("Hata:", error.message);
  }
}

if (require.main === module) {
  main();
}
