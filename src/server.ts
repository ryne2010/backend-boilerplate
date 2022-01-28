import http from 'http';
// For Relative Path Resolution
import 'module-alias/register';
import app from './app';
import MongoConnection from './utils/MongoConnection';

// Connect to MongoDB and Start Server
const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

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
  const regularClient = await MongoConnection.getRegularClient();
  const csfleClient = await MongoConnection.getCsfleEnabledClient();

  server
    .listen(PORT, () => {
      console.log(
        `${process.env.ENGINE} server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
    })
    .on('error', (error) => {
      console.error(error);
    });
};

export default startServer();
