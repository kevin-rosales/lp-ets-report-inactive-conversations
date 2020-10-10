const { get, has } = require('lodash');
const moment = require('moment');
const {
  getLpDomains,
  conversationsSearch,
} = require('./service/liveperson');
const resumedFromInactiveQuery = require('./resumedFromInactiveQuery');

const hash = {
  numberOfConversations: 0,
  numbersClosedBySystem: 0,
  resumedFromInactive: 0,
  resumedFromInactivePct: 0,
};

const searchBuilderQuery = async (domain, pool, range, offset = 0, limit = 100) => {
  try {
    const conversations = await conversationsSearch(domain, offset, limit, range);
    const numberOfConversations = get(conversations, '_metadata.count', 0);
    console.log(`[pool ${pool} ] pulling ${offset} / ${numberOfConversations}`);

    const conversationHistoryRecords = get(conversations, 'conversationHistoryRecords', []);

    // Get conversation # closed by autoclose
    const closedBySystem = conversationHistoryRecords.filter((conv) => conv.info.closeReason === 'TIMEOUT').length;
    const resumedFromInactive = resumedFromInactiveQuery(conversationHistoryRecords);


    // Totals
    hash.numberOfConversations = numberOfConversations;
    hash.numbersClosedBySystem += closedBySystem;
    hash.resumedFromInactive += resumedFromInactive;

    // Check pagination for next records
    const hasNext = has(conversations, '_metadata.next');
    if (hasNext) {
      const uri = new URL(get(conversations, '_metadata.next.href', ''));
      const params = uri.searchParams;

      const offsetNew = params.get('offset');
      const limitNew = params.get('limit');
      return searchBuilderQuery(domain, pool, range, offsetNew, limitNew);
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
const config = {
  sla: 5, // minutes
  timeLength: 2, // length to search back from today
  timeType: 'hour', // hour | day
  requestsPerPool: 3, // TODO: how many requests should we fire off?
};

const getCampaigns = async () => {
  // Get service map
  const domains = await getLpDomains();
  const msgHist = get(domains.find(({ service }) => service === 'msgHist'), 'baseURI', '');

  const { timeLength, timeType } = config;

  // Store current time as base
  const startTime = moment().subtract(timeLength, timeType);

  const segmentTime = Array.from(Array(timeLength).keys()).map((index) => {
    const from = moment(startTime).add(index, timeType).valueOf();
    const to = moment(startTime).add(index + 1, timeType).valueOf();
    return {
      pool: index,
      range: {
        from, // start older
        to, // end newer
      },
      human: {
        from: moment(from).format('YYYY-MM-DD HH:mm:ss'),
        to: moment(to).format('YYYY-MM-DD HH:mm:ss'),
      },
    };
  });

  const results = await Promise.all([
    ...segmentTime.map((segment) => searchBuilderQuery(msgHist, segment.pool, segment.range)),
  ]);

  // Get Percentage
  hash.resumedFromInactivePct = hash.resumedFromInactive / hash.numberOfConversations;

  // Log Results
  console.log('getCampaigns -> results', results);
  console.log(hash);
};

module.exports = getCampaigns;