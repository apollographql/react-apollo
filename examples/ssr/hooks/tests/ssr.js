const cheerio = require('cheerio');
const assert = require('assert');

/*
 *
 * This is a smoke test for SSR with react apollo
 * It uses Meteor to create a client and server environment
 * and uses nightwatch to test against it.
 * By using source, we can get access to the SSR markup
 * and by using .execute / find / etc we can get the client
 * built markup after the app has started up
 *
 * we check three things below
 * 1. __APOLLO_STATE__ matches and is created on the server
 * 2. The app markup doesn't change from SSR to boot
 * 3. A simple test to verify the h3 is rendered and maintained
 *
*/

module.exports = {
  'Initial State': function(browser) {
    let initialState;
    let SSRMarkup;
    browser
      .url(browser.launchUrl)
      .source(function(result) {
        const $ = cheerio.load(result.value);

        // verify Initial state
        const initial = $('script')[0].children[0].data;
        const window = {};

        // parse SSR data
        eval(initial);
        initialState = window.__APOLLO_STATE__;

        // save generated markup for comparision
        SSRMarkup = $('#app').html();

        // assert SSR markup with quick check of data
        assert.equal($('h3').text(), 'R2-D2');
      })
      // ensure the parsed state matches the server state
      .execute(
        function() {
          return window.__APOLLO_STATE__;
        },
        function(result) {
          assert.deepEqual(result.value, initialState);
        },
      )
      // ensure the markup doesn't change once the app starts up
      .execute(
        function() {
          return document.getElementById('app').innerHTML;
        },
        function(result) {
          assert.equal(result.value, SSRMarkup);
        },
      )
      // ensure h3 value didn't change
      .expect.element('h3')
      .text.to.equal('R2-D2');
  },
};
