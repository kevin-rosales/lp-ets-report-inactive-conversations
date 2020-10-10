const { get, has } = require('lodash');
const moment = require('moment');
const {
  getLpDomains,
  conversationsSearch,
} = require('./service/liveperson');

const hash = {
  numberOfConversations: 0,
  numbersClosedBySystem: 0,
  resumedFromInactive: 0,
  resumedFromInactivePct: 0,
};

/**
 * This function will check every line for a matching line record where
 * current line was sent by a consumer and the previous line was sent by an agent
 * with a difference in time greater than the timeout time.
 * @param {Array} messageRecords messaging line records
 */
const recoveredFromInactiveSearch = (messageRecords) => {
  let foundInactive = false;
  for (const [index, line] of messageRecords.entries()) {
    const currentLineFromConsumer = get(line, 'sentBy', '') === 'Consumer';
    const previousLineFromAgent = get(messageRecords[index - 1], 'sentBy', '') === 'Agent';

    // Skip Line Item
    if (!currentLineFromConsumer && !previousLineFromAgent) continue;

    // Check time difference
    const currentLineTime = moment(get(line, 'timeL', ''));
    const previousLinetime = moment(get(messageRecords[index - 1], 'timeL', ''));
    const timeDifference = currentLineTime.diff(previousLinetime, 'minutes');

    // If timedifference is greater than SLA config
    if (timeDifference >= 5) {
      foundInactive = true;
    }
  }
  return foundInactive;
};

const resumedFromInactiveQuery = (conversations = []) => {
  let total = 0;
  // Go through every conversation and parse out the message records
  for (const { messageRecords } of conversations) {
    const hasRecovered = recoveredFromInactiveSearch(messageRecords);
    total += hasRecovered ? 1 : 0;
  }
  return total;
};

const searchBuilderQuery = async (domain, range, offset = 0, limit = 100) => {
  const conversations = await conversationsSearch(domain, offset, limit, range);
  const numberOfConversations = get(conversations, '_metadata.count', 0);
  console.log(`pooling ${offset} / ${numberOfConversations}`);

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
    return searchBuilderQuery(domain, range, offsetNew, limitNew);
  }

  // No new records
  return true;
};

const getCampaigns = async () => {
  // Get service map
  const domains = await getLpDomains();
  const msgHist = get(domains.find(({ service }) => service === 'msgHist'), 'baseURI', '');

  const range = {
    from: moment().subtract(1, 'hour').valueOf(), // start
    to: moment().valueOf(), // end
  };

  await searchBuilderQuery(msgHist, range);

  // Get Percentage
  hash.resumedFromInactivePct = hash.resumedFromInactive / hash.numberOfConversations;
  console.log(hash);
};

module.exports = getCampaigns;