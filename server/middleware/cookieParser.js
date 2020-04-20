const parseCookies = (req, res, next) => {

  res.cookie('test1 => ', 'hello world')

  next();
};

module.exports = parseCookies;