const ObjectsToCsv = require('objects-to-csv');

const downloadCSV = (data) => {
  (async () => {
    //   console.log("YEAH",data[0].agentGroupConversations)
    const csv = new ObjectsToCsv(data[0].agentGroupConversations);
    console.log('csv', csv);
    // Save to file:
    await csv.toDisk('./VZ_Report.csv', { allColumns: false });

    // Return the CSV file as string:
    console.log(await csv.toString());
  })();
};
// If you use "await", code must be inside an asynchronous function:

module.exports = downloadCSV;
