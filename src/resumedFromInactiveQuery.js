/* eslint-disable no-loop-func */
/* eslint-disable no-plusplus */
const moment = require("moment");
const { get } = require("lodash");
const config = require("./@config");

/**
 * This function will check every line for a matching line record where
 * current line was sent by a consumer and the previous line was sent by an agent
 * with a difference in time greater than the timeout time.
 * @param {Array} messageRecords messaging line records
 */
const recoveredFromInactiveSearch = (messageRecords, conversationId) => {
  let foundInactive = false;
  let numberInactive = 0;
  const vair = [];

  for (const [index, line] of messageRecords.entries()) {
    const currentLineFromConsumer = get(line, "sentBy", "") === "Consumer";
    const previousLineFromAgent =
      get(messageRecords[index - 1], "sentBy", "") === "Agent";

    // Skip Line Item
    if (!currentLineFromConsumer && !previousLineFromAgent) continue;

    // Check time difference
    const currentLineTime = moment(get(line, "timeL", ""));
    const previousLinetime = moment(
      get(messageRecords[index - 1], "timeL", "")
    );
    const timeDifference = currentLineTime.diff(previousLinetime, "minutes");

    // If timedifference is greater than SLA config
    if (timeDifference >= config.sla) {
      foundInactive = true;
      numberInactive++;
      vair.push({
        timeInactive: timeDifference,
        foundInactive: true,
        numberInactive,
      });
      break;
    }
  }
  return vair;
};

const resumedFromInactiveQuery = (conversations = []) => {
  let total = 0;
  let fiveMins = 0;
  let thirtyMins = 0;
  let fiftyFiveMins = 0;
  let agentGroup;
  let startDay;

  // Go through every conversation and parse out the message records
  for (const { messageRecords, info } of conversations) {
    const {conversationId} = info;
    agentGroup = info.latestAgentGroupName;
    startDay = info.startTime;

    const hasRecovered = recoveredFromInactiveSearch(messageRecords, conversationId);
    hasRecovered.map((f) => {
      if (f.timeInactive <= 300) {
        // eslint-disable-next-line no-plusplus
        fiveMins++;
      }
      if (f.timeInactive <= 1800 && f.timeInactive > 300) {
        thirtyMins++;
      }
      if (f.timeInactive <= 3300 && f.timeInactive > 1800) {
        fiftyFiveMins++;
      }
      if (f.numberInactive >= 1) {
        total++;
      }
    });
  }

  const data = {
    startDay,
    agentGroup,
    totalInactive: total,
    timeInactiveFiveMin: fiveMins,
    timeInactiveThirtyMin: thirtyMins,
    timeInactiveFiftyFiveMin: fiftyFiveMins,
  };
  return data;
};

module.exports = resumedFromInactiveQuery;
