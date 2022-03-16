const { get, has } = require("lodash");
const { getLpDomains, conversationsSearch } = require("./service/liveperson");
const resumedFromInactiveQuery = require("./resumedFromInactiveQuery");
const segmentRequests = require("./utils/segmentRequests");
const config = require("./@config");

const hash = {
  numberOfConversations: 0,
  numbersClosedBySystem: 0,
  resumedFromInactive: 0,
  resumedFromInactivePct: 0,
  timeInactiveFiveMin: 0,
  timeInactiveThirtyMin: 0,
  timeInactiveFiftyFiveMin: 0,
  agentGroupConversations: [],
  numberOfConversationsPerPool: [],
  results: [],
};

let resumedData = [];

const searchBuilderQuery = async (
  domain,
  pool,
  range,
  offset = 0,
  limit = 100,
  first = true
) => {
  try {
    const conversations = await conversationsSearch(
      domain,
      offset,
      limit,
      range
    );

    const numberOfConversations = get(conversations, "_metadata.count", 0);

    console.log(
      `[pool ${pool} ] pulling ${offset} / ${numberOfConversations}, ${new Date().toLocaleString()}`
    );

    const conversationHistoryRecords = get(
      conversations,
      "conversationHistoryRecords",
      []
    );

    // console.log(agentGroup)
    // Get conversation # closed by autoclose
    const closedBySystem = conversationHistoryRecords.filter(
      (conv) => get(conv, "info.closeReason", "") === "TIMEOUT"
    ).length;

    const resumedFromInactive = resumedFromInactiveQuery(
      conversationHistoryRecords
    );


    // console.log(resumedFromInactive);
    const numberInactive = resumedFromInactive.totalInactive;
    const Day = pool;
    // TODO: return data and calculate later - if failure, we can rerun segments
    // Add to hash
    if (first) {
      hash.numberOfConversationsPerPool.push({
        Day,
        numberOfConversations,
        numberInactive,
      });
    }
    
    resumedData.push(resumedFromInactive);
    hash.numbersClosedBySystem += closedBySystem;
    hash.resumedFromInactive += resumedFromInactive.totalInactive;
    hash.timeInactiveFiveMin += resumedFromInactive.timeInactiveFiveMin;
    hash.timeInactiveThirtyMin += resumedFromInactive.timeInactiveThirtyMin;
    hash.timeInactiveFiftyFiveMin +=
      resumedFromInactive.timeInactiveFiftyFiveMin;
    // Check pagination for next records
    const hasNext = has(conversations, "_metadata.next");
    if (hasNext) {
      const uri = new URL(get(conversations, "_metadata.next.href", ""));
      const params = uri.searchParams;

      const offsetNew = params.get("offset");
      const limitNew = params.get("limit");
      return searchBuilderQuery(
        domain,
        pool,
        range,
        offsetNew,
        limitNew,
        false
      );
    }
    // No new records
    return {
      pool,
      status: "passed",
    };
  } catch (error) {
    return {
      pool,
      status: "failed",
      error,
    };
  }
};

const getCampaigns = async () => {
  // Get service map
  const domains = await getLpDomains();
  const msgHist = get(
    domains.find(({ service }) => service === "msgHist"),
    "baseURI",
    ""
  );

  // Split calls into segments as configured
  const segmentCalls = segmentRequests(config);
  console.log(
    `Strategy: Will run ${segmentCalls.length} segments (groups) of ${config.requestsPerPool}`
  );

  // Call {requestPerPool} per each segment, a set has to finish before moving to the next segment
  // TODO: Convert to node pool when I get the chance
  for await (const segmentFrame of segmentCalls) {
    const results = await Promise.all([
      ...segmentFrame.map((segment) =>
        searchBuilderQuery(msgHist, segment.pool, segment.range)
      ),
    ]);
    hash.results = [...hash.results, ...results];
  }

  // Totals
  hash.numberOfConversations = hash.numberOfConversationsPerPool.reduce(
    (accum, { numberOfConversations }) => accum + numberOfConversations,
    0
  );
  hash.resumedFromInactivePct =
    hash.resumedFromInactive / hash.numberOfConversations;

  const TotalNumberOfConversations = hash.numberOfConversations;
  const TotalResumedFromInactive = hash.resumedFromInactive;
  const TotalResumedFromInactivePct = hash.resumedFromInactivePct;
  const TotalNumbersClosedBySystem = hash.numbersClosedBySystem;
  // // let DayStarted=[];
  // let AgentGroup;
  // let TotalInactive;
  // let TimeInactiveFiveMin;
  // let TimeInactiveThirtyMin;
  // let TimeInactiveFiftyFiveMin;
  // hash.agentGroupConversations.push({
  //   TotalNumberOfConversations,
  //   TotalResumedFromInactive,
  //   TotalResumedFromInactivePct,
  //   TotalNumbersClosedBySystem,
  // });
  resumedData.map((dat) => {
    const DayStarted = dat.startDay;
    const AgentGroup = dat.agentGroup;
    const TotalInactive = dat.totalInactive;
    const TimeInactiveFiveMin = dat.timeInactiveFiveMin;
    const TimeInactiveThirtyMin = dat.timeInactiveThirtyMin;
    const TimeInactiveFiftyFiveMin = dat.timeInactiveFiftyFiveMin;
    hash.agentGroupConversations.push({
      DayStarted,
      AgentGroup,
      TotalInactive,
      TimeInactiveFiveMin,
      TimeInactiveThirtyMin,
      TimeInactiveFiftyFiveMin,
      TotalNumberOfConversations,
      TotalResumedFromInactive,
      TotalResumedFromInactivePct,
      TotalNumbersClosedBySystem,
    });
  });

  // hash.agentGroupConversations.push({
  //   TotalNumberOfConversations,
  //   TotalResumedFromInactive,
  //   TotalResumedFromInactivePct,
  //   TotalNumbersClosedBySystem,
  // });
  // Log Results
  const hashArr = [];
  hashArr.push(hash);
  console.log("hash", hash);
  return hashArr;
};

module.exports = getCampaigns;
