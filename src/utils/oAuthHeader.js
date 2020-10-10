const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

const oAuthHeader = (request, internal = false) => {
  const oauthEncrypt = OAuth({
    consumer: {
      key: !internal ? process.env.LP_APP_KEY : process.env.LP_INTERNAL_APP_KEY,
      secret: !internal ? process.env.LP_APP_SECRET : process.env.LP_INTERNAL_APP_SECRET,
    },
    signature_method: 'HMAC-SHA1',
    hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64'),
  });

  const token = !internal ? {

    key: process.env.LP_ACCESS_TOKEN,
    secret: process.env.LP_ACCESS_TOKEN_SECRET,
  } : {};

  return oauthEncrypt.toHeader(oauthEncrypt.authorize(request, { ...token }));
};

module.exports = oAuthHeader;