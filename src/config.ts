require('dotenv').config()

import path from 'path'

const appName: string = 'jupiter-git'
const hostName: string = process.env.HOSTNAME || 'http://localhost:8080'

export default {
  apiKeyHeader: 'x-cheststore-key',

  app: {
    name: appName,
    titleCaseName: appName,
    masterKey: process.env.MASTER_KEY,
    rootDir: path.join(__dirname, '..', '..'),
  },

  jupiter: {
    server: process.env.JUPITER_HOST || 'https://jpr4.gojupiter.tech',
  },

  server: {
    isProduction: process.env.NODE_ENV === 'production',
    port: process.env.PORT || 8080,
    concurrency: parseInt(process.env.WEB_CONCURRENCY || (1).toString()),
    host: hostName,
  },

  logger: {
    options: {
      name: appName,
      level: process.env.LOGGING_LEVEL || 'info',
      streams: [
        {
          stream: process.stdout,
        },
      ],
    },
  },
}
