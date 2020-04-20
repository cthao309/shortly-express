const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const CookieParser = require('./middleware/cookieParser');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// enable cookieParser
app.use(CookieParser);

// enable Auth session
app.use(Auth.createSession);

app.get('/', Auth.verifySession, (req, res) => {
  res.render('index');
});

app.get('/create', Auth.verifySession, (req, res) => {
  res.render('index');
});

app.get('/links', Auth.verifySession, (req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post('/links', Auth.verifySession, (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

// GET end-point for login to render the template
app.get('/login', (req, res) => {
  res.render('login');
});

// POST end-point for login
app.post('/login', (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  console.log('use login infor => ', username, password)

  return models.Users.get({ username })
    .then(user => {
      // if user doesn't exist or the password doesn't match, throw error message

      console.log('user => ', user)

      if(!user || !models.Users.compare(password, user.password, user.salt)) {
        throw new Error('User name and password does not match');
      }

      // else create the session for the user
      return models.Sessions.update({ hash: req.session.hash }, { userId: user.id });
    })
    .then(() => {
      // redirect to root endpoint
      console.log('POST (login) redirect to root endpoint')
      res.redirect('/');
    })
    .error(error => {
      console.log('POST (login) throw error => ', error)
      // respond with an error message and status code 500
      res.status(500).send(error);
    })
    .catch(() => {
      console.log('POST (login) redirect to login endpoint')
      // if fail to login, redirect to the login template
      res.redirect('/login');
    })
})

// endpoint for retreiving logout template
app.get('/logout', (req, res) => {
  return models.Sessions.delete({ hash: req.cookies.shortlyid })
  .then(() => {
    res.clearCookie('shortlyid');
    res.redirect('/login');
  })
  .error(error => {
    res.status(500).send(error);
  })
})


// GET end-point for sign up to render the template
app.get('/signup', (req, res) => {
  res.render('signup');
})

// POST end-point for sign up
app.post('/signup', (req, res, next) => {
  let username = req.body.username;
  let password = req.body.password;

  console.log('user infos (signup) => ', username, password)

  return models.Users.get({ username })
    .then(user => {
      if(user) {

        console.log('(signup) user already exists')

        //if user already exists, throw use to catch and redirect
        throw user;
      }

      console.log('create the user');

      return models.Users.create({ userName, password });
    })
    .then(results => {
      let userSession = models.Sessions.update({ hash: req.session.hash }, { userId: results.insertId });

      console.log('user session => ', userSession)

      return models.Sessions.update({ hash: req.session.hash }, { userId: results.insertId });
    })
    .then(() => {
      // redirect to the root endpoint
      console.log('POST (signup) redirect to root endpoint')
      res.redirect('/')
    })
    .error(error => {
      console.log('POST (signup) throw error => ', error)
      res.status(500).send(error);
    })
    .catch(user => {
      console.log('POST (signup) redirect to signup endpoint')
      res.redirect('/signup');
    });
})





/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
