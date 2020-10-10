module.exports = {
  sla: 5, // minutes
  timeLength: 2, // length to search back from today
  timeType: 'hour', // minute | hour | day
  requestsPerPool: 2, // how many requests per cycle should we fire off?
};