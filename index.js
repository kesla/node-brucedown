var extend     = require('xtend')
  , map        = require('map-async')
  , marked     = require('marked')
  , pygmentize = require('pygmentize-bundled')

  , codeCache  = {}

function Processor (source, options) {
  this.source = source
  this.blocks = []

  options = extend(options, {
      gfm: true
    , pedantic: false
    , sanitize: false
    , highlight: this.highlight.bind(this)
  })
  marked.setOptions(options)
}

Processor.prototype.highlight = function(code, lang) {
  if (typeof lang != 'string') return code
  this.blocks.push({ code: code, lang: lang.toLowerCase() })
  return '<CODEBLOCK id="' + this.blocks.length + '"/>'
}

Processor.prototype.process = function (callback) {
  var html         = marked(this.source + '\n')
    , newCodeCache = {}

  map(
      this.blocks
    , function (block, callback) {
        var key = block.lang + block.code
        if (codeCache[key]) return callback(null, newCodeCache[key] = codeCache[key])
        pygmentize({ lang: block.lang, format: 'html' }, block.code, function (err, html) {
          if (err) return callback(err)
          callback(null, newCodeCache[key] = html)
        })
      }
    , function (err, blocks) {
        if (err) return callback(err)
        blocks.forEach(function (code, i) {
          var re = new RegExp('<pre><code class="[^"]*"><CODEBLOCK id="' + (i + 1) + '"/></code></pre>')
          html = html.replace(re, code)
        })
        codeCache = newCodeCache
        callback(null, html)
      }
  )

  return this
}

module.exports = function (input, options, callback) {
  if (!callback) {
    callback = options
    options = {}
  }
  new Processor(input, options).process(callback)
}
