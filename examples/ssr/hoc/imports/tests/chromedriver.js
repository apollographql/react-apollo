var chromedriver = require('chromedriver');

console.log('here');
module.exports = {
  before: function(done) {
    console.log('before');
    try {
      chromedriver.start();
    } catch (e) {
      console.log(e);
    }
    done();
  },
  after: function(done) {
    chromedriver.stop();
    done();
  },
};
