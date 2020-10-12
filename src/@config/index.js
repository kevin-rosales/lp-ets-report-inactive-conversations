module.exports = {
  sla: 5, // minutes SLA for inactive conversations
  timeLength: 2, // length to search back from today
  timeType: 'hour', // minute | hour | day
  requestsPerPool: 4, // how many requests per cycle should we fire off?
};