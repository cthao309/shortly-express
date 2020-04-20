const parseCookies = (req, res, next) => {

  // res.cookie('test1 => ', 'hello world')

  // retrieive the cookie from request or initialized to empty string
  let cookieString = req.get('Cookie') || '';

  // retreive all the fields in the cookie
  let parsedCookies = cookieString.split('; ').reduce((cookies, cookie) => {
    if(cookie.length) {
      let indx = cookie.indexOf('=');
      let token = cookie.slice(0, indx);
      let key = cookie.slice(0, indx);

      cookies[key] = token;
    }

    return cookies;
  }, {});

  req.cookies = parsedCookies;

  next();
};

module.exports = parseCookies;