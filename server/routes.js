
  
const routes = require('next-routes')
const routesImplementation = routes()

routesImplementation.add('/:slug', 'index')
routesImplementation.add('/more/:slug', 'index')

module.exports = routesImplementation