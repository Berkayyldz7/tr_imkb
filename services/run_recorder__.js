const { DayCloseRecorder } = require("./day_close_recorder");

async function main() {
  const recorder = new DayCloseRecorder();

  try {
    await recorder.start();
    console.log("DayCloseRecorder basladi.");

    process.on("SIGINT", async () => {
      console.log("DayCloseRecorder durduruluyor...");
      await recorder.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("DayCloseRecorder durduruluyor...");
      await recorder.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("Recorder hatasi:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
