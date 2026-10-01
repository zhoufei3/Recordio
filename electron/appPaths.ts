import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

if (process.env["VITE_DEV_SERVER_URL"]) {
	const devUserDataPath = path.join(app.getPath("appData"), "Recordio-dev");
	fs.mkdirSync(devUserDataPath, { recursive: true });
	app.setPath("userData", devUserDataPath);
	const devSessionPath = path.join(devUserDataPath, "session");
	fs.mkdirSync(devSessionPath, { recursive: true });
	app.setPath("sessionData", devSessionPath);
} else if (process.platform === "win32") {
	const userDataPath = path.join(app.getPath("appData"), "Recordio");
	fs.mkdirSync(userDataPath, { recursive: true });
	app.setPath("userData", userDataPath);
}

export const USER_DATA_PATH = app.getPath("userData");
export const RECORDINGS_DIR = path.join(USER_DATA_PATH, "recordings");
