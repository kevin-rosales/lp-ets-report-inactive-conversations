const moment = require('moment');
const { get } = require('lodash');

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

module.exports = resumedFromInactiveQuery;