"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
// For Relative Path Resolution
require("module-alias/register");
const app_1 = __importDefault(require("./app"));
const MongoConnection_1 = __importDefault(require("./utils/MongoConnection"));
// Connect to MongoDB and Start Server
const PORT = process.env.PORT || 8080;
const server = http_1.default.createServer(app_1.default);
process.on('SIGTERM', async () => {
    // TO Do add shutdown commands
    console.log('Sigterm int');
    server.close();
});
process.on('SIGINT', async () => {
    // To Do add Shutdown commands
    console.log('Sigint test');
    server.close();
});
const startServer = async () => {
    const regularClient = await MongoConnection_1.default.getRegularClient();
    const csfleClient = await MongoConnection_1.default.getCsfleEnabledClient();
    server
        .listen(PORT, () => {
        console.log(`${process.env.ENGINE} server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    })
        .on('error', (error) => {
        console.error(error);
    });
};
exports.default = startServer();
//# sourceMappingURL=server.js.map