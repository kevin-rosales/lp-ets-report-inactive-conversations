module.exports = {
  sla: 5, // minutes SLA for inactive conversations
  timeLength: 1, // length to search back from today
  timeType: "days", // minute | hour | day
  requestsPerPool: 5, // how many requests should we fire off in parallel?
};
