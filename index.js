// add an event listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Customizable Element Handler class
 * @class
 * @classdesc This class exists to handle a wide variety of elements by passing in a function *  * as a parameter to the constructor
 */
class ElementHandler {
  /**
   * Constructor to initialize the Element Handler
   * @param handler - callback function to be called on an element
   */
  constructor(handler) {
    this.handler = handler
  }

  /**
   * Function that is called when HTMLRewritter encounters a specified element
   *
   * @param element - the element that is encountered
   */
  element(element) {
    // delegate to the handler
    this.handler(element, elementHandlerConfig)
  }
}

/* global variable to hold information for rewriting HTML */
const elementHandlerConfig = { variant: 1, visitedBefore: false }

/* valid cookie options */
const validCookies = [0, 1]

/* rewritter to change elements of html before its sent in the response */
const rewriter = new HTMLRewriter()
  .on('title', new ElementHandler(handleTitle))
  .on('h1#title', new ElementHandler(handleHeaderOne))
  .on('a#url', new ElementHandler(handleHyperlink))
  .on('p#description', new ElementHandler(handleParagraph))

/**
 * Handler for the <title> tag
 *
 * @param element - the element to process
 * @param variantConfig - additional config info for conditional rendering
 */
function handleTitle(element, variantConfig) {
  element.setInnerContent(
    `Special Title for Variant ${variantConfig['variant']}`,
  )
}

/**
 * Handler for the <h1> tag
 *
 * @param element - the element to process
 * @param variantConfig - additional config info for conditional rendering
 */
function handleHeaderOne(element, variantConfig) {
  element.setInnerContent(
    `My Awesome h1 for Variant ${variantConfig['variant']}`,
  )
}

/**
 * Handler for the <p> tag
 *
 * @param element - the element to process
 * @param variantConfig - additional config info for conditional rendering
 */
function handleParagraph(element, variantConfig) {
  let revisitString =
    variantConfig['visitedBefore'] == true
      ? 'You have visited this page before, so the same variant is shown.'
      : ''
  element.setInnerContent(
    `My paragraph for Variant ${variantConfig['variant']}. ${revisitString}`,
  )
}

/**
 * Handler for the <a> tag
 *
 * @param element - the element to process
 * @param variantConfig - additional config info for conditional rendering
 */
function handleHyperlink(element, variant) {
  element.setAttribute('href', 'https://github.com/jameszhao01')
  element.setInnerContent('Check out my Github!!!')
}

/**
 * Helper function to extract the request url into an array of seperated paths
 *  e.g. https://example.com/ -> ['']
 *  e.g. https://example.com/someresources -> ['someresources']
 *
 * @param url - the url to parse
 */
function extractURL(url) {
  let splitUrl = url.split('/')
  // remove "https:", "",  and "example.com"
  return splitUrl.splice(3)
}

/**
 * Requests a list of greetings, and responds with a random one. Utilizes cookies
 * to repeat the same variant on the same visitor
 *
 * @param {Request} request - http request information, including headers and cookies
 */
async function handleRequest(request) {
  // check to make sure the request is only for the site root
  url = extractURL(request.url)
  // return empty response for other requests
  if (url.length != 1 || url[0] != '') return new Response('')

  // obtain raw cookie
  let rawCookie = request.headers.get('cookie')
  // cookie is undefined by default(if the predetermined cookie doesn't exist)
  let cookie = undefined
  // if there aren't any cookies in the header, there can't be any cookies at all
  if (rawCookie != null) {
    // find the cookie that starts with the right name
    let tempCookie = rawCookie
      .split(';')
      .find(item => item.trim().startsWith('james_yummy_cookie'))
    // if the cookie is found
    if (tempCookie != undefined) {
      // extract the cookie
      tempCookie = tempCookie.substring(tempCookie.indexOf('=') + 1)
      // check if the cookie is valid
      if (
        // the first portion of this if statement returns Nan if the tempCookie is an invalid number
        // By appending .0, any numbers with decimal components will be invalid. Thus, only integers
        // will pass this first statement. The second portion checks if its a valid cookie value
        +(tempCookie + '.0') != 'Nan' &&
        validCookies.includes((tempCookie = parseInt(tempCookie)))
      ) {
        // if it's a valid cookie value, set the cookie
        cookie = tempCookie
      }
    }
  }

  // query for the two variants and return it as json
  let jsonData = await fetch(
    'https://cfw-takehome.developers.workers.dev/api/variants',
  )
    .then(response => {
      return response.json()
    })
    .then(requestJson => {
      return requestJson
    })
    .catch(error => {
      console.error('Fetching error', error)
    })
  // obtain a random index, or use the cookie if its valid
  let randomIndex = cookie == undefined ? Math.floor(Math.random() * 2) : cookie
  // assign elementHandlerConfig values to use for HTML rewritting
  elementHandlerConfig['visitedBefore'] = cookie != undefined
  elementHandlerConfig['variant'] = randomIndex + 1

  // query the variant
  let variantHtml = await fetch(jsonData['variants'][randomIndex])
  // transform the html
  variantHtml = rewriter.transform(variantHtml)

  // return the response
  return new Response(await variantHtml.text(), {
    headers: {
      'Set-Cookie': `james_yummy_cookie=${randomIndex}`,
      'content-type': 'text/html',
    },
  })
}
