const axios = require('axios');
const { get } = require('lodash');
const oAuthHeader = require('../utils/oAuthHeader');

const parseParameters = (params) => Object.keys(params).map((element) => {
  if (typeof params[element] === 'string' || typeof params[element] === 'number') return `${element}=${params[element]}`;
  if (typeof params[element] === 'object' && params[element].length > 0) {
    return params[element].map((param) => `${element}=${param}`).join('&');
  }
  return '';
}).join('&');


async function lpLoginDomain() {
  try {
    const requestData = await axios({
      method: 'GET',
      url: `http://api.liveperson.net/api/account/${process.env.LP_ACCOUNT}/service/agentVep/baseURI.json?version=1.0`,
    });
    return get(requestData, 'data.baseURI', '');
  } catch (e) {
    return '';
  }
}

async function lpToken(domain) {
  try {
    const requestData = await axios({
      method: 'POST',
      url: `https://${domain}/api/account/${process.env.LP_ACCOUNT}/login`,
      params: {
        v: '1.3',
      },
      data: {
        username: process.env.LP_USER,
        password: process.env.LP_PASSWORD,
      },
    });
    return get(requestData, 'data', {});
  } catch (e) {
    return {};
  }
}

async function getLpDomains() {
  try {
    const url = `http://api.liveperson.net/api/account/${process.env.LP_ACCOUNT}/service/baseURI.json`;
    const method = 'get';

    const requestData = await axios({
      method,
      url,
      params: {
        version: '1.0',
      },
    });
    return get(requestData, 'data.baseURIs', []);
  } catch (e) {
    return [];
  }
}
/**
 *
 * @param {*} domain lpDomain for hist
 * @param {*} offset record offset
 * @param {*} limit record limit
 */
async function conversationsSearch(domain, offset, limit, range) {
  try {
    const params = {
      v: '3.4',
      offset,
      limit,
    };
    const requestDataFill = {
      url: `https://${domain}/messaging_history/api/account/${process.env.LP_ACCOUNT}/conversations/search?${parseParameters(params)}`,
      method: 'post',
      data: {
        start: {
          ...range,
        },
        status: [
          'CLOSE',
        ],
        contentToRetrieve: [
          'messageRecords',
        ],
      },
    };
    const requestData = await axios({
      headers: {
        ...oAuthHeader({ url: requestDataFill.url, method: requestDataFill.method }),
      },
      ...requestDataFill,
    });
    return get(requestData, 'data', []);
  } catch (e) {
    return [];
  }
}


module.exports = {
  lpLoginDomain,
  lpToken,
  conversationsSearch,
  getLpDomains,
};
