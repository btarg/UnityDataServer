const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const nocache = require("nocache");
const { postingRouter } = require("./routes/posting");
const { errorHandler } = require("./middleware/error.middleware");
const { notFoundHandler } = require("./middleware/not-found.middleware");
const { init } = require("./db");

dotenv.config();

if (!(process.env.PORT && process.env.CLIENT_ORIGIN_URL)) {
	throw new Error(
		"Missing required environment variables. Check docs for more info."
	);
}

const PORT = parseInt(process.env.PORT, 10);
const app = express();

app.use(express.json());
app.use(nocache());
app.use("/api", postingRouter);
app.use(errorHandler);
app.use(notFoundHandler);

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
	init();
});
