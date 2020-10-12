module.exports = {
  sla: 5, // minutes SLA for inactive conversations
  timeLength: 30, // length to search back from today
  timeType: 'days', // minute | hour | day
  requestsPerPool: 4, // how many requests per cycle should we fire off?
};