const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  Promise.resolve(req.cookies.shortlyid)
    .then(hash => {
      if(!hash) {
        throw hash;
      }

      return models.Sessions.get({ hash });
    })
    .tap(session => {
      if(!session) {
        throw session;
      }
    })
    .catch(() => {
      // initializes a new session
      return models.Sessions.create()
        .then(results => {
          return models.Sessions.get({ id: results.insertId });
        })
        .tap(session => {
          req.session = session;
          next();
        });
    })
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

module.exports.verifySession = (req, res, next) => {
  if(!models.Sessions.isLoggedIn(req.session)) {
    res.redirect('/login');
  } else {
    next();
  }
}

