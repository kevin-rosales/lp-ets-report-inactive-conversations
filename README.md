
  

  

### Details

  

<img alt="Version" src="https://img.shields.io/badge/version-1.0-green.svg?cacheSeconds=2592000"  />

  

The following project pools Liveperson's messaging interactions API throughout the configured period and searches for any conversation that went from an inactive state to an active state.

The script does not pool the account's time for when a conversation goes inactive - you must hard code it within the configuration.

 #### Install
 
```bash

$ npm i

```

#### Instructions

1. Create your **.env** example based on the **.env.example**
```bash

$ cp .env.example .env

```
2. Edit .env with your Conversational Cloud Account and oAuth1 key. 
*The key must have access to query messaging history.*

```bash
LP_ACCOUNT = "" 
LP_APP_KEY = ""
LP_APP_SECRET = ""
LP_ACCESS_TOKEN = ""
LP_ACCESS_TOKEN_SECRET = ""
```
3. Navigate to **./src/@config/index.js** and configure your desired data pool

```js
module.exports = {
  sla: 5, // minutes for a conversation to be considered as inactive
  timeLength: 10, // length to search back from today
  timeType: 'days', // minute | hour | day
  requestsPerPool: 2, // how many requests should we fire off in parallel? 
};
```
4. Run the script
```bash

$ npm start

```


#