module.exports = {
  sla: 5, // minutes SLA for inactive conversations
  timeLength: 10, // length to search back from today
  timeType: 'days', // minute | hour | day
  requestsPerPool: 2, // how many requests should we fire off in parallel?
};