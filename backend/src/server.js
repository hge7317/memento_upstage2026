import { app } from "./app.js";

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Memory Replay backend running on port ${port}`);
  console.log(`Solar Pro 4: ${process.env.SOLAR_API_KEY ? "configured" : "NOT CONFIGURED — recall requests will fail"}`);
});
