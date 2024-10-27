/**
 * config/index.js
 */
const path = require("path");
const dotenv = require("dotenv");
const { CHAT_SETTING_LIMITS } = require("./constants");
const { getEnv } = require("@utils/processing/api");

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, ".env") });

const development = {
  db: getEnv("MONGODB_URI")
};
const production = {
  db: getEnv("MONGODB_URI")
};
const test = {
  db: getEnv("MONGODB_URI"),
  facebook: {
    clientID: "APP_ID",
    clientSecret: "SECRET",
    callbackURL: "http://localhost:3000/auth/facebook/callback",
    scope: ["email", "user_about_me", "user_friends"]
  },
  google: {
    clientID: "APP_ID",
    clientSecret: "SECRET",
    callbackURL: "http://localhost:3000/auth/google/callback",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.google.com/m8/feeds"
    ]
  }
};

const defaults = {
  root: path.normalize(__dirname + "/.."),
  // --- Node --- //
  node: {
    env: process.env.NODE_ENV || "development",
    envFile: ".env",
    envPath: path.join(__dirname, "..", "..", ".env")
  },
  // --- NewRelic --- //
  newRelic: {
    app_name: [`${process.env.NEW_RELIC_APP_NAME}`],
    keys: {
      user_key: process.env.NEW_RELIC_API_USER_KEY,
      license_key: process.env.NEW_RELIC_LICENSE_KEY
    },
    configuration: {
      logging: {
        level: "info"
      },
      distributed_tracing: {
        enabled: true
      },
      instrumentation: {
        express: false // Disable Express instrumentation if the issue persists
      },
      error_collector: {
        enabled: true
      }
    }
  },
  // --- App --- //
  app: {
    name: "ReedAi",
    description: "--- ReedAi ---",
    version: "1.0.0",
    host: process.env.HOST || "localhost",
    port: parseInt(process.env.PORT, 10) || 3002,
    url: process.env.URL || "http://localhost:3002",
    express: {
      trustProxy: true,
      json: {
        limit: "1mb"
      },
      urlencoded: {
        extended: true,
        limit: "1mb"
      }
    },
    middlewares: {
      logging: {
        level: process.env.LOG_LEVEL || "info",
        format: process.env.LOG_FORMAT || "combined",
        morgan: {
          format: "combined",
          options: {
            stream: process.stdout
          }
        },
        winston: {
          level: process.env.LOG_LEVEL || "info",
          format: process.env.LOG_FORMAT || "combined",
          options: {
            stream: process.stdout
          }
        }
      },
      cors: {
        origin: ["http://localhost:3000", "*"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        optionsSuccessStatus: 200
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
      },
      security: {
        helmet: {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "https://fonts.googleapis.com"]
            }
          }
        }
      },
      compression: {
        threshold: 512
      },
      staticFiles: {
        public: path.join(__dirname, "..", "..", "public"),
        dirs: ["static", "uploads", "static/images", "static/files"]
      }
    }
  },
  // --- DB --- //
  database: {
    username: process.env.MONGODB_USERNAME,
    password: process.env.MONGODB_PASSWORD,
    clusterUrl: process.env.MONGODB_CLUSTER_URL,
    database: process.env.MONGODB_DB_NAME,
    appName: process.env.MONGODB_APPNAME,
    uri: process.env.MONGODB_URI,
    options: {
      useCreateIndex: true,
      useFindAndModify: false
    },
    mongoose: {
      url: getEnv("MONGODB_URI") + (process.env.NODE_ENV === "test" ? "-test" : "")
    },
    gridfs: {
      bucketName: "uploads"
    },
    fileUpload: {
      createParentPath: true,
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024 // 10 MB
      },
      abortOnLimit: true,
      responseOnLimit: "File size limit has been reached",
      useTempFiles: true,
      tempFileDir: "/tmp/"
    }
  },
  // --- Auth --- //
  auth: {
    // --- JWT --- //
    jwt: {
      secret: process.env.AUTH_SECRET,
      accessToken: process.env.AUTH_ACCESS_TOKEN,
      refreshToken: process.env.AUTH_REFRESH_TOKEN,
      audience: process.env.AUTH_AUDIENCE,
      issuer: process.env.AUTH_ISSUER,
      expiresIn: process.env.AUTH_EXPIRES_IN || "1d"
    },
    // --- Session --- //
    session: {
      name: "ReedAiSession",
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
        sameSite: "lax"
      }
    },
    // --- Cookie --- //
    cookie: {
      secret: process.env.COOKIE_SECRET
    },
    // --- Passport --- //
    passport: {
      local: {
        usernameField: "email"
      }
    },
    // --- OAuth --- //
    oAuth: {
      facebook: {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        scope: ["email", "user_about_me", "user_friends"]
      },
      google: {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: [
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.google.com/m8/feeds"
        ]
      },
      linkedin: {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: process.env.LINKEDIN_CALLBACK_URL,
        scope: ["r_emailaddress", "r_liteprofile"]
      }
    }
  },
  // --- Api --- //
  api: {
    // --- Local API --- //
    port: parseInt(process.env.PORT, 10) || 3002,
    host: process.env.HOST || "localhost",
    // --- Api Keys --- //
    keys: {
      // --- Models --- //
      openAiApiKey: process.env.OPENAI_API_PROJECT_KEY,
      perplexityApiKey: process.env.PERPLEXITY_API_PROJECT_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_PROJECT_KEY,
      groqApiKey: process.env.GROQ_API_PROJECT_KEY,
      googleGeminiApiKey: process.env.GOOGLE_API_PROJECT_KEY,
      mistralApiKey: process.env.MISTRAL_API_PROJECT_KEY,
      // --- Vector DB --- //
      pineconeApiKey: process.env.PINECONE_API_PROJECT_KEY
    }
    // --- Chat Models --- //
  },
  // --- Chat --- //
  chat: {
    settings: {
      limits: CHAT_SETTING_LIMITS,
      default: {
        model: process.env.OPENAI_API_CHAT_COMPLETION_MODEL,
        maxTokens: 1000,
        temperature: 0.7,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
        topP: 1.0,
        stopSequences: [],
        stopWords: [],
        stopSequencesRegex: [],
        stopWordsRegex: []
      }
    },
    // --- Chat Model Names --- //
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
      falcon40b: process.env.FALCON40B_MODEL
    },
    // --- Chat Model Configurations --- //
    configurations: {
      // --- Embedding --- //
      embedding: {
        general: {
          model: process.env.EMBEDDING_MODEL,
          dimension: parseInt(process.env.EMBEDDING_DIMENSION, 10),
          distance: process.env.EMBEDDING_DISTANCE
        },
        // --- Vector DB --- //
        pinecone: {
          apiKey: process.env.PINECONE_API_PROJECT_KEY,
          environment: process.env.PINECONE_ENVIRONMENT,
          indexName: process.env.PINECONE_INDEX,
          namespace: process.env.PINECONE_NAMESPACE,
          dimension: parseInt(process.env.PINECONE_DIMENSION, 10),
          topK: parseInt(process.env.PINECONE_TOP_K, 10)
        }
      },
      completions: {},
      streams: {},
      assistants: {}
    }
  }
};

const config = {
  development: Object.assign({}, development, defaults),
  test: Object.assign({}, test, defaults),
  production: Object.assign({}, production, defaults)
}[process.env.NODE_ENV || "development"];

module.exports = config;
