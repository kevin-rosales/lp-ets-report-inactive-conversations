const moment = require('moment');
const { chunk } = require('lodash');

const segmentRequests = (config) => {
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
  return chunk(segmentTime, config.requestsPerPool);
};

module.exports = segmentRequests;