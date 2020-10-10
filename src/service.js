const { get, has } = require('lodash');
const {
  getLpDomains,
  conversationsSearch,
} = require('./service/liveperson');
const resumedFromInactiveQuery = require('./resumedFromInactiveQuery');
const segmentRequests = require('./utils/segmentRequests');
const config = require('./@config');

const hash = {
  numberOfConversations: 0,
  numbersClosedBySystem: 0,
  resumedFromInactive: 0,
  resumedFromInactivePct: 0,
  numberOfConversationsPerPool: [],
  results: [],
};

const searchBuilderQuery = async (domain, pool, range, offset = 0, limit = 100, first = true) => {
  try {
    const conversations = await conversationsSearch(domain, offset, limit, range);
    const numberOfConversations = get(conversations, '_metadata.count', 0);
    console.log(`[pool ${pool} ] pulling ${offset} / ${numberOfConversations}`);

    const conversationHistoryRecords = get(conversations, 'conversationHistoryRecords', []);

    // Get conversation # closed by autoclose
    const closedBySystem = conversationHistoryRecords.filter((conv) => conv.info.closeReason === 'TIMEOUT').length;
    const resumedFromInactive = resumedFromInactiveQuery(conversationHistoryRecords);


    // Add to hash
    if (first) {
      hash.numberOfConversationsPerPool.push({ pool, numberOfConversations });
    }
    hash.numbersClosedBySystem += closedBySystem;
    hash.resumedFromInactive += resumedFromInactive;

    // Check pagination for next records
    const hasNext = has(conversations, '_metadata.next');
    if (hasNext) {
      const uri = new URL(get(conversations, '_metadata.next.href', ''));
      const params = uri.searchParams;

      const offsetNew = params.get('offset');
      const limitNew = params.get('limit');
      return searchBuilderQuery(domain, pool, range, offsetNew, limitNew, false);
    }
    // No new records
    return {
      pool,
      status: 'passed',
    };
  } catch (error) {
    return {
      pool,
      status: 'failed',
      error,
    };
  }
};

const getCampaigns = async () => {
  // Get service map
  const domains = await getLpDomains();
  const msgHist = get(domains.find(({ service }) => service === 'msgHist'), 'baseURI', '');

  // Split calls into segments as configured
  const segmentCalls = segmentRequests(config);

  // Call {requestPerPool} per each segment, a set has to finish before moving to the next segment
  for await (const segmentFrame of segmentCalls) {
    const results = await Promise.all([
      ...segmentFrame.map((segment) => searchBuilderQuery(msgHist, segment.pool, segment.range)),
    ]);
    hash.results = [...hash.results, ...results];
  }

  // Totals
  hash.numberOfConversations = hash.numberOfConversationsPerPool.reduce((accum, { numberOfConversations }) => accum + numberOfConversations, 0);
  hash.resumedFromInactivePct = hash.resumedFromInactive / hash.numberOfConversations;

  // Log Results
  console.log(hash);
};

module.exports = getCampaigns;