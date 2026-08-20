import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.join(__dirname, "..", "..", ".env");
dotenv.config({ path: rootEnvPath, override: true });
