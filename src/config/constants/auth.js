const REFRESH_TOKEN = {
  secret: process.env.AUTH_REFRESH_TOKEN_SECRET,
  cookie: {
    name: 'refreshTkn',
    options: {
      sameSite: 'None',
      secure: true,
      httpOnly: true,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
};

module.exports = {
  REFRESH_TOKEN,
};