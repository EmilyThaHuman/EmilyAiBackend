/**
 * config/index.js
 */
const path = require('path');
const dotenv = require('dotenv');
const { CHAT_SETTING_LIMITS } = require('./constants');
const { getEnv } = require('@/utils/api');
// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const development = {
  db: getEnv('MONGODB_URI'),
};
const production = {
  db: getEnv('MONGODB_URI'),
};
const test = {
  db: getEnv('MONGODB_URI'),
  facebook: {
    clientID: 'APP_ID',
    clientSecret: 'SECRET',
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    scope: ['email', 'user_about_me', 'user_friends'],
  },
  google: {
    clientID: 'APP_ID',
    clientSecret: 'SECRET',
    callbackURL: 'http://localhost:3000/auth/google/callback',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.google.com/m8/feeds',
    ],
  },
};

const defaults = {
  root: path.normalize(__dirname + '/..'),
  api: {
    port: parseInt(process.env.PORT, 10) || 3002,
    host: process.env.HOST || 'localhost',
    openAIKey: process.env.OPENAI_API_PROJECT_KEY,
    embeddingModel: process.env.EMBEDDING_MODEL,
    models: {
      // GPT-3 models
      gpt3: process.env.GPT3_MODEL,
      gpt35Turbo: process.env.GPT35_TURBO_MODEL,
      gpt35Turbo16k: process.env.GPT35_TURBO_16K_MODEL,
      textDavinci003: process.env.TEXT_DAVINCI_003_MODEL,
      textDavinci002: process.env.TEXT_DAVINCI_002_MODEL,
      textCurie001: process.env.TEXT_CURIE_001_MODEL,
      textBabbage001: process.env.TEXT_BABBAGE_001_MODEL,
      textAda001: process.env.TEXT_ADA_001_MODEL,

      // GPT-4 models
      gpt4: process.env.GPT4_MODEL,
      gpt4_32k: process.env.GPT4_32K_MODEL,
      gpt4Turbo: process.env.GPT4_TURBO_MODEL,
      gpt4TurboVision: process.env.GPT4_TURBO_VISION_MODEL,

      // GPT-4o models
      gpt4o: process.env.GPT4O_MODEL,
      gpt4oMini: process.env.GPT4O_MINI_MODEL,

      // Instruct models
      gpt35TurboInstruct: process.env.GPT35_TURBO_INSTRUCT_MODEL,

      // Embedding models
      adaEmbedding: process.env.ADA_EMBEDDING_MODEL,
      textEmbedding3Small: process.env.TEXT_EMBEDDING_3_SMALL_MODEL,
      textEmbedding3Large: process.env.TEXT_EMBEDDING_3_LARGE_MODEL,

      // Other OpenAI models
      whisper: process.env.WHISPER_MODEL,
      dalle2: process.env.DALLE2_MODEL,
      dalle3: process.env.DALLE3_MODEL,

      // Non-OpenAI models (for comparison)
      claudeV1: process.env.CLAUDE_V1_MODEL,
      claudeV2: process.env.CLAUDE_V2_MODEL,
      claudeInstant: process.env.CLAUDE_INSTANT_MODEL,
      palmV2: process.env.PALM_V2_MODEL,
      geminiBison: process.env.GEMINI_BISON_MODEL,
      llama2: process.env.LLAMA2_MODEL,
      mistral7b: process.env.MISTRAL7B_MODEL,
      falcon40b: process.env.FALCON40B_MODEL,
    },
    indexName: process.env.PINECONE_INDEX,
    namespace: process.env.PINECONE_NAMESPACE,
    dimension: parseInt(process.env.PINECONE_DIMENSION, 10),
    topK: parseInt(process.env.PINECONE_TOP_K, 10),
  },
  auth: {
    secret: process.env.AUTH_SECRET,
    audience: process.env.AUTH_AUDIENCE,
    issuer: process.env.AUTH_ISSUER,
    expiresIn: process.env.AUTH_EXPIRES_IN || '1d',
  },
  chat: {
    settings: CHAT_SETTING_LIMITS,
  },
  database: {
    uri: getEnv('MONGODB_URI'),
    options: {
      useCreateIndex: true,
      useFindAndModify: false,
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },
  cors: {
    origin: ['http://localhost:3000', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        },
      },
    },
  },
  compression: {
    threshold: 512,
  },
  session: {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === 'production',
    },
  },
  cookie: {
    secret: process.env.COOKIE_SECRET,
  },
  passport: {
    local: {
      usernameField: 'email',
    },
  },
  staticFiles: {
    public: path.join(__dirname, '..', '..', 'public'),
    dirs: ['static', 'uploads', 'static/images', 'static/files'],
  },
  gridfs: {
    bucketName: 'uploads',
  },
  fileUpload: {
    createParentPath: true,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10 MB
    },
    abortOnLimit: true,
    responseOnLimit: 'File size limit has been reached',
    useTempFiles: true,
    tempFileDir: '/tmp/',
  },
};

const config = {
  development: Object.assign({}, development, defaults),
  test: Object.assign({}, test, defaults),
  production: Object.assign({}, production, defaults),
}[process.env.NODE_ENV || 'development'];

config.getOpenAIClient = () => require('./services/openai').getLangChainClient();

module.exports = config;
