import admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export const auth = admin.auth();