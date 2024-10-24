const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sign, verify } = jwt;

const generateToken = () => crypto.randomBytes(64).toString('hex');

const generateTokens = (user) => {
  const accessToken = sign(
    { userId: user._id },
    process.env.AUTH_ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' } // Access token expires in 1 hour
  );
  const refreshToken = sign(
    { userId: user._id },
    process.env.AUTH_REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' } // Refresh token expires in 7 days
  );
  return { accessToken, refreshToken };
};
module.exports = {
  generateToken,
  generateTokens,
};
