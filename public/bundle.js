(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Vue, app, appOptions;

Vue = require('vue');

appOptions = require('./app.vue');

app = new Vue(appOptions).$mount('body');



},{"./app.vue":65,"vue":63}],2:[function(require,module,exports){
var inserted = {};

module.exports = function (css, options) {
    if (inserted[css]) return;
    inserted[css] = true;
    
    var elem = document.createElement('style');
    elem.setAttribute('type', 'text/css');

    if ('textContent' in elem) {
      elem.textContent = css;
    } else {
      elem.styleSheet.cssText = css;
    }
    
    var head = document.getElementsByTagName('head')[0];
    if (options && options.prepend) {
        head.insertBefore(elem, head.childNodes[0]);
    } else {
        head.appendChild(elem);
    }
};

},{}],3:[function(require,module,exports){
var _ = require('../util')

/**
 * Create a child instance that prototypally inehrits
 * data on parent. To achieve that we create an intermediate
 * constructor with its prototype pointing to parent.
 *
 * @param {Object} opts
 * @param {Function} [BaseCtor]
 * @return {Vue}
 * @public
 */

exports.$addChild = function (opts, BaseCtor) {
  BaseCtor = BaseCtor || _.Vue
  opts = opts || {}
  var parent = this
  var ChildVue
  var inherit = opts.inherit !== undefined
    ? opts.inherit
    : BaseCtor.options.inherit
  if (inherit) {
    var ctors = parent._childCtors
    if (!ctors) {
      ctors = parent._childCtors = {}
    }
    ChildVue = ctors[BaseCtor.cid]
    if (!ChildVue) {
      var optionName = BaseCtor.options.name
      var className = optionName
        ? _.camelize(optionName, true)
        : 'VueComponent'
      ChildVue = new Function(
        'return function ' + className + ' (options) {' +
        'this.constructor = ' + className + ';' +
        'this._init(options) }'
      )()
      ChildVue.options = BaseCtor.options
      ChildVue.prototype = this
      ctors[BaseCtor.cid] = ChildVue
    }
  } else {
    ChildVue = BaseCtor
  }
  opts._parent = parent
  opts._root = parent.$root
  var child = new ChildVue(opts)
  if (!this._children) {
    this._children = []
  }
  this._children.push(child)
  return child
}
},{"../util":60}],4:[function(require,module,exports){
var _ = require('../util')
var Watcher = require('../watcher')
var Path = require('../parsers/path')
var textParser = require('../parsers/text')
var dirParser = require('../parsers/directive')
var expParser = require('../parsers/expression')
var filterRE = /[^|]\|[^|]/

/**
 * Get the value from an expression on this vm.
 *
 * @param {String} exp
 * @return {*}
 */

exports.$get = function (exp) {
  var res = expParser.parse(exp)
  if (res) {
    return res.get.call(this, this)
  }
}

/**
 * Set the value from an expression on this vm.
 * The expression must be a valid left-hand
 * expression in an assignment.
 *
 * @param {String} exp
 * @param {*} val
 */

exports.$set = function (exp, val) {
  var res = expParser.parse(exp, true)
  if (res && res.set) {
    res.set.call(this, this, val)
  }
}

/**
 * Add a property on the VM
 *
 * @param {String} key
 * @param {*} val
 */

exports.$add = function (key, val) {
  this._data.$add(key, val)
}

/**
 * Delete a property on the VM
 *
 * @param {String} key
 */

exports.$delete = function (key) {
  this._data.$delete(key)
}

/**
 * Watch an expression, trigger callback when its
 * value changes.
 *
 * @param {String} exp
 * @param {Function} cb
 * @param {Boolean} [deep]
 * @param {Boolean} [immediate]
 * @return {Function} - unwatchFn
 */

exports.$watch = function (exp, cb, deep, immediate) {
  var vm = this
  var key = deep ? exp + '**deep**' : exp
  var watcher = vm._userWatchers[key]
  var wrappedCb = function (val, oldVal) {
    cb.call(vm, val, oldVal)
  }
  if (!watcher) {
    watcher = vm._userWatchers[key] =
      new Watcher(vm, exp, wrappedCb, {
        deep: deep,
        user: true
      })
  } else {
    watcher.addCb(wrappedCb)
  }
  if (immediate) {
    wrappedCb(watcher.value)
  }
  return function unwatchFn () {
    watcher.removeCb(wrappedCb)
    if (!watcher.active) {
      vm._userWatchers[key] = null
    }
  }
}

/**
 * Evaluate a text directive, including filters.
 *
 * @param {String} text
 * @return {String}
 */

exports.$eval = function (text) {
  // check for filters.
  if (filterRE.test(text)) {
    var dir = dirParser.parse(text)[0]
    // the filter regex check might give false positive
    // for pipes inside strings, so it's possible that
    // we don't get any filters here
    return dir.filters
      ? _.applyFilters(
          this.$get(dir.expression),
          _.resolveFilters(this, dir.filters).read,
          this
        )
      : this.$get(dir.expression)
  } else {
    // no filter
    return this.$get(text)
  }
}

/**
 * Interpolate a piece of template text.
 *
 * @param {String} text
 * @return {String}
 */

exports.$interpolate = function (text) {
  var tokens = textParser.parse(text)
  var vm = this
  if (tokens) {
    return tokens.length === 1
      ? vm.$eval(tokens[0].value)
      : tokens.map(function (token) {
          return token.tag
            ? vm.$eval(token.value)
            : token.value
        }).join('')
  } else {
    return text
  }
}

/**
 * Log instance data as a plain JS object
 * so that it is easier to inspect in console.
 * This method assumes console is available.
 *
 * @param {String} [path]
 */

exports.$log = function (path) {
  var data = path
    ? Path.get(this._data, path)
    : this._data
  if (data) {
    data = JSON.parse(JSON.stringify(data))
  }
  console.log(data)
}
},{"../parsers/directive":48,"../parsers/expression":49,"../parsers/path":50,"../parsers/text":52,"../util":60,"../watcher":64}],5:[function(require,module,exports){
var _ = require('../util')
var transition = require('../transition')

/**
 * Append instance to target
 *
 * @param {Node} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$appendTo = function (target, cb, withTransition) {
  return insert(
    this, target, cb, withTransition,
    append, transition.append
  )
}

/**
 * Prepend instance to target
 *
 * @param {Node} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$prependTo = function (target, cb, withTransition) {
  target = query(target)
  if (target.hasChildNodes()) {
    this.$before(target.firstChild, cb, withTransition)
  } else {
    this.$appendTo(target, cb, withTransition)
  }
  return this
}

/**
 * Insert instance before target
 *
 * @param {Node} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$before = function (target, cb, withTransition) {
  return insert(
    this, target, cb, withTransition,
    before, transition.before
  )
}

/**
 * Insert instance after target
 *
 * @param {Node} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$after = function (target, cb, withTransition) {
  target = query(target)
  if (target.nextSibling) {
    this.$before(target.nextSibling, cb, withTransition)
  } else {
    this.$appendTo(target.parentNode, cb, withTransition)
  }
  return this
}

/**
 * Remove instance from DOM
 *
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$remove = function (cb, withTransition) {
  var inDoc = this._isAttached && _.inDoc(this.$el)
  // if we are not in document, no need to check
  // for transitions
  if (!inDoc) withTransition = false
  var op
  var self = this
  var realCb = function () {
    if (inDoc) self._callHook('detached')
    if (cb) cb()
  }
  if (
    this._isBlock &&
    !this._blockFragment.hasChildNodes()
  ) {
    op = withTransition === false
      ? append
      : transition.removeThenAppend
    blockOp(this, this._blockFragment, op, realCb)
  } else {
    op = withTransition === false
      ? remove
      : transition.remove
    op(this.$el, this, realCb)
  }
  return this
}

/**
 * Shared DOM insertion function.
 *
 * @param {Vue} vm
 * @param {Element} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition]
 * @param {Function} op1 - op for non-transition insert
 * @param {Function} op2 - op for transition insert
 * @return vm
 */

function insert (vm, target, cb, withTransition, op1, op2) {
  target = query(target)
  var targetIsDetached = !_.inDoc(target)
  var op = withTransition === false || targetIsDetached
    ? op1
    : op2
  var shouldCallHook =
    !targetIsDetached &&
    !vm._isAttached &&
    !_.inDoc(vm.$el)
  if (vm._isBlock) {
    blockOp(vm, target, op, cb)
  } else {
    op(vm.$el, target, vm, cb)
  }
  if (shouldCallHook) {
    vm._callHook('attached')
  }
  return vm
}

/**
 * Execute a transition operation on a block instance,
 * iterating through all its block nodes.
 *
 * @param {Vue} vm
 * @param {Node} target
 * @param {Function} op
 * @param {Function} cb
 */

function blockOp (vm, target, op, cb) {
  var current = vm._blockStart
  var end = vm._blockEnd
  var next
  while (next !== end) {
    next = current.nextSibling
    op(current, target, vm)
    current = next
  }
  op(end, target, vm, cb)
}

/**
 * Check for selectors
 *
 * @param {String|Element} el
 */

function query (el) {
  return typeof el === 'string'
    ? document.querySelector(el)
    : el
}

/**
 * Append operation that takes a callback.
 *
 * @param {Node} el
 * @param {Node} target
 * @param {Vue} vm - unused
 * @param {Function} [cb]
 */

function append (el, target, vm, cb) {
  target.appendChild(el)
  if (cb) cb()
}

/**
 * InsertBefore operation that takes a callback.
 *
 * @param {Node} el
 * @param {Node} target
 * @param {Vue} vm - unused
 * @param {Function} [cb]
 */

function before (el, target, vm, cb) {
  _.before(el, target)
  if (cb) cb()
}

/**
 * Remove operation that takes a callback.
 *
 * @param {Node} el
 * @param {Vue} vm - unused
 * @param {Function} [cb]
 */

function remove (el, vm, cb) {
  _.remove(el)
  if (cb) cb()
}
},{"../transition":54,"../util":60}],6:[function(require,module,exports){
var _ = require('../util')

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 */

exports.$on = function (event, fn) {
  (this._events[event] || (this._events[event] = []))
    .push(fn)
  modifyListenerCount(this, event, 1)
  return this
}

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 */

exports.$once = function (event, fn) {
  var self = this
  function on () {
    self.$off(event, on)
    fn.apply(this, arguments)
  }
  on.fn = fn
  this.$on(event, on)
  return this
}

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 */

exports.$off = function (event, fn) {
  var cbs
  // all
  if (!arguments.length) {
    if (this.$parent) {
      for (event in this._events) {
        cbs = this._events[event]
        if (cbs) {
          modifyListenerCount(this, event, -cbs.length)
        }
      }
    }
    this._events = {}
    return this
  }
  // specific event
  cbs = this._events[event]
  if (!cbs) {
    return this
  }
  if (arguments.length === 1) {
    modifyListenerCount(this, event, -cbs.length)
    this._events[event] = null
    return this
  }
  // specific handler
  var cb
  var i = cbs.length
  while (i--) {
    cb = cbs[i]
    if (cb === fn || cb.fn === fn) {
      modifyListenerCount(this, event, -1)
      cbs.splice(i, 1)
      break
    }
  }
  return this
}

/**
 * Trigger an event on self.
 *
 * @param {String} event
 */

exports.$emit = function (event) {
  this._eventCancelled = false
  var cbs = this._events[event]
  if (cbs) {
    // avoid leaking arguments:
    // http://jsperf.com/closure-with-arguments
    var i = arguments.length - 1
    var args = new Array(i)
    while (i--) {
      args[i] = arguments[i + 1]
    }
    i = 0
    cbs = cbs.length > 1
      ? _.toArray(cbs)
      : cbs
    for (var l = cbs.length; i < l; i++) {
      if (cbs[i].apply(this, args) === false) {
        this._eventCancelled = true
      }
    }
  }
  return this
}

/**
 * Recursively broadcast an event to all children instances.
 *
 * @param {String} event
 * @param {...*} additional arguments
 */

exports.$broadcast = function (event) {
  // if no child has registered for this event,
  // then there's no need to broadcast.
  if (!this._eventsCount[event]) return
  var children = this._children
  if (children) {
    for (var i = 0, l = children.length; i < l; i++) {
      var child = children[i]
      child.$emit.apply(child, arguments)
      if (!child._eventCancelled) {
        child.$broadcast.apply(child, arguments)
      }
    }
  }
  return this
}

/**
 * Recursively propagate an event up the parent chain.
 *
 * @param {String} event
 * @param {...*} additional arguments
 */

exports.$dispatch = function () {
  var parent = this.$parent
  while (parent) {
    parent.$emit.apply(parent, arguments)
    parent = parent._eventCancelled
      ? null
      : parent.$parent
  }
  return this
}

/**
 * Modify the listener counts on all parents.
 * This bookkeeping allows $broadcast to return early when
 * no child has listened to a certain event.
 *
 * @param {Vue} vm
 * @param {String} event
 * @param {Number} count
 */

var hookRE = /^hook:/
function modifyListenerCount (vm, event, count) {
  var parent = vm.$parent
  // hooks do not get broadcasted so no need
  // to do bookkeeping for them
  if (!parent || !count || hookRE.test(event)) return
  while (parent) {
    parent._eventsCount[event] =
      (parent._eventsCount[event] || 0) + count
    parent = parent.$parent
  }
}
},{"../util":60}],7:[function(require,module,exports){
var _ = require('../util')
var mergeOptions = require('../util/merge-option')

/**
 * Expose useful internals
 */

exports.util = _
exports.nextTick = _.nextTick
exports.config = require('../config')

exports.compiler = {
  compile: require('../compiler/compile'),
  transclude: require('../compiler/transclude')
}

exports.parsers = {
  path: require('../parsers/path'),
  text: require('../parsers/text'),
  template: require('../parsers/template'),
  directive: require('../parsers/directive'),
  expression: require('../parsers/expression')
}

/**
 * Each instance constructor, including Vue, has a unique
 * cid. This enables us to create wrapped "child
 * constructors" for prototypal inheritance and cache them.
 */

exports.cid = 0
var cid = 1

/**
 * Class inehritance
 *
 * @param {Object} extendOptions
 */

exports.extend = function (extendOptions) {
  extendOptions = extendOptions || {}
  var Super = this
  var Sub = createClass(extendOptions.name || 'VueComponent')
  Sub.prototype = Object.create(Super.prototype)
  Sub.prototype.constructor = Sub
  Sub.cid = cid++
  Sub.options = mergeOptions(
    Super.options,
    extendOptions
  )
  Sub['super'] = Super
  // allow further extension
  Sub.extend = Super.extend
  // create asset registers, so extended classes
  // can have their private assets too.
  createAssetRegisters(Sub)
  return Sub
}

/**
 * A function that returns a sub-class constructor with the
 * given name. This gives us much nicer output when
 * logging instances in the console.
 *
 * @param {String} name
 * @return {Function}
 */

function createClass (name) {
  return new Function(
    'return function ' + _.camelize(name, true) +
    ' (options) { this._init(options) }'
  )()
}

/**
 * Plugin system
 *
 * @param {Object} plugin
 */

exports.use = function (plugin) {
  // additional parameters
  var args = _.toArray(arguments, 1)
  args.unshift(this)
  if (typeof plugin.install === 'function') {
    plugin.install.apply(plugin, args)
  } else {
    plugin.apply(null, args)
  }
  return this
}

/**
 * Define asset registration methods on a constructor.
 *
 * @param {Function} Constructor
 */

var assetTypes = [
  'directive',
  'filter',
  'partial',
  'transition'
]

function createAssetRegisters (Constructor) {

  /* Asset registration methods share the same signature:
   *
   * @param {String} id
   * @param {*} definition
   */

  assetTypes.forEach(function (type) {
    Constructor[type] = function (id, definition) {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        this.options[type + 's'][id] = definition
      }
    }
  })

  /**
   * Component registration needs to automatically invoke
   * Vue.extend on object values.
   *
   * @param {String} id
   * @param {Object|Function} definition
   */

  Constructor.component = function (id, definition) {
    if (!definition) {
      return this.options.components[id]
    } else {
      if (_.isPlainObject(definition)) {
        definition.name = id
        definition = _.Vue.extend(definition)
      }
      this.options.components[id] = definition
    }
  }
}

createAssetRegisters(exports)
},{"../compiler/compile":11,"../compiler/transclude":12,"../config":13,"../parsers/directive":48,"../parsers/expression":49,"../parsers/path":50,"../parsers/template":51,"../parsers/text":52,"../util":60,"../util/merge-option":62}],8:[function(require,module,exports){
var _ = require('../util')
var compile = require('../compiler/compile')

/**
 * Set instance target element and kick off the compilation
 * process. The passed in `el` can be a selector string, an
 * existing Element, or a DocumentFragment (for block
 * instances).
 *
 * @param {Element|DocumentFragment|string} el
 * @public
 */

exports.$mount = function (el) {
  if (this._isCompiled) {
    _.warn('$mount() should be called only once.')
    return
  }
  if (!el) {
    el = document.createElement('div')
  } else if (typeof el === 'string') {
    var selector = el
    el = document.querySelector(el)
    if (!el) {
      _.warn('Cannot find element: ' + selector)
      return
    }
  }
  this._compile(el)
  this._isCompiled = true
  this._callHook('compiled')
  if (_.inDoc(this.$el)) {
    this._callHook('attached')
    this._initDOMHooks()
    ready.call(this)
  } else {
    this._initDOMHooks()
    this.$once('hook:attached', ready)
  }
  return this
}

/**
 * Mark an instance as ready.
 */

function ready () {
  this._isAttached = true
  this._isReady = true
  this._callHook('ready')
}

/**
 * Teardown the instance, simply delegate to the internal
 * _destroy.
 */

exports.$destroy = function (remove, deferCleanup) {
  this._destroy(remove, deferCleanup)
}

/**
 * Partially compile a piece of DOM and return a
 * decompile function.
 *
 * @param {Element|DocumentFragment} el
 * @return {Function}
 */

exports.$compile = function (el) {
  return compile(el, this.$options, true)(this, el)
}
},{"../compiler/compile":11,"../util":60}],9:[function(require,module,exports){
var _ = require('./util')

// we have two separate queues: one for directive updates
// and one for user watcher registered via $watch().
// we want to guarantee directive updates to be called
// before user watchers so that when user watchers are
// triggered, the DOM would have already been in updated
// state.
var queue = []
var userQueue = []
var has = {}
var waiting = false
var flushing = false

/**
 * Reset the batcher's state.
 */

function reset () {
  queue = []
  userQueue = []
  has = {}
  waiting = false
  flushing = false
}

/**
 * Flush both queues and run the jobs.
 */

function flush () {
  flushing = true
  run(queue)
  run(userQueue)
  reset()
}

/**
 * Run the jobs in a single queue.
 *
 * @param {Array} queue
 */

function run (queue) {
  // do not cache length because more jobs might be pushed
  // as we run existing jobs
  for (var i = 0; i < queue.length; i++) {
    queue[i].run()
  }
}

/**
 * Push a job into the job queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 *
 * @param {Object} job
 *   properties:
 *   - {String|Number} id
 *   - {Function}      run
 */

exports.push = function (job) {
  if (!job.id || !has[job.id] || flushing) {
    // A user watcher callback could trigger another
    // directive update during the flushing; at that time
    // the directive queue would already have been run, so
    // we call that update immediately as it is pushed.
    if (flushing && !job.user) {
      job.run()
      return
    }
    ;(job.user ? userQueue : queue).push(job)
    has[job.id] = job
    if (!waiting) {
      waiting = true
      _.nextTick(flush)
    }
  }
}
},{"./util":60}],10:[function(require,module,exports){
/**
 * A doubly linked list-based Least Recently Used (LRU)
 * cache. Will keep most recently used items while
 * discarding least recently used items when its limit is
 * reached. This is a bare-bone version of
 * Rasmus Andersson's js-lru:
 *
 *   https://github.com/rsms/js-lru
 *
 * @param {Number} limit
 * @constructor
 */

function Cache (limit) {
  this.size = 0
  this.limit = limit
  this.head = this.tail = undefined
  this._keymap = {}
}

var p = Cache.prototype

/**
 * Put <value> into the cache associated with <key>.
 * Returns the entry which was removed to make room for
 * the new entry. Otherwise undefined is returned.
 * (i.e. if there was enough room already).
 *
 * @param {String} key
 * @param {*} value
 * @return {Entry|undefined}
 */

p.put = function (key, value) {
  var entry = {
    key:key,
    value:value
  }
  this._keymap[key] = entry
  if (this.tail) {
    this.tail.newer = entry
    entry.older = this.tail
  } else {
    this.head = entry
  }
  this.tail = entry
  if (this.size === this.limit) {
    return this.shift()
  } else {
    this.size++
  }
}

/**
 * Purge the least recently used (oldest) entry from the
 * cache. Returns the removed entry or undefined if the
 * cache was empty.
 */

p.shift = function () {
  var entry = this.head
  if (entry) {
    this.head = this.head.newer
    this.head.older = undefined
    entry.newer = entry.older = undefined
    this._keymap[entry.key] = undefined
  }
  return entry
}

/**
 * Get and register recent use of <key>. Returns the value
 * associated with <key> or undefined if not in cache.
 *
 * @param {String} key
 * @param {Boolean} returnEntry
 * @return {Entry|*}
 */

p.get = function (key, returnEntry) {
  var entry = this._keymap[key]
  if (entry === undefined) return
  if (entry === this.tail) {
    return returnEntry
      ? entry
      : entry.value
  }
  // HEAD--------------TAIL
  //   <.older   .newer>
  //  <--- add direction --
  //   A  B  C  <D>  E
  if (entry.newer) {
    if (entry === this.head) {
      this.head = entry.newer
    }
    entry.newer.older = entry.older // C <-- E.
  }
  if (entry.older) {
    entry.older.newer = entry.newer // C. --> E
  }
  entry.newer = undefined // D --x
  entry.older = this.tail // D. --> E
  if (this.tail) {
    this.tail.newer = entry // E. <-- D
  }
  this.tail = entry
  return returnEntry
    ? entry
    : entry.value
}

module.exports = Cache
},{}],11:[function(require,module,exports){
var _ = require('../util')
var config = require('../config')
var textParser = require('../parsers/text')
var dirParser = require('../parsers/directive')
var templateParser = require('../parsers/template')

/**
 * Compile a template and return a reusable composite link
 * function, which recursively contains more link functions
 * inside. This top level compile function should only be
 * called on instance root nodes.
 *
 * When the `asParent` flag is true, this means we are doing
 * a partial compile for a component's parent scope markup
 * (See #502). This could **only** be triggered during
 * compilation of `v-component`, and we need to skip v-with,
 * v-ref & v-component in this situation.
 *
 * @param {Element|DocumentFragment} el
 * @param {Object} options
 * @param {Boolean} partial
 * @param {Boolean} asParent - compiling a component
 *                             container as its parent.
 * @return {Function}
 */

module.exports = function compile (el, options, partial, asParent) {
  var params = !partial && options.paramAttributes
  var paramsLinkFn = params
    ? compileParamAttributes(el, params, options)
    : null
  var nodeLinkFn = el instanceof DocumentFragment
    ? null
    : compileNode(el, options, asParent)
  var childLinkFn =
    !(nodeLinkFn && nodeLinkFn.terminal) &&
    el.tagName !== 'SCRIPT' &&
    el.hasChildNodes()
      ? compileNodeList(el.childNodes, options)
      : null

  /**
   * A linker function to be called on a already compiled
   * piece of DOM, which instantiates all directive
   * instances.
   *
   * @param {Vue} vm
   * @param {Element|DocumentFragment} el
   * @return {Function|undefined}
   */

  return function link (vm, el) {
    var originalDirCount = vm._directives.length
    if (paramsLinkFn) paramsLinkFn(vm, el)
    if (nodeLinkFn) nodeLinkFn(vm, el)
    if (childLinkFn) childLinkFn(vm, el.childNodes)

    /**
     * If this is a partial compile, the linker function
     * returns an unlink function that tearsdown all
     * directives instances generated during the partial
     * linking.
     */

    if (partial) {
      var dirs = vm._directives.slice(originalDirCount)
      return function unlink () {
        var i = dirs.length
        while (i--) {
          dirs[i]._teardown()
        }
        i = vm._directives.indexOf(dirs[0])
        vm._directives.splice(i, dirs.length)
      }
    }
  }
}

/**
 * Compile a node and return a nodeLinkFn based on the
 * node type.
 *
 * @param {Node} node
 * @param {Object} options
 * @param {Boolean} asParent
 * @return {Function|undefined}
 */

function compileNode (node, options, asParent) {
  var type = node.nodeType
  if (type === 1 && node.tagName !== 'SCRIPT') {
    return compileElement(node, options, asParent)
  } else if (type === 3 && config.interpolate) {
    return compileTextNode(node, options)
  }
}

/**
 * Compile an element and return a nodeLinkFn.
 *
 * @param {Element} el
 * @param {Object} options
 * @param {Boolean} asParent
 * @return {Function|null}
 */

function compileElement (el, options, asParent) {
  var linkFn, tag, component
  // check custom element component, but only on non-root
  if (!asParent && !el.__vue__) {
    tag = el.tagName.toLowerCase()
    component =
      tag.indexOf('-') > 0 &&
      options.components[tag]
    if (component) {
      el.setAttribute(config.prefix + 'component', tag)
    }
  }
  if (component || el.hasAttributes()) {
    // check terminal direcitves
    if (!asParent) {
      linkFn = checkTerminalDirectives(el, options)
    }
    // if not terminal, build normal link function
    if (!linkFn) {
      var dirs = collectDirectives(el, options, asParent)
      linkFn = dirs.length
        ? makeDirectivesLinkFn(dirs)
        : null
    }
  }
  // if the element is a textarea, we need to interpolate
  // its content on initial render.
  if (el.tagName === 'TEXTAREA') {
    var realLinkFn = linkFn
    linkFn = function (vm, el) {
      el.value = vm.$interpolate(el.value)
      if (realLinkFn) realLinkFn(vm, el)
    }
    linkFn.terminal = true
  }
  return linkFn
}

/**
 * Build a multi-directive link function.
 *
 * @param {Array} directives
 * @return {Function} directivesLinkFn
 */

function makeDirectivesLinkFn (directives) {
  return function directivesLinkFn (vm, el) {
    // reverse apply because it's sorted low to high
    var i = directives.length
    var dir, j, k
    while (i--) {
      dir = directives[i]
      if (dir._link) {
        // custom link fn
        dir._link(vm, el)
      } else {
        k = dir.descriptors.length
        for (j = 0; j < k; j++) {
          vm._bindDir(dir.name, el,
                      dir.descriptors[j], dir.def)
        }
      }
    }
  }
}

/**
 * Compile a textNode and return a nodeLinkFn.
 *
 * @param {TextNode} node
 * @param {Object} options
 * @return {Function|null} textNodeLinkFn
 */

function compileTextNode (node, options) {
  var tokens = textParser.parse(node.nodeValue)
  if (!tokens) {
    return null
  }
  var frag = document.createDocumentFragment()
  var el, token
  for (var i = 0, l = tokens.length; i < l; i++) {
    token = tokens[i]
    el = token.tag
      ? processTextToken(token, options)
      : document.createTextNode(token.value)
    frag.appendChild(el)
  }
  return makeTextNodeLinkFn(tokens, frag, options)
}

/**
 * Process a single text token.
 *
 * @param {Object} token
 * @param {Object} options
 * @return {Node}
 */

function processTextToken (token, options) {
  var el
  if (token.oneTime) {
    el = document.createTextNode(token.value)
  } else {
    if (token.html) {
      el = document.createComment('v-html')
      setTokenType('html')
    } else if (token.partial) {
      el = document.createComment('v-partial')
      setTokenType('partial')
    } else {
      // IE will clean up empty textNodes during
      // frag.cloneNode(true), so we have to give it
      // something here...
      el = document.createTextNode(' ')
      setTokenType('text')
    }
  }
  function setTokenType (type) {
    token.type = type
    token.def = options.directives[type]
    token.descriptor = dirParser.parse(token.value)[0]
  }
  return el
}

/**
 * Build a function that processes a textNode.
 *
 * @param {Array<Object>} tokens
 * @param {DocumentFragment} frag
 */

function makeTextNodeLinkFn (tokens, frag) {
  return function textNodeLinkFn (vm, el) {
    var fragClone = frag.cloneNode(true)
    var childNodes = _.toArray(fragClone.childNodes)
    var token, value, node
    for (var i = 0, l = tokens.length; i < l; i++) {
      token = tokens[i]
      value = token.value
      if (token.tag) {
        node = childNodes[i]
        if (token.oneTime) {
          value = vm.$eval(value)
          if (token.html) {
            _.replace(node, templateParser.parse(value, true))
          } else {
            node.nodeValue = value
          }
        } else {
          vm._bindDir(token.type, node,
                      token.descriptor, token.def)
        }
      }
    }
    _.replace(el, fragClone)
  }
}

/**
 * Compile a node list and return a childLinkFn.
 *
 * @param {NodeList} nodeList
 * @param {Object} options
 * @return {Function|undefined}
 */

function compileNodeList (nodeList, options) {
  var linkFns = []
  var nodeLinkFn, childLinkFn, node
  for (var i = 0, l = nodeList.length; i < l; i++) {
    node = nodeList[i]
    nodeLinkFn = compileNode(node, options)
    childLinkFn =
      !(nodeLinkFn && nodeLinkFn.terminal) &&
      node.tagName !== 'SCRIPT' &&
      node.hasChildNodes()
        ? compileNodeList(node.childNodes, options)
        : null
    linkFns.push(nodeLinkFn, childLinkFn)
  }
  return linkFns.length
    ? makeChildLinkFn(linkFns)
    : null
}

/**
 * Make a child link function for a node's childNodes.
 *
 * @param {Array<Function>} linkFns
 * @return {Function} childLinkFn
 */

function makeChildLinkFn (linkFns) {
  return function childLinkFn (vm, nodes) {
    // stablize nodes
    nodes = _.toArray(nodes)
    var node, nodeLinkFn, childrenLinkFn
    for (var i = 0, n = 0, l = linkFns.length; i < l; n++) {
      node = nodes[n]
      nodeLinkFn = linkFns[i++]
      childrenLinkFn = linkFns[i++]
      if (nodeLinkFn) {
        nodeLinkFn(vm, node)
      }
      if (childrenLinkFn) {
        childrenLinkFn(vm, node.childNodes)
      }
    }
  }
}

/**
 * Compile param attributes on a root element and return
 * a paramAttributes link function.
 *
 * @param {Element} el
 * @param {Array} attrs
 * @param {Object} options
 * @return {Function} paramsLinkFn
 */

function compileParamAttributes (el, attrs, options) {
  var params = []
  var i = attrs.length
  var name, value, param
  while (i--) {
    name = attrs[i]
    value = el.getAttribute(name)
    if (value !== null) {
      param = {
        name: name,
        value: value
      }
      var tokens = textParser.parse(value)
      if (tokens) {
        el.removeAttribute(name)
        if (tokens.length > 1) {
          _.warn(
            'Invalid param attribute binding: "' +
            name + '="' + value + '"' +
            '\nDon\'t mix binding tags with plain text ' +
            'in param attribute bindings.'
          )
          continue
        } else {
          param.dynamic = true
          param.value = tokens[0].value
        }
      }
      params.push(param)
    }
  }
  return makeParamsLinkFn(params, options)
}

/**
 * Build a function that applies param attributes to a vm.
 *
 * @param {Array} params
 * @param {Object} options
 * @return {Function} paramsLinkFn
 */

var dataAttrRE = /^data-/

function makeParamsLinkFn (params, options) {
  var def = options.directives['with']
  return function paramsLinkFn (vm, el) {
    var i = params.length
    var param, path
    while (i--) {
      param = params[i]
      // params could contain dashes, which will be
      // interpreted as minus calculations by the parser
      // so we need to wrap the path here
      path = _.camelize(param.name.replace(dataAttrRE, ''))
      if (param.dynamic) {
        // dynamic param attribtues are bound as v-with.
        // we can directly duck the descriptor here beacuse
        // param attributes cannot use expressions or
        // filters.
        vm._bindDir('with', el, {
          arg: path,
          expression: param.value
        }, def)
      } else {
        // just set once
        vm.$set(path, param.value)
      }
    }
  }
}

/**
 * Check an element for terminal directives in fixed order.
 * If it finds one, return a terminal link function.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Function} terminalLinkFn
 */

var terminalDirectives = [
  'repeat',
  'if',
  'component'
]

function skip () {}
skip.terminal = true

function checkTerminalDirectives (el, options) {
  if (_.attr(el, 'pre') !== null) {
    return skip
  }
  var value, dirName
  /* jshint boss: true */
  for (var i = 0; i < 3; i++) {
    dirName = terminalDirectives[i]
    if (value = _.attr(el, dirName)) {
      return makeTeriminalLinkFn(el, dirName, value, options)
    }
  }
}

/**
 * Build a link function for a terminal directive.
 *
 * @param {Element} el
 * @param {String} dirName
 * @param {String} value
 * @param {Object} options
 * @return {Function} terminalLinkFn
 */

function makeTeriminalLinkFn (el, dirName, value, options) {
  var descriptor = dirParser.parse(value)[0]
  var def = options.directives[dirName]
  var terminalLinkFn = function (vm, el) {
    vm._bindDir(dirName, el, descriptor, def)
  }
  terminalLinkFn.terminal = true
  return terminalLinkFn
}

/**
 * Collect the directives on an element.
 *
 * @param {Element} el
 * @param {Object} options
 * @param {Boolean} asParent
 * @return {Array}
 */

function collectDirectives (el, options, asParent) {
  var attrs = _.toArray(el.attributes)
  var i = attrs.length
  var dirs = []
  var attr, attrName, dir, dirName, dirDef
  while (i--) {
    attr = attrs[i]
    attrName = attr.name
    if (attrName.indexOf(config.prefix) === 0) {
      dirName = attrName.slice(config.prefix.length)
      if (asParent &&
          (dirName === 'with' ||
           dirName === 'component')) {
        continue
      }
      dirDef = options.directives[dirName]
      _.assertAsset(dirDef, 'directive', dirName)
      if (dirDef) {
        dirs.push({
          name: dirName,
          descriptors: dirParser.parse(attr.value),
          def: dirDef
        })
      }
    } else if (config.interpolate) {
      dir = collectAttrDirective(el, attrName, attr.value,
                                 options)
      if (dir) {
        dirs.push(dir)
      }
    }
  }
  // sort by priority, LOW to HIGH
  dirs.sort(directiveComparator)
  return dirs
}

/**
 * Check an attribute for potential dynamic bindings,
 * and return a directive object.
 *
 * @param {Element} el
 * @param {String} name
 * @param {String} value
 * @param {Object} options
 * @return {Object}
 */

function collectAttrDirective (el, name, value, options) {
  if (options._skipAttrs &&
      options._skipAttrs.indexOf(name) > -1) {
    return
  }
  var tokens = textParser.parse(value)
  if (tokens) {
    var def = options.directives.attr
    var i = tokens.length
    var allOneTime = true
    while (i--) {
      var token = tokens[i]
      if (token.tag && !token.oneTime) {
        allOneTime = false
      }
    }
    return {
      def: def,
      _link: allOneTime
        ? function (vm, el) {
            el.setAttribute(name, vm.$interpolate(value))
          }
        : function (vm, el) {
            var value = textParser.tokensToExp(tokens, vm)
            var desc = dirParser.parse(name + ':' + value)[0]
            vm._bindDir('attr', el, desc, def)
          }
    }
  }
}

/**
 * Directive priority sort comparator
 *
 * @param {Object} a
 * @param {Object} b
 */

function directiveComparator (a, b) {
  a = a.def.priority || 0
  b = b.def.priority || 0
  return a > b ? 1 : -1
}
},{"../config":13,"../parsers/directive":48,"../parsers/template":51,"../parsers/text":52,"../util":60}],12:[function(require,module,exports){
var _ = require('../util')
var templateParser = require('../parsers/template')

/**
 * Process an element or a DocumentFragment based on a
 * instance option object. This allows us to transclude
 * a template node/fragment before the instance is created,
 * so the processed fragment can then be cloned and reused
 * in v-repeat.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Element|DocumentFragment}
 */

module.exports = function transclude (el, options) {
  // for template tags, what we want is its content as
  // a documentFragment (for block instances)
  if (el.tagName === 'TEMPLATE') {
    el = templateParser.parse(el)
  }
  if (options && options.template) {
    el = transcludeTemplate(el, options)
  }
  if (el instanceof DocumentFragment) {
    _.prepend(document.createComment('v-start'), el)
    el.appendChild(document.createComment('v-end'))
  }
  return el
}

/**
 * Process the template option.
 * If the replace option is true this will swap the $el.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Element|DocumentFragment}
 */

function transcludeTemplate (el, options) {
  var template = options.template
  var frag = templateParser.parse(template, true)
  if (!frag) {
    _.warn('Invalid template option: ' + template)
  } else {
    var rawContent = options._content || _.extractContent(el)
    if (options.replace) {
      if (frag.childNodes.length > 1) {
        transcludeContent(frag, rawContent)
        return frag
      } else {
        var replacer = frag.firstChild
        _.copyAttributes(el, replacer)
        transcludeContent(replacer, rawContent)
        return replacer
      }
    } else {
      el.appendChild(frag)
      transcludeContent(el, rawContent)
      return el
    }
  }
}

/**
 * Resolve <content> insertion points mimicking the behavior
 * of the Shadow DOM spec:
 *
 *   http://w3c.github.io/webcomponents/spec/shadow/#insertion-points
 *
 * @param {Element|DocumentFragment} el
 * @param {Element} raw
 */

function transcludeContent (el, raw) {
  var outlets = getOutlets(el)
  var i = outlets.length
  if (!i) return
  var outlet, select, selected, j, main
  // first pass, collect corresponding content
  // for each outlet.
  while (i--) {
    outlet = outlets[i]
    if (raw) {
      select = outlet.getAttribute('select')
      if (select) {  // select content
        selected = raw.querySelectorAll(select)
        outlet.content = _.toArray(
          selected.length
            ? selected
            : outlet.childNodes
        )
      } else { // default content
        main = outlet
      }
    } else { // fallback content
      outlet.content = _.toArray(outlet.childNodes)
    }
  }
  // second pass, actually insert the contents
  for (i = 0, j = outlets.length; i < j; i++) {
    outlet = outlets[i]
    if (outlet !== main) {
      insertContentAt(outlet, outlet.content)
    }
  }
  // finally insert the main content
  if (main) {
    insertContentAt(main, _.toArray(raw.childNodes))
  }
}

/**
 * Get <content> outlets from the element/list
 *
 * @param {Element|Array} el
 * @return {Array}
 */

var concat = [].concat
function getOutlets (el) {
  return _.isArray(el)
    ? concat.apply([], el.map(getOutlets))
    : el.querySelectorAll
      ? _.toArray(el.querySelectorAll('content'))
      : []
}

/**
 * Insert an array of nodes at outlet,
 * then remove the outlet.
 *
 * @param {Element} outlet
 * @param {Array} contents
 */

function insertContentAt (outlet, contents) {
  // not using util DOM methods here because
  // parentNode can be cached
  var parent = outlet.parentNode
  for (var i = 0, j = contents.length; i < j; i++) {
    parent.insertBefore(contents[i], outlet)
  }
  parent.removeChild(outlet)
}
},{"../parsers/template":51,"../util":60}],13:[function(require,module,exports){
module.exports = {

  /**
   * The prefix to look for when parsing directives.
   *
   * @type {String}
   */

  prefix: 'v-',

  /**
   * Whether to print debug messages.
   * Also enables stack trace for warnings.
   *
   * @type {Boolean}
   */

  debug: false,

  /**
   * Whether to suppress warnings.
   *
   * @type {Boolean}
   */

  silent: false,

  /**
   * Whether allow observer to alter data objects'
   * __proto__.
   *
   * @type {Boolean}
   */

  proto: true,

  /**
   * Whether to parse mustache tags in templates.
   *
   * @type {Boolean}
   */

  interpolate: true,

  /**
   * Whether to use async rendering.
   */

  async: true,

  /**
   * Internal flag to indicate the delimiters have been
   * changed.
   *
   * @type {Boolean}
   */

  _delimitersChanged: true

}

/**
 * Interpolation delimiters.
 * We need to mark the changed flag so that the text parser
 * knows it needs to recompile the regex.
 *
 * @type {Array<String>}
 */

var delimiters = ['{{', '}}']
Object.defineProperty(module.exports, 'delimiters', {
  get: function () {
    return delimiters
  },
  set: function (val) {
    delimiters = val
    this._delimitersChanged = true
  }
})
},{}],14:[function(require,module,exports){
var _ = require('./util')
var config = require('./config')
var Watcher = require('./watcher')
var textParser = require('./parsers/text')
var expParser = require('./parsers/expression')

/**
 * A directive links a DOM element with a piece of data,
 * which is the result of evaluating an expression.
 * It registers a watcher with the expression and calls
 * the DOM update function when a change is triggered.
 *
 * @param {String} name
 * @param {Node} el
 * @param {Vue} vm
 * @param {Object} descriptor
 *                 - {String} expression
 *                 - {String} [arg]
 *                 - {Array<Object>} [filters]
 * @param {Object} def - directive definition object
 * @constructor
 */

function Directive (name, el, vm, descriptor, def) {
  // public
  this.name = name
  this.el = el
  this.vm = vm
  // copy descriptor props
  this.raw = descriptor.raw
  this.expression = descriptor.expression
  this.arg = descriptor.arg
  this.filters = _.resolveFilters(vm, descriptor.filters)
  // private
  this._locked = false
  this._bound = false
  // init
  this._bind(def)
}

var p = Directive.prototype

/**
 * Initialize the directive, mixin definition properties,
 * setup the watcher, call definition bind() and update()
 * if present.
 *
 * @param {Object} def
 */

p._bind = function (def) {
  if (this.name !== 'cloak' && this.el.removeAttribute) {
    this.el.removeAttribute(config.prefix + this.name)
  }
  if (typeof def === 'function') {
    this.update = def
  } else {
    _.extend(this, def)
  }
  this._watcherExp = this.expression
  this._checkDynamicLiteral()
  if (this.bind) {
    this.bind()
  }
  if (
    this.update && this._watcherExp &&
    (!this.isLiteral || this._isDynamicLiteral) &&
    !this._checkStatement()
  ) {
    // wrapped updater for context
    var dir = this
    var update = this._update = function (val, oldVal) {
      if (!dir._locked) {
        dir.update(val, oldVal)
      }
    }
    // use raw expression as identifier because filters
    // make them different watchers
    var watcher = this.vm._watchers[this.raw]
    // v-repeat always creates a new watcher because it has
    // a special filter that's bound to its directive
    // instance.
    if (!watcher || this.name === 'repeat') {
      watcher = this.vm._watchers[this.raw] = new Watcher(
        this.vm,
        this._watcherExp,
        update, // callback
        {
          filters: this.filters,
          twoWay: this.twoWay,
          deep: this.deep
        }
      )
    } else {
      watcher.addCb(update)
    }
    this._watcher = watcher
    if (this._initValue != null) {
      watcher.set(this._initValue)
    } else {
      this.update(watcher.value)
    }
  }
  this._bound = true
}

/**
 * check if this is a dynamic literal binding.
 *
 * e.g. v-component="{{currentView}}"
 */

p._checkDynamicLiteral = function () {
  var expression = this.expression
  if (expression && this.isLiteral) {
    var tokens = textParser.parse(expression)
    if (tokens) {
      var exp = textParser.tokensToExp(tokens)
      this.expression = this.vm.$get(exp)
      this._watcherExp = exp
      this._isDynamicLiteral = true
    }
  }
}

/**
 * Check if the directive is a function caller
 * and if the expression is a callable one. If both true,
 * we wrap up the expression and use it as the event
 * handler.
 *
 * e.g. v-on="click: a++"
 *
 * @return {Boolean}
 */

p._checkStatement = function () {
  var expression = this.expression
  if (
    expression && this.acceptStatement &&
    !expParser.pathTestRE.test(expression)
  ) {
    var fn = expParser.parse(expression).get
    var vm = this.vm
    var handler = function () {
      fn.call(vm, vm)
    }
    if (this.filters) {
      handler = _.applyFilters(
        handler,
        this.filters.read,
        vm
      )
    }
    this.update(handler)
    return true
  }
}

/**
 * Check for an attribute directive param, e.g. lazy
 *
 * @param {String} name
 * @return {String}
 */

p._checkParam = function (name) {
  var param = this.el.getAttribute(name)
  if (param !== null) {
    this.el.removeAttribute(name)
  }
  return param
}

/**
 * Teardown the watcher and call unbind.
 */

p._teardown = function () {
  if (this._bound) {
    if (this.unbind) {
      this.unbind()
    }
    var watcher = this._watcher
    if (watcher && watcher.active) {
      watcher.removeCb(this._update)
      if (!watcher.active) {
        this.vm._watchers[this.raw] = null
      }
    }
    this._bound = false
    this.vm = this.el = this._watcher = null
  }
}

/**
 * Set the corresponding value with the setter.
 * This should only be used in two-way directives
 * e.g. v-model.
 *
 * @param {*} value
 * @param {Boolean} lock - prevent wrtie triggering update.
 * @public
 */

p.set = function (value, lock) {
  if (this.twoWay) {
    if (lock) {
      this._locked = true
    }
    this._watcher.set(value)
    if (lock) {
      var self = this
      _.nextTick(function () {
        self._locked = false
      })
    }
  }
}

module.exports = Directive
},{"./config":13,"./parsers/expression":49,"./parsers/text":52,"./util":60,"./watcher":64}],15:[function(require,module,exports){
// xlink
var xlinkNS = 'http://www.w3.org/1999/xlink'
var xlinkRE = /^xlink:/

module.exports = {

  priority: 850,

  bind: function () {
    var name = this.arg
    this.update = xlinkRE.test(name)
      ? xlinkHandler
      : defaultHandler
  }

}

function defaultHandler (value) {
  if (value || value === 0) {
    this.el.setAttribute(this.arg, value)
  } else {
    this.el.removeAttribute(this.arg)
  }
}

function xlinkHandler (value) {
  if (value != null) {
    this.el.setAttributeNS(xlinkNS, this.arg, value)
  } else {
    this.el.removeAttributeNS(xlinkNS, 'href')
  }
}
},{}],16:[function(require,module,exports){
var _ = require('../util')
var addClass = _.addClass
var removeClass = _.removeClass

module.exports = function (value) {
  if (this.arg) {
    var method = value ? addClass : removeClass
    method(this.el, this.arg)
  } else {
    if (this.lastVal) {
      removeClass(this.el, this.lastVal)
    }
    if (value) {
      addClass(this.el, value)
      this.lastVal = value
    }
  }
}
},{"../util":60}],17:[function(require,module,exports){
var config = require('../config')

module.exports = {

  bind: function () {
    var el = this.el
    this.vm.$once('hook:compiled', function () {
      el.removeAttribute(config.prefix + 'cloak')
    })
  }

}
},{"../config":13}],18:[function(require,module,exports){
var _ = require('../util')
var templateParser = require('../parsers/template')

module.exports = {

  isLiteral: true,

  /**
   * Setup. Two possible usages:
   *
   * - static:
   *   v-component="comp"
   *
   * - dynamic:
   *   v-component="{{currentView}}"
   */

  bind: function () {
    if (!this.el.__vue__) {
      // create a ref anchor
      this.ref = document.createComment('v-component')
      _.replace(this.el, this.ref)
      // check keep-alive options.
      // If yes, instead of destroying the active vm when
      // hiding (v-if) or switching (dynamic literal) it,
      // we simply remove it from the DOM and save it in a
      // cache object, with its constructor id as the key.
      this.keepAlive = this._checkParam('keep-alive') != null
      if (this.keepAlive) {
        this.cache = {}
      }
      // if static, build right now.
      if (!this._isDynamicLiteral) {
        this.resolveCtor(this.expression)
        this.childVM = this.build()
        this.childVM.$before(this.ref)
      } else {
        // check dynamic component params
        this.readyEvent = this._checkParam('wait-for')
        this.transMode = this._checkParam('transition-mode')
      }
    } else {
      _.warn(
        'v-component="' + this.expression + '" cannot be ' +
        'used on an already mounted instance.'
      )
    }
  },

  /**
   * Resolve the component constructor to use when creating
   * the child vm.
   */

  resolveCtor: function (id) {
    this.ctorId = id
    this.Ctor = this.vm.$options.components[id]
    _.assertAsset(this.Ctor, 'component', id)
  },

  /**
   * Instantiate/insert a new child vm.
   * If keep alive and has cached instance, insert that
   * instance; otherwise build a new one and cache it.
   *
   * @return {Vue} - the created instance
   */

  build: function () {
    if (this.keepAlive) {
      var cached = this.cache[this.ctorId]
      if (cached) {
        return cached
      }
    }
    var vm = this.vm
    var el = templateParser.clone(this.el)
    if (this.Ctor) {
      var child = vm.$addChild({
        el: el,
        _asComponent: true
      }, this.Ctor)
      if (this.keepAlive) {
        this.cache[this.ctorId] = child
      }
      return child
    }
  },

  /**
   * Teardown the current child, but defers cleanup so
   * that we can separate the destroy and removal steps.
   */

  unbuild: function () {
    var child = this.childVM
    if (!child || this.keepAlive) {
      return
    }
    // the sole purpose of `deferCleanup` is so that we can
    // "deactivate" the vm right now and perform DOM removal
    // later.
    child.$destroy(false, true)
  },

  /**
   * Remove current destroyed child and manually do
   * the cleanup after removal.
   *
   * @param {Function} cb
   */

  removeCurrent: function (cb) {
    var child = this.childVM
    var keepAlive = this.keepAlive
    if (child) {
      child.$remove(function () {
        if (!keepAlive) child._cleanup()
        if (cb) cb()
      })
    } else if (cb) {
      cb()
    }
  },

  /**
   * Update callback for the dynamic literal scenario,
   * e.g. v-component="{{view}}"
   */

  update: function (value) {
    if (!value) {
      // just destroy and remove current
      this.unbuild()
      this.removeCurrent()
      this.childVM = null
    } else {
      this.resolveCtor(value)
      this.unbuild()
      var newComponent = this.build()
      var self = this
      if (this.readyEvent) {
        newComponent.$once(this.readyEvent, function () {
          self.swapTo(newComponent)
        })
      } else {
        this.swapTo(newComponent)
      }
    }
  },

  /**
   * Actually swap the components, depending on the
   * transition mode. Defaults to simultaneous.
   *
   * @param {Vue} target
   */

  swapTo: function (target) {
    var self = this
    switch (self.transMode) {
      case 'in-out':
        target.$before(self.ref, function () {
          self.removeCurrent()
          self.childVM = target
        })
        break
      case 'out-in':
        self.removeCurrent(function () {
          target.$before(self.ref)
          self.childVM = target
        })
        break
      default:
        self.removeCurrent()
        target.$before(self.ref)
        self.childVM = target
    }
  },

  /**
   * Unbind.
   */

  unbind: function () {
    this.unbuild()
    // destroy all keep-alive cached instances
    if (this.cache) {
      for (var key in this.cache) {
        this.cache[key].$destroy()
      }
      this.cache = null
    }
  }

}
},{"../parsers/template":51,"../util":60}],19:[function(require,module,exports){
module.exports = {

  isLiteral: true,

  bind: function () {
    this.vm.$$[this.expression] = this.el
  },

  unbind: function () {
    delete this.vm.$$[this.expression]
  }
  
}
},{}],20:[function(require,module,exports){
var _ = require('../util')

module.exports = { 

  bind: function () {
    var child = this.el.__vue__
    if (!child || this.vm !== child.$parent) {
      _.warn(
        '`v-events` should only be used on a child component ' +
        'from the parent template.'
      )
      return
    }
    var method = this.vm[this.expression]
    if (!method) {
      _.warn(
        '`v-events` cannot find method "' + this.expression +
        '" on the parent instance.'
      )
    }
    child.$on(this.arg, method)
  }

  // when child is destroyed, all events are turned off,
  // so no need for unbind here.

}
},{"../util":60}],21:[function(require,module,exports){
var _ = require('../util')
var templateParser = require('../parsers/template')

module.exports = {

  bind: function () {
    // a comment node means this is a binding for
    // {{{ inline unescaped html }}}
    if (this.el.nodeType === 8) {
      // hold nodes
      this.nodes = []
    }
  },

  update: function (value) {
    value = _.toString(value)
    if (this.nodes) {
      this.swap(value)
    } else {
      this.el.innerHTML = value
    }
  },

  swap: function (value) {
    // remove old nodes
    var i = this.nodes.length
    while (i--) {
      _.remove(this.nodes[i])
    }
    // convert new value to a fragment
    // do not attempt to retrieve from id selector
    var frag = templateParser.parse(value, true, true)
    // save a reference to these nodes so we can remove later
    this.nodes = _.toArray(frag.childNodes)
    _.before(frag, this.el)
  }

}
},{"../parsers/template":51,"../util":60}],22:[function(require,module,exports){
var _ = require('../util')
var compile = require('../compiler/compile')
var templateParser = require('../parsers/template')
var transition = require('../transition')

module.exports = {

  bind: function () {
    var el = this.el
    if (!el.__vue__) {
      this.start = document.createComment('v-if-start')
      this.end = document.createComment('v-if-end')
      _.replace(el, this.end)
      _.before(this.start, this.end)
      if (el.tagName === 'TEMPLATE') {
        this.template = templateParser.parse(el, true)
      } else {
        this.template = document.createDocumentFragment()
        this.template.appendChild(el)
      }
      // compile the nested partial
      this.linker = compile(
        this.template,
        this.vm.$options,
        true
      )
    } else {
      this.invalid = true
      _.warn(
        'v-if="' + this.expression + '" cannot be ' +
        'used on an already mounted instance.'
      )
    }
  },

  update: function (value) {
    if (this.invalid) return
    if (value) {
      this.insert()
    } else {
      this.teardown()
    }
  },

  insert: function () {
    // avoid duplicate inserts, since update() can be
    // called with different truthy values
    if (!this.unlink) {
      this.compile(this.template) 
    }
  },

  compile: function (template) {
    var vm = this.vm
    var frag = templateParser.clone(template)
    var originalChildLength = vm._children
      ? vm._children.length
      : 0
    this.unlink = this.linker
      ? this.linker(vm, frag)
      : vm.$compile(frag)
    transition.blockAppend(frag, this.end, vm)
    this.children = vm._children
      ? vm._children.slice(originalChildLength)
      : null
    if (this.children && _.inDoc(vm.$el)) {
      this.children.forEach(function (child) {
        child._callHook('attached')
      })
    }
  },

  teardown: function () {
    if (!this.unlink) return
    transition.blockRemove(this.start, this.end, this.vm)
    if (this.children && _.inDoc(this.vm.$el)) {
      this.children.forEach(function (child) {
        if (!child._isDestroyed) {
          child._callHook('detached')
        }
      })
    }
    this.unlink()
    this.unlink = null
  }

}
},{"../compiler/compile":11,"../parsers/template":51,"../transition":54,"../util":60}],23:[function(require,module,exports){
// manipulation directives
exports.text       = require('./text')
exports.html       = require('./html')
exports.attr       = require('./attr')
exports.show       = require('./show')
exports['class']   = require('./class')
exports.el         = require('./el')
exports.ref        = require('./ref')
exports.cloak      = require('./cloak')
exports.style      = require('./style')
exports.partial    = require('./partial')
exports.transition = require('./transition')

// event listener directives
exports.on         = require('./on')
exports.model      = require('./model')

// child vm directives
exports.component  = require('./component')
exports.repeat     = require('./repeat')
exports['if']      = require('./if')

// child vm communication directives
exports['with']    = require('./with')
exports.events     = require('./events')
},{"./attr":15,"./class":16,"./cloak":17,"./component":18,"./el":19,"./events":20,"./html":21,"./if":22,"./model":26,"./on":29,"./partial":30,"./ref":31,"./repeat":32,"./show":33,"./style":34,"./text":35,"./transition":36,"./with":37}],24:[function(require,module,exports){
var _ = require('../../util')

module.exports = {

  bind: function () {
    var self = this
    var el = this.el
    this.listener = function () {
      self.set(el.checked, true)
    }
    _.on(el, 'change', this.listener)
    if (el.checked) {
      this._initValue = el.checked
    }
  },

  update: function (value) {
    this.el.checked = !!value
  },

  unbind: function () {
    _.off(this.el, 'change', this.listener)
  }

}
},{"../../util":60}],25:[function(require,module,exports){
var _ = require('../../util')

module.exports = {

  bind: function () {
    var self = this
    var el = this.el

    // check params
    // - lazy: update model on "change" instead of "input"
    var lazy = this._checkParam('lazy') != null
    // - number: cast value into number when updating model.
    var number = this._checkParam('number') != null

    // handle composition events.
    // http://blog.evanyou.me/2014/01/03/composition-event/
    var cpLocked = false
    this.cpLock = function () {
      cpLocked = true
    }
    this.cpUnlock = function () {
      cpLocked = false
      // in IE11 the "compositionend" event fires AFTER
      // the "input" event, so the input handler is blocked
      // at the end... have to call it here.
      set()
    }
    _.on(el,'compositionstart', this.cpLock)
    _.on(el,'compositionend', this.cpUnlock)

    // shared setter
    function set () {
      self.set(
        number ? _.toNumber(el.value) : el.value,
        true
      )
    }

    // if the directive has filters, we need to
    // record cursor position and restore it after updating
    // the input with the filtered value.
    // also force update for type="range" inputs to enable
    // "lock in range" (see #506)
    this.listener = this.filters || el.type === 'range'
      ? function textInputListener () {
          if (cpLocked) return
          var charsOffset
          // some HTML5 input types throw error here
          try {
            // record how many chars from the end of input
            // the cursor was at
            charsOffset = el.value.length - el.selectionStart
          } catch (e) {}
          // Fix IE10/11 infinite update cycle
          // https://github.com/yyx990803/vue/issues/592
          /* istanbul ignore if */
          if (charsOffset < 0) {
            return
          }
          set()
          _.nextTick(function () {
            // force a value update, because in
            // certain cases the write filters output the
            // same result for different input values, and
            // the Observer set events won't be triggered.
            var newVal = self._watcher.value
            self.update(newVal)
            if (charsOffset != null) {
              var cursorPos =
                _.toString(newVal).length - charsOffset
              el.setSelectionRange(cursorPos, cursorPos)
            }
          })
        }
      : function textInputListener () {
          if (cpLocked) return
          set()
        }

    this.event = lazy ? 'change' : 'input'
    _.on(el, this.event, this.listener)

    // IE9 doesn't fire input event on backspace/del/cut
    if (!lazy && _.isIE9) {
      this.onCut = function () {
        _.nextTick(self.listener)
      }
      this.onDel = function (e) {
        if (e.keyCode === 46 || e.keyCode === 8) {
          self.listener()
        }
      }
      _.on(el, 'cut', this.onCut)
      _.on(el, 'keyup', this.onDel)
    }

    // set initial value if present
    if (
      el.hasAttribute('value') ||
      (el.tagName === 'TEXTAREA' && el.value.trim())
    ) {
      this._initValue = number
        ? _.toNumber(el.value)
        : el.value
    }
  },

  update: function (value) {
    this.el.value = _.toString(value)
  },

  unbind: function () {
    var el = this.el
    _.off(el, this.event, this.listener)
    _.off(el,'compositionstart', this.cpLock)
    _.off(el,'compositionend', this.cpUnlock)
    if (this.onCut) {
      _.off(el,'cut', this.onCut)
      _.off(el,'keyup', this.onDel)
    }
  }

}
},{"../../util":60}],26:[function(require,module,exports){
var _ = require('../../util')

var handlers = {
  _default: require('./default'),
  radio: require('./radio'),
  select: require('./select'),
  checkbox: require('./checkbox')
}

module.exports = {

  priority: 800,
  twoWay: true,
  handlers: handlers,

  /**
   * Possible elements:
   *   <select>
   *   <textarea>
   *   <input type="*">
   *     - text
   *     - checkbox
   *     - radio
   *     - number
   *     - TODO: more types may be supplied as a plugin
   */

  bind: function () {
    // friendly warning...
    var filters = this.filters
    if (filters && filters.read && !filters.write) {
      _.warn(
        'It seems you are using a read-only filter with ' +
        'v-model. You might want to use a two-way filter ' +
        'to ensure correct behavior.'
      )
    }
    var el = this.el
    var tag = el.tagName
    var handler
    if (tag === 'INPUT') {
      handler = handlers[el.type] || handlers._default
    } else if (tag === 'SELECT') {
      handler = handlers.select
    } else if (tag === 'TEXTAREA') {
      handler = handlers._default
    } else {
      _.warn("v-model doesn't support element type: " + tag)
      return
    }
    handler.bind.call(this)
    this.update = handler.update
    this.unbind = handler.unbind
  }

}
},{"../../util":60,"./checkbox":24,"./default":25,"./radio":27,"./select":28}],27:[function(require,module,exports){
var _ = require('../../util')

module.exports = {

  bind: function () {
    var self = this
    var el = this.el
    this.listener = function () {
      self.set(el.value, true)
    }
    _.on(el, 'change', this.listener)
    if (el.checked) {
      this._initValue = el.value
    }
  },

  update: function (value) {
    /* jshint eqeqeq: false */
    this.el.checked = value == this.el.value
  },

  unbind: function () {
    _.off(this.el, 'change', this.listener)
  }

}
},{"../../util":60}],28:[function(require,module,exports){
var _ = require('../../util')
var Watcher = require('../../watcher')

module.exports = {

  bind: function () {
    var self = this
    var el = this.el
    // check options param
    var optionsParam = this._checkParam('options')
    if (optionsParam) {
      initOptions.call(this, optionsParam)
    }
    this.multiple = el.hasAttribute('multiple')
    this.listener = function () {
      var value = self.multiple
        ? getMultiValue(el)
        : el.value
      self.set(value, true)
    }
    _.on(el, 'change', this.listener)
    checkInitialValue.call(this)
  },

  update: function (value) {
    /* jshint eqeqeq: false */
    var el = this.el
    el.selectedIndex = -1
    var multi = this.multiple && _.isArray(value)
    var options = el.options
    var i = options.length
    var option
    while (i--) {
      option = options[i]
      option.selected = multi
        ? indexOf(value, option.value) > -1
        : value == option.value
    }
  },

  unbind: function () {
    _.off(this.el, 'change', this.listener)
    if (this.optionWatcher) {
      this.optionWatcher.teardown()
    }
  }

}

/**
 * Initialize the option list from the param.
 *
 * @param {String} expression
 */

function initOptions (expression) {
  var self = this
  function optionUpdateWatcher (value) {
    if (_.isArray(value)) {
      self.el.innerHTML = ''
      buildOptions(self.el, value)
      if (self._watcher) {
        self.update(self._watcher.value)
      }
    } else {
      _.warn('Invalid options value for v-model: ' + value)
    }
  }
  this.optionWatcher = new Watcher(
    this.vm,
    expression,
    optionUpdateWatcher,
    { deep: true }
  )
  // update with initial value
  optionUpdateWatcher(this.optionWatcher.value)
}

/**
 * Build up option elements. IE9 doesn't create options
 * when setting innerHTML on <select> elements, so we have
 * to use DOM API here.
 *
 * @param {Element} parent - a <select> or an <optgroup>
 * @param {Array} options
 */

function buildOptions (parent, options) {
  var op, el
  for (var i = 0, l = options.length; i < l; i++) {
    op = options[i]
    if (!op.options) {
      el = document.createElement('option')
      if (typeof op === 'string') {
        el.text = el.value = op
      } else {
        el.text = op.text
        el.value = op.value
      }
    } else {
      el = document.createElement('optgroup')
      el.label = op.label
      buildOptions(el, op.options)
    }
    parent.appendChild(el)
  }
}

/**
 * Check the initial value for selected options.
 */

function checkInitialValue () {
  var initValue
  var options = this.el.options
  for (var i = 0, l = options.length; i < l; i++) {
    if (options[i].hasAttribute('selected')) {
      if (this.multiple) {
        (initValue || (initValue = []))
          .push(options[i].value)
      } else {
        initValue = options[i].value
      }
    }
  }
  if (initValue) {
    this._initValue = initValue
  }
}

/**
 * Helper to extract a value array for select[multiple]
 *
 * @param {SelectElement} el
 * @return {Array}
 */

function getMultiValue (el) {
  return Array.prototype.filter
    .call(el.options, filterSelected)
    .map(getOptionValue)
}

function filterSelected (op) {
  return op.selected
}

function getOptionValue (op) {
  return op.value || op.text
}

/**
 * Native Array.indexOf uses strict equal, but in this
 * case we need to match string/numbers with soft equal.
 *
 * @param {Array} arr
 * @param {*} val
 */

function indexOf (arr, val) {
  /* jshint eqeqeq: false */
  var i = arr.length
  while (i--) {
    if (arr[i] == val) return i
  }
  return -1
}
},{"../../util":60,"../../watcher":64}],29:[function(require,module,exports){
var _ = require('../util')

module.exports = {

  acceptStatement: true,
  priority: 700,

  bind: function () {
    // deal with iframes
    if (
      this.el.tagName === 'IFRAME' &&
      this.arg !== 'load'
    ) {
      var self = this
      this.iframeBind = function () {
        _.on(self.el.contentWindow, self.arg, self.handler)
      }
      _.on(this.el, 'load', this.iframeBind)
    }
  },

  update: function (handler) {
    if (typeof handler !== 'function') {
      _.warn(
        'Directive "v-on:' + this.expression + '" ' +
        'expects a function value.'
      )
      return
    }
    this.reset()
    var vm = this.vm
    this.handler = function (e) {
      e.targetVM = vm
      vm.$event = e
      var res = handler(e)
      vm.$event = null
      return res
    }
    if (this.iframeBind) {
      this.iframeBind()
    } else {
      _.on(this.el, this.arg, this.handler)
    }
  },

  reset: function () {
    var el = this.iframeBind
      ? this.el.contentWindow
      : this.el
    if (this.handler) {
      _.off(el, this.arg, this.handler)
    }
  },

  unbind: function () {
    this.reset()
    _.off(this.el, 'load', this.iframeBind)
  }
}
},{"../util":60}],30:[function(require,module,exports){
var _ = require('../util')
var templateParser = require('../parsers/template')
var vIf = require('./if')

module.exports = {

  isLiteral: true,

  // same logic reuse from v-if
  compile: vIf.compile,
  teardown: vIf.teardown,

  bind: function () {
    var el = this.el
    this.start = document.createComment('v-partial-start')
    this.end = document.createComment('v-partial-end')
    if (el.nodeType !== 8) {
      el.innerHTML = ''
    }
    if (el.tagName === 'TEMPLATE' || el.nodeType === 8) {
      _.replace(el, this.end)
    } else {
      el.appendChild(this.end)
    }
    _.before(this.start, this.end)
    if (!this._isDynamicLiteral) {
      this.insert(this.expression)
    }
  },

  update: function (id) {
    this.teardown()
    this.insert(id)
  },

  insert: function (id) {
    var partial = this.vm.$options.partials[id]
    _.assertAsset(partial, 'partial', id)
    if (partial) {
      this.compile(templateParser.parse(partial))
    }
  }

}
},{"../parsers/template":51,"../util":60,"./if":22}],31:[function(require,module,exports){
var _ = require('../util')

module.exports = {

  isLiteral: true,

  bind: function () {
    var child = this.el.__vue__
    if (!child || this.vm !== child.$parent) {
      _.warn(
        'v-ref should only be used on a child component ' +
        'from the parent template.'
      )
      return
    }
    this.vm.$[this.expression] = child
  },

  unbind: function () {
    if (this.vm.$[this.expression] === this.el.__vue__) {
      delete this.vm.$[this.expression]
    }
  }
  
}
},{"../util":60}],32:[function(require,module,exports){
var _ = require('../util')
var isObject = _.isObject
var textParser = require('../parsers/text')
var expParser = require('../parsers/expression')
var templateParser = require('../parsers/template')
var compile = require('../compiler/compile')
var transclude = require('../compiler/transclude')
var mergeOptions = require('../util/merge-option')
var uid = 0

module.exports = {

  /**
   * Setup.
   */

  bind: function () {
    // uid as a cache identifier
    this.id = '__v_repeat_' + (++uid)
    // we need to insert the objToArray converter
    // as the first read filter, because it has to be invoked
    // before any user filters. (can't do it in `update`)
    if (!this.filters) {
      this.filters = {}
    }
    // add the object -> array convert filter
    var objectConverter = _.bind(objToArray, this)
    if (!this.filters.read) {
      this.filters.read = [objectConverter]
    } else {
      this.filters.read.unshift(objectConverter)
    }
    // setup ref node
    this.ref = document.createComment('v-repeat')
    _.replace(this.el, this.ref)
    // check if this is a block repeat
    this.template = this.el.tagName === 'TEMPLATE'
      ? templateParser.parse(this.el, true)
      : this.el
    // check other directives that need to be handled
    // at v-repeat level
    this.checkIf()
    this.checkRef()
    this.checkComponent()
    // check for trackby param
    this.idKey =
      this._checkParam('track-by') ||
      this._checkParam('trackby') // 0.11.0 compat
    // cache for primitive value instances
    this.cache = Object.create(null)
  },

  /**
   * Warn against v-if usage.
   */

  checkIf: function () {
    if (_.attr(this.el, 'if') !== null) {
      _.warn(
        'Don\'t use v-if with v-repeat. ' +
        'Use v-show or the "filterBy" filter instead.'
      )
    }
  },

  /**
   * Check if v-ref/ v-el is also present.
   */

  checkRef: function () {
    var childId = _.attr(this.el, 'ref')
    this.childId = childId
      ? this.vm.$interpolate(childId)
      : null
    var elId = _.attr(this.el, 'el')
    this.elId = elId
      ? this.vm.$interpolate(elId)
      : null
  },

  /**
   * Check the component constructor to use for repeated
   * instances. If static we resolve it now, otherwise it
   * needs to be resolved at build time with actual data.
   */

  checkComponent: function () {
    var id = _.attr(this.el, 'component')
    var options = this.vm.$options
    if (!id) {
      this.Ctor = _.Vue // default constructor
      this.inherit = true // inline repeats should inherit
      // important: transclude with no options, just
      // to ensure block start and block end
      this.template = transclude(this.template)
      this._linkFn = compile(this.template, options)
    } else {
      this._asComponent = true
      var tokens = textParser.parse(id)
      if (!tokens) { // static component
        var Ctor = this.Ctor = options.components[id]
        _.assertAsset(Ctor, 'component', id)
        // If there's no parent scope directives and no
        // content to be transcluded, we can optimize the
        // rendering by pre-transcluding + compiling here
        // and provide a link function to every instance.
        if (!this.el.hasChildNodes() &&
            !this.el.hasAttributes()) {
          // merge an empty object with owner vm as parent
          // so child vms can access parent assets.
          var merged = mergeOptions(Ctor.options, {}, {
            $parent: this.vm
          })
          this.template = transclude(this.template, merged)
          this._linkFn = compile(this.template, merged, false, true)
        }
      } else {
        // to be resolved later
        var ctorExp = textParser.tokensToExp(tokens)
        this.ctorGetter = expParser.parse(ctorExp).get
      }
    }
  },

  /**
   * Update.
   * This is called whenever the Array mutates.
   *
   * @param {Array} data
   */

  update: function (data) {
    if (typeof data === 'number') {
      data = range(data)
    }
    this.vms = this.diff(data || [], this.vms)
    // update v-ref
    if (this.childId) {
      this.vm.$[this.childId] = this.vms
    }
    if (this.elId) {
      this.vm.$$[this.elId] = this.vms.map(function (vm) {
        return vm.$el
      })
    }
  },

  /**
   * Diff, based on new data and old data, determine the
   * minimum amount of DOM manipulations needed to make the
   * DOM reflect the new data Array.
   *
   * The algorithm diffs the new data Array by storing a
   * hidden reference to an owner vm instance on previously
   * seen data. This allows us to achieve O(n) which is
   * better than a levenshtein distance based algorithm,
   * which is O(m * n).
   *
   * @param {Array} data
   * @param {Array} oldVms
   * @return {Array}
   */

  diff: function (data, oldVms) {
    var idKey = this.idKey
    var converted = this.converted
    var ref = this.ref
    var alias = this.arg
    var init = !oldVms
    var vms = new Array(data.length)
    var obj, raw, vm, i, l
    // First pass, go through the new Array and fill up
    // the new vms array. If a piece of data has a cached
    // instance for it, we reuse it. Otherwise build a new
    // instance.
    for (i = 0, l = data.length; i < l; i++) {
      obj = data[i]
      raw = converted ? obj.value : obj
      vm = !init && this.getVm(raw)
      if (vm) { // reusable instance
        vm._reused = true
        vm.$index = i // update $index
        if (converted) {
          vm.$key = obj.key // update $key
        }
        if (idKey) { // swap track by id data
          if (alias) {
            vm[alias] = raw
          } else {
            vm._setData(raw)
          }
        }
      } else { // new instance
        vm = this.build(obj, i)
        vm._new = true
      }
      vms[i] = vm
      // insert if this is first run
      if (init) {
        vm.$before(ref)
      }
    }
    // if this is the first run, we're done.
    if (init) {
      return vms
    }
    // Second pass, go through the old vm instances and
    // destroy those who are not reused (and remove them
    // from cache)
    for (i = 0, l = oldVms.length; i < l; i++) {
      vm = oldVms[i]
      if (!vm._reused) {
        this.uncacheVm(vm)
        vm.$destroy(true)
      }
    }
    // final pass, move/insert new instances into the
    // right place. We're going in reverse here because
    // insertBefore relies on the next sibling to be
    // resolved.
    var targetNext, currentNext
    i = vms.length
    while (i--) {
      vm = vms[i]
      // this is the vm that we should be in front of
      targetNext = vms[i + 1]
      if (!targetNext) {
        // This is the last item. If it's reused then
        // everything else will eventually be in the right
        // place, so no need to touch it. Otherwise, insert
        // it.
        if (!vm._reused) {
          vm.$before(ref)
        }
      } else {
        if (vm._reused) {
          // this is the vm we are actually in front of
          currentNext = findNextVm(vm, ref)
          // we only need to move if we are not in the right
          // place already.
          if (currentNext !== targetNext) {
            vm.$before(targetNext.$el, null, false)
          }
        } else {
          // new instance, insert to existing next
          vm.$before(targetNext.$el)
        }
      }
      vm._new = false
      vm._reused = false
    }
    return vms
  },

  /**
   * Build a new instance and cache it.
   *
   * @param {Object} data
   * @param {Number} index
   */

  build: function (data, index) {
    var original = data
    var meta = { $index: index }
    if (this.converted) {
      meta.$key = original.key
    }
    var raw = this.converted ? data.value : data
    var alias = this.arg
    var hasAlias = !isObject(raw) || alias
    // wrap the raw data with alias
    data = hasAlias ? {} : raw
    if (alias) {
      data[alias] = raw
    } else if (hasAlias) {
      meta.$value = raw
    }
    // resolve constructor
    var Ctor = this.Ctor || this.resolveCtor(data, meta)
    var vm = this.vm.$addChild({
      el: templateParser.clone(this.template),
      _asComponent: this._asComponent,
      _linkFn: this._linkFn,
      _meta: meta,
      data: data,
      inherit: this.inherit
    }, Ctor)
    // cache instance
    this.cacheVm(raw, vm)
    return vm
  },

  /**
   * Resolve a contructor to use for an instance.
   * The tricky part here is that there could be dynamic
   * components depending on instance data.
   *
   * @param {Object} data
   * @param {Object} meta
   * @return {Function}
   */

  resolveCtor: function (data, meta) {
    // create a temporary context object and copy data
    // and meta properties onto it.
    // use _.define to avoid accidentally overwriting scope
    // properties.
    var context = Object.create(this.vm)
    var key
    for (key in data) {
      _.define(context, key, data[key])
    }
    for (key in meta) {
      _.define(context, key, meta[key])
    }
    var id = this.ctorGetter.call(context, context)
    var Ctor = this.vm.$options.components[id]
    _.assertAsset(Ctor, 'component', id)
    return Ctor
  },

  /**
   * Unbind, teardown everything
   */

  unbind: function () {
    if (this.childId) {
      delete this.vm.$[this.childId]
    }
    if (this.vms) {
      var i = this.vms.length
      var vm
      while (i--) {
        vm = this.vms[i]
        this.uncacheVm(vm)
        vm.$destroy()
      }
    }
  },

  /**
   * Cache a vm instance based on its data.
   *
   * If the data is an object, we save the vm's reference on
   * the data object as a hidden property. Otherwise we
   * cache them in an object and for each primitive value
   * there is an array in case there are duplicates.
   *
   * @param {Object} data
   * @param {Vue} vm
   */

  cacheVm: function (data, vm) {
    var idKey = this.idKey
    var cache = this.cache
    var id
    if (idKey) {
      id = data[idKey]
      if (!cache[id]) {
        cache[id] = vm
      } else {
        _.warn('Duplicate ID in v-repeat: ' + id)
      }
    } else if (isObject(data)) {
      id = this.id
      if (data.hasOwnProperty(id)) {
        if (data[id] === null) {
          data[id] = vm
        } else {
          _.warn(
            'Duplicate objects are not supported in v-repeat.'
          )
        }
      } else {
        _.define(data, this.id, vm)
      }
    } else {
      if (!cache[data]) {
        cache[data] = [vm]
      } else {
        cache[data].push(vm)
      }
    }
    vm._raw = data
  },

  /**
   * Try to get a cached instance from a piece of data.
   *
   * @param {Object} data
   * @return {Vue|undefined}
   */

  getVm: function (data) {
    if (this.idKey) {
      return this.cache[data[this.idKey]]
    } else if (isObject(data)) {
      return data[this.id]
    } else {
      var cached = this.cache[data]
      if (cached) {
        var i = 0
        var vm = cached[i]
        // since duplicated vm instances might be a reused
        // one OR a newly created one, we need to return the
        // first instance that is neither of these.
        while (vm && (vm._reused || vm._new)) {
          vm = cached[++i]
        }
        return vm
      }
    }
  },

  /**
   * Delete a cached vm instance.
   *
   * @param {Vue} vm
   */

  uncacheVm: function (vm) {
    var data = vm._raw
    if (this.idKey) {
      this.cache[data[this.idKey]] = null
    } else if (isObject(data)) {
      data[this.id] = null
      vm._raw = null
    } else {
      this.cache[data].pop()
    }
  }

}

/**
 * Helper to find the next element that is an instance
 * root node. This is necessary because a destroyed vm's
 * element could still be lingering in the DOM before its
 * leaving transition finishes, but its __vue__ reference
 * should have been removed so we can skip them.
 *
 * @param {Vue} vm
 * @param {CommentNode} ref
 * @return {Vue}
 */

function findNextVm (vm, ref) {
  var el = (vm._blockEnd || vm.$el).nextSibling
  while (!el.__vue__ && el !== ref) {
    el = el.nextSibling
  }
  return el.__vue__
}

/**
 * Attempt to convert non-Array objects to array.
 * This is the default filter installed to every v-repeat
 * directive.
 *
 * It will be called with **the directive** as `this`
 * context so that we can mark the repeat array as converted
 * from an object.
 *
 * @param {*} obj
 * @return {Array}
 * @private
 */

function objToArray (obj) {
  if (!_.isPlainObject(obj)) {
    return obj
  }
  var keys = Object.keys(obj)
  var i = keys.length
  var res = new Array(i)
  var key
  while (i--) {
    key = keys[i]
    res[i] = {
      key: key,
      value: obj[key]
    }
  }
  // `this` points to the repeat directive instance
  this.converted = true
  return res
}

/**
 * Create a range array from given number.
 *
 * @param {Number} n
 * @return {Array}
 */

function range (n) {
  var i = -1
  var ret = new Array(n)
  while (++i < n) {
    ret[i] = i
  }
  return ret
}
},{"../compiler/compile":11,"../compiler/transclude":12,"../parsers/expression":49,"../parsers/template":51,"../parsers/text":52,"../util":60,"../util/merge-option":62}],33:[function(require,module,exports){
var transition = require('../transition')

module.exports = function (value) {
  var el = this.el
  transition.apply(el, value ? 1 : -1, function () {
    el.style.display = value ? '' : 'none'
  }, this.vm)
}
},{"../transition":54}],34:[function(require,module,exports){
var _ = require('../util')
var prefixes = ['-webkit-', '-moz-', '-ms-']
var camelPrefixes = ['Webkit', 'Moz', 'ms']
var importantRE = /!important;?$/
var camelRE = /([a-z])([A-Z])/g
var testEl = null
var propCache = {}

module.exports = {

  deep: true,

  update: function (value) {
    if (this.arg) {
      this.setProp(this.arg, value)
    } else {
      if (typeof value === 'object') {
        // cache object styles so that only changed props
        // are actually updated.
        if (!this.cache) this.cache = {}
        for (var prop in value) {
          this.setProp(prop, value[prop])
          /* jshint eqeqeq: false */
          if (value[prop] != this.cache[prop]) {
            this.cache[prop] = value[prop]
            this.setProp(prop, value[prop])
          }
        }
      } else {
        this.el.style.cssText = value
      }
    }
  },

  setProp: function (prop, value) {
    prop = normalize(prop)
    if (!prop) return // unsupported prop
    // cast possible numbers/booleans into strings
    if (value != null) value += ''
    if (value) {
      var isImportant = importantRE.test(value)
        ? 'important'
        : ''
      if (isImportant) {
        value = value.replace(importantRE, '').trim()
      }
      this.el.style.setProperty(prop, value, isImportant)
    } else {
      this.el.style.removeProperty(prop)
    }
  }

}

/**
 * Normalize a CSS property name.
 * - cache result
 * - auto prefix
 * - camelCase -> dash-case
 *
 * @param {String} prop
 * @return {String}
 */

function normalize (prop) {
  if (propCache[prop]) {
    return propCache[prop]
  }
  var res = prefix(prop)
  propCache[prop] = propCache[res] = res
  return res
}

/**
 * Auto detect the appropriate prefix for a CSS property.
 * https://gist.github.com/paulirish/523692
 *
 * @param {String} prop
 * @return {String}
 */

function prefix (prop) {
  prop = prop.replace(camelRE, '$1-$2').toLowerCase()
  var camel = _.camelize(prop)
  var upper = camel.charAt(0).toUpperCase() + camel.slice(1)
  if (!testEl) {
    testEl = document.createElement('div')
  }
  if (camel in testEl.style) {
    return prop
  }
  var i = prefixes.length
  var prefixed
  while (i--) {
    prefixed = camelPrefixes[i] + upper
    if (prefixed in testEl.style) {
      return prefixes[i] + prop
    }
  }
}
},{"../util":60}],35:[function(require,module,exports){
var _ = require('../util')

module.exports = {

  bind: function () {
    this.attr = this.el.nodeType === 3
      ? 'nodeValue'
      : 'textContent'
  },

  update: function (value) {
    this.el[this.attr] = _.toString(value)
  }
  
}
},{"../util":60}],36:[function(require,module,exports){
module.exports = {

  priority: 1000,
  isLiteral: true,

  bind: function () {
    this.el.__v_trans = {
      id: this.expression
    }
  }

}
},{}],37:[function(require,module,exports){
var _ = require('../util')
var Watcher = require('../watcher')

module.exports = {

  priority: 900,

  bind: function () {
    var vm = this.vm
    if (this.el !== vm.$el) {
      _.warn(
        'v-with can only be used on instance root elements.'
      )
    } else if (!vm.$parent) {
      _.warn(
        'v-with must be used on an instance with a parent.'
      )
    } else {
      var key = this.arg
      this.watcher = new Watcher(
        vm.$parent,
        this.expression,
        key
          ? function (val) {
              vm.$set(key, val)
            }
          : function (val) {
              vm.$data = val
            }
      )
      // initial set
      var initialVal = this.watcher.value
      if (key) {
        vm.$set(key, initialVal)
      } else {
        vm.$data = initialVal
      }
    }
  },

  unbind: function () {
    if (this.watcher) {
      this.watcher.teardown()
    }
  }

}
},{"../util":60,"../watcher":64}],38:[function(require,module,exports){
var _ = require('../util')
var Path = require('../parsers/path')

/**
 * Filter filter for v-repeat
 *
 * @param {String} searchKey
 * @param {String} [delimiter]
 * @param {String} dataKey
 */

exports.filterBy = function (arr, searchKey, delimiter, dataKey) {
  // allow optional `in` delimiter
  // because why not
  if (delimiter && delimiter !== 'in') {
    dataKey = delimiter
  }
  // get the search string
  var search =
    _.stripQuotes(searchKey) ||
    this.$get(searchKey)
  if (!search) {
    return arr
  }
  search = ('' + search).toLowerCase()
  // get the optional dataKey
  dataKey =
    dataKey &&
    (_.stripQuotes(dataKey) || this.$get(dataKey))
  return arr.filter(function (item) {
    return dataKey
      ? contains(Path.get(item, dataKey), search)
      : contains(item, search)
  })
}

/**
 * Filter filter for v-repeat
 *
 * @param {String} sortKey
 * @param {String} reverseKey
 */

exports.orderBy = function (arr, sortKey, reverseKey) {
  var key =
    _.stripQuotes(sortKey) ||
    this.$get(sortKey)
  if (!key) {
    return arr
  }
  var order = 1
  if (reverseKey) {
    if (reverseKey === '-1') {
      order = -1
    } else if (reverseKey.charCodeAt(0) === 0x21) { // !
      reverseKey = reverseKey.slice(1)
      order = this.$get(reverseKey) ? 1 : -1
    } else {
      order = this.$get(reverseKey) ? -1 : 1
    }
  }
  // sort on a copy to avoid mutating original array
  return arr.slice().sort(function (a, b) {
    a = Path.get(a, key)
    b = Path.get(b, key)
    return a === b ? 0 : a > b ? order : -order
  })
}

/**
 * String contain helper
 *
 * @param {*} val
 * @param {String} search
 */

function contains (val, search) {
  if (_.isObject(val)) {
    for (var key in val) {
      if (contains(val[key], search)) {
        return true
      }
    }
  } else if (val != null) {
    return val.toString().toLowerCase().indexOf(search) > -1
  }
}
},{"../parsers/path":50,"../util":60}],39:[function(require,module,exports){
var _ = require('../util')

/**
 * Stringify value.
 *
 * @param {Number} indent
 */

exports.json = {
  read: function (value, indent) {
    return typeof value === 'string'
      ? value
      : JSON.stringify(value, null, Number(indent) || 2)
  },
  write: function (value) {
    try {
      return JSON.parse(value)
    } catch (e) {
      return value
    }
  }
}

/**
 * 'abc' => 'Abc'
 */

exports.capitalize = function (value) {
  if (!value && value !== 0) return ''
  value = value.toString()
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * 'abc' => 'ABC'
 */

exports.uppercase = function (value) {
  return (value || value === 0)
    ? value.toString().toUpperCase()
    : ''
}

/**
 * 'AbC' => 'abc'
 */

exports.lowercase = function (value) {
  return (value || value === 0)
    ? value.toString().toLowerCase()
    : ''
}

/**
 * 12345 => $12,345.00
 *
 * @param {String} sign
 */

var digitsRE = /(\d{3})(?=\d)/g

exports.currency = function (value, sign) {
  value = parseFloat(value)
  if (!value && value !== 0) return ''
  sign = sign || '$'
  var s = Math.floor(Math.abs(value)).toString(),
    i = s.length % 3,
    h = i > 0
      ? (s.slice(0, i) + (s.length > 3 ? ',' : ''))
      : '',
    f = '.' + value.toFixed(2).slice(-2)
  return (value < 0 ? '-' : '') +
    sign + h + s.slice(i).replace(digitsRE, '$1,') + f
}

/**
 * 'item' => 'items'
 *
 * @params
 *  an array of strings corresponding to
 *  the single, double, triple ... forms of the word to
 *  be pluralized. When the number to be pluralized
 *  exceeds the length of the args, it will use the last
 *  entry in the array.
 *
 *  e.g. ['single', 'double', 'triple', 'multiple']
 */

exports.pluralize = function (value) {
  var args = _.toArray(arguments, 1)
  return args.length > 1
    ? (args[value % 10 - 1] || args[args.length - 1])
    : (args[0] + (value === 1 ? '' : 's'))
}

/**
 * A special filter that takes a handler function,
 * wraps it so it only gets triggered on specific
 * keypresses. v-on only.
 *
 * @param {String} key
 */

var keyCodes = {
  enter    : 13,
  tab      : 9,
  'delete' : 46,
  up       : 38,
  left     : 37,
  right    : 39,
  down     : 40,
  esc      : 27
}

exports.key = function (handler, key) {
  if (!handler) return
  var code = keyCodes[key]
  if (!code) {
    code = parseInt(key, 10)
  }
  return function (e) {
    if (e.keyCode === code) {
      return handler.call(this, e)
    }
  }
}

// expose keycode hash
exports.key.keyCodes = keyCodes

/**
 * Install special array filters
 */

_.extend(exports, require('./array-filters'))
},{"../util":60,"./array-filters":38}],40:[function(require,module,exports){
var _ = require('../util')
var Directive = require('../directive')
var compile = require('../compiler/compile')
var transclude = require('../compiler/transclude')

/**
 * Transclude, compile and link element.
 *
 * If a pre-compiled linker is available, that means the
 * passed in element will be pre-transcluded and compiled
 * as well - all we need to do is to call the linker.
 *
 * Otherwise we need to call transclude/compile/link here.
 *
 * @param {Element} el
 * @return {Element}
 */

exports._compile = function (el) {
  var options = this.$options
  var parent = options._parent
  if (options._linkFn) {
    this._initElement(el)
    options._linkFn(this, el)
  } else {
    var raw = el
    if (options._asComponent) {
      // separate container element and content
      var content = options._content = _.extractContent(raw)
      // create two separate linekrs for container and content
      var parentOptions = parent.$options
      
      // hack: we need to skip the paramAttributes for this
      // child instance when compiling its parent container
      // linker. there could be a better way to do this.
      parentOptions._skipAttrs = options.paramAttributes
      var containerLinkFn =
        compile(raw, parentOptions, true, true)
      parentOptions._skipAttrs = null

      if (content) {
        var contentLinkFn =
          compile(content, parentOptions, true)
        // call content linker now, before transclusion
        this._contentUnlinkFn = contentLinkFn(parent, content)
      }
      // tranclude, this possibly replaces original
      el = transclude(el, options)
      this._initElement(el)
      // now call the container linker on the resolved el
      this._containerUnlinkFn = containerLinkFn(parent, el)
    } else {
      // simply transclude
      el = transclude(el, options)
      this._initElement(el)
    }
    var linkFn = compile(el, options)
    linkFn(this, el)
    if (options.replace) {
      _.replace(raw, el)
    }
  }
  return el
}

/**
 * Initialize instance element. Called in the public
 * $mount() method.
 *
 * @param {Element} el
 */

exports._initElement = function (el) {
  if (el instanceof DocumentFragment) {
    this._isBlock = true
    this.$el = this._blockStart = el.firstChild
    this._blockEnd = el.lastChild
    this._blockFragment = el
  } else {
    this.$el = el
  }
  this.$el.__vue__ = this
  this._callHook('beforeCompile')
}

/**
 * Create and bind a directive to an element.
 *
 * @param {String} name - directive name
 * @param {Node} node   - target node
 * @param {Object} desc - parsed directive descriptor
 * @param {Object} def  - directive definition object
 */

exports._bindDir = function (name, node, desc, def) {
  this._directives.push(
    new Directive(name, node, this, desc, def)
  )
}

/**
 * Teardown an instance, unobserves the data, unbind all the
 * directives, turn off all the event listeners, etc.
 *
 * @param {Boolean} remove - whether to remove the DOM node.
 * @param {Boolean} deferCleanup - if true, defer cleanup to
 *                                 be called later
 */

exports._destroy = function (remove, deferCleanup) {
  if (this._isBeingDestroyed) {
    return
  }
  this._callHook('beforeDestroy')
  this._isBeingDestroyed = true
  var i
  // remove self from parent. only necessary
  // if parent is not being destroyed as well.
  var parent = this.$parent
  if (parent && !parent._isBeingDestroyed) {
    i = parent._children.indexOf(this)
    parent._children.splice(i, 1)
  }
  // destroy all children.
  if (this._children) {
    i = this._children.length
    while (i--) {
      this._children[i].$destroy()
    }
  }
  // teardown parent linkers
  if (this._containerUnlinkFn) {
    this._containerUnlinkFn()
  }
  if (this._contentUnlinkFn) {
    this._contentUnlinkFn()
  }
  // teardown all directives. this also tearsdown all
  // directive-owned watchers. intentionally check for
  // directives array length on every loop since directives
  // that manages partial compilation can splice ones out
  for (i = 0; i < this._directives.length; i++) {
    this._directives[i]._teardown()
  }
  // teardown all user watchers.
  for (i in this._userWatchers) {
    this._userWatchers[i].teardown()
  }
  // remove reference to self on $el
  if (this.$el) {
    this.$el.__vue__ = null
  }
  // remove DOM element
  var self = this
  if (remove && this.$el) {
    this.$remove(function () {
      self._cleanup()
    })
  } else if (!deferCleanup) {
    this._cleanup()
  }
}

/**
 * Clean up to ensure garbage collection.
 * This is called after the leave transition if there
 * is any.
 */

exports._cleanup = function () {
  // remove reference from data ob
  this._data.__ob__.removeVm(this)
  this._data =
  this._watchers =
  this._userWatchers =
  this._watcherList =
  this.$el =
  this.$parent =
  this.$root =
  this._children =
  this._directives = null
  // call the last hook...
  this._isDestroyed = true
  this._callHook('destroyed')
  // turn off all instance listeners.
  this.$off()
}
},{"../compiler/compile":11,"../compiler/transclude":12,"../directive":14,"../util":60}],41:[function(require,module,exports){
var _ = require('../util')
var inDoc = _.inDoc

/**
 * Setup the instance's option events & watchers.
 * If the value is a string, we pull it from the
 * instance's methods by name.
 */

exports._initEvents = function () {
  var options = this.$options
  registerCallbacks(this, '$on', options.events)
  registerCallbacks(this, '$watch', options.watch)
}

/**
 * Register callbacks for option events and watchers.
 *
 * @param {Vue} vm
 * @param {String} action
 * @param {Object} hash
 */

function registerCallbacks (vm, action, hash) {
  if (!hash) return
  var handlers, key, i, j
  for (key in hash) {
    handlers = hash[key]
    if (_.isArray(handlers)) {
      for (i = 0, j = handlers.length; i < j; i++) {
        register(vm, action, key, handlers[i])
      }
    } else {
      register(vm, action, key, handlers)
    }
  }
}

/**
 * Helper to register an event/watch callback.
 *
 * @param {Vue} vm
 * @param {String} action
 * @param {String} key
 * @param {*} handler
 */

function register (vm, action, key, handler) {
  var type = typeof handler
  if (type === 'function') {
    vm[action](key, handler)
  } else if (type === 'string') {
    var methods = vm.$options.methods
    var method = methods && methods[handler]
    if (method) {
      vm[action](key, method)
    } else {
      _.warn(
        'Unknown method: "' + handler + '" when ' +
        'registering callback for ' + action +
        ': "' + key + '".'
      )
    }
  }
}

/**
 * Setup recursive attached/detached calls
 */

exports._initDOMHooks = function () {
  this.$on('hook:attached', onAttached)
  this.$on('hook:detached', onDetached)
}

/**
 * Callback to recursively call attached hook on children
 */

function onAttached () {
  this._isAttached = true
  var children = this._children
  if (!children) return
  for (var i = 0, l = children.length; i < l; i++) {
    var child = children[i]
    if (!child._isAttached && inDoc(child.$el)) {
      child._callHook('attached')
    }
  }
}

/**
 * Callback to recursively call detached hook on children
 */

function onDetached () {
  this._isAttached = false
  var children = this._children
  if (!children) return
  for (var i = 0, l = children.length; i < l; i++) {
    var child = children[i]
    if (child._isAttached && !inDoc(child.$el)) {
      child._callHook('detached')
    }
  }
}

/**
 * Trigger all handlers for a hook
 *
 * @param {String} hook
 */

exports._callHook = function (hook) {
  var handlers = this.$options[hook]
  if (handlers) {
    for (var i = 0, j = handlers.length; i < j; i++) {
      handlers[i].call(this)
    }
  }
  this.$emit('hook:' + hook)
}
},{"../util":60}],42:[function(require,module,exports){
var mergeOptions = require('../util/merge-option')

/**
 * The main init sequence. This is called for every
 * instance, including ones that are created from extended
 * constructors.
 *
 * @param {Object} options - this options object should be
 *                           the result of merging class
 *                           options and the options passed
 *                           in to the constructor.
 */

exports._init = function (options) {

  options = options || {}

  this.$el           = null
  this.$parent       = options._parent
  this.$root         = options._root || this
  this.$             = {} // child vm references
  this.$$            = {} // element references
  this._watcherList  = [] // all watchers as an array
  this._watchers     = {} // internal watchers as a hash
  this._userWatchers = {} // user watchers as a hash
  this._directives   = [] // all directives

  // a flag to avoid this being observed
  this._isVue = true

  // events bookkeeping
  this._events         = {}    // registered callbacks
  this._eventsCount    = {}    // for $broadcast optimization
  this._eventCancelled = false // for event cancellation

  // block instance properties
  this._isBlock     = false
  this._blockStart  =          // @type {CommentNode}
  this._blockEnd    = null     // @type {CommentNode}

  // lifecycle state
  this._isCompiled  =
  this._isDestroyed =
  this._isReady     =
  this._isAttached  =
  this._isBeingDestroyed = false

  // children
  this._children =         // @type {Array}
  this._childCtors = null  // @type {Object} - hash to cache
                           // child constructors

  // merge options.
  options = this.$options = mergeOptions(
    this.constructor.options,
    options,
    this
  )

  // set data after merge.
  this._data = options.data || {}

  // initialize data observation and scope inheritance.
  this._initScope()

  // setup event system and option events.
  this._initEvents()

  // call created hook
  this._callHook('created')

  // if `el` option is passed, start compilation.
  if (options.el) {
    this.$mount(options.el)
  }
}
},{"../util/merge-option":62}],43:[function(require,module,exports){
var _ = require('../util')
var Observer = require('../observer')
var Dep = require('../observer/dep')

/**
 * Setup the scope of an instance, which contains:
 * - observed data
 * - computed properties
 * - user methods
 * - meta properties
 */

exports._initScope = function () {
  this._initData()
  this._initComputed()
  this._initMethods()
  this._initMeta()
}

/**
 * Initialize the data. 
 */

exports._initData = function () {
  // proxy data on instance
  var data = this._data
  var keys = Object.keys(data)
  var i = keys.length
  var key
  while (i--) {
    key = keys[i]
    if (!_.isReserved(key)) {
      this._proxy(key)
    }
  }
  // observe data
  Observer.create(data).addVm(this)
}

/**
 * Swap the isntance's $data. Called in $data's setter.
 *
 * @param {Object} newData
 */

exports._setData = function (newData) {
  newData = newData || {}
  var oldData = this._data
  this._data = newData
  var keys, key, i
  // unproxy keys not present in new data
  keys = Object.keys(oldData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!_.isReserved(key) && !(key in newData)) {
      this._unproxy(key)
    }
  }
  // proxy keys not already proxied,
  // and trigger change for changed values
  keys = Object.keys(newData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!this.hasOwnProperty(key) && !_.isReserved(key)) {
      // new property
      this._proxy(key)
    }
  }
  oldData.__ob__.removeVm(this)
  Observer.create(newData).addVm(this)
  this._digest()
}

/**
 * Proxy a property, so that
 * vm.prop === vm._data.prop
 *
 * @param {String} key
 */

exports._proxy = function (key) {
  // need to store ref to self here
  // because these getter/setters might
  // be called by child instances!
  var self = this
  Object.defineProperty(self, key, {
    configurable: true,
    enumerable: true,
    get: function proxyGetter () {
      return self._data[key]
    },
    set: function proxySetter (val) {
      self._data[key] = val
    }
  })
}

/**
 * Unproxy a property.
 *
 * @param {String} key
 */

exports._unproxy = function (key) {
  delete this[key]
}

/**
 * Force update on every watcher in scope.
 */

exports._digest = function () {
  var i = this._watcherList.length
  while (i--) {
    this._watcherList[i].update()
  }
  var children = this._children
  var child
  if (children) {
    i = children.length
    while (i--) {
      child = children[i]
      if (child.$options.inherit) {
        child._digest()
      }
    }
  }
}

/**
 * Setup computed properties. They are essentially
 * special getter/setters
 */

function noop () {}
exports._initComputed = function () {
  var computed = this.$options.computed
  if (computed) {
    for (var key in computed) {
      var userDef = computed[key]
      var def = {
        enumerable: true,
        configurable: true
      }
      if (typeof userDef === 'function') {
        def.get = _.bind(userDef, this)
        def.set = noop
      } else {
        def.get = userDef.get
          ? _.bind(userDef.get, this)
          : noop
        def.set = userDef.set
          ? _.bind(userDef.set, this)
          : noop
      }
      Object.defineProperty(this, key, def)
    }
  }
}

/**
 * Setup instance methods. Methods must be bound to the
 * instance since they might be called by children
 * inheriting them.
 */

exports._initMethods = function () {
  var methods = this.$options.methods
  if (methods) {
    for (var key in methods) {
      this[key] = _.bind(methods[key], this)
    }
  }
}

/**
 * Initialize meta information like $index, $key & $value.
 */

exports._initMeta = function () {
  var metas = this.$options._meta
  if (metas) {
    for (var key in metas) {
      this._defineMeta(key, metas[key])
    }
  }
}

/**
 * Define a meta property, e.g $index, $key, $value
 * which only exists on the vm instance but not in $data.
 *
 * @param {String} key
 * @param {*} value
 */

exports._defineMeta = function (key, value) {
  var dep = new Dep()
  Object.defineProperty(this, key, {
    enumerable: true,
    configurable: true,
    get: function metaGetter () {
      if (Observer.target) {
        Observer.target.addDep(dep)
      }
      return value
    },
    set: function metaSetter (val) {
      if (val !== value) {
        value = val
        dep.notify()
      }
    }
  })
}
},{"../observer":46,"../observer/dep":45,"../util":60}],44:[function(require,module,exports){
var _ = require('../util')
var arrayProto = Array.prototype
var arrayMethods = Object.create(arrayProto)

/**
 * Intercept mutating methods and emit events
 */

;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  var original = arrayProto[method]
  _.define(arrayMethods, method, function mutator () {
    // avoid leaking arguments:
    // http://jsperf.com/closure-with-arguments
    var i = arguments.length
    var args = new Array(i)
    while (i--) {
      args[i] = arguments[i]
    }
    var result = original.apply(this, args)
    var ob = this.__ob__
    var inserted
    switch (method) {
      case 'push':
        inserted = args
        break
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.notify()
    return result
  })
})

/**
 * Swap the element at the given index with a new value
 * and emits corresponding event.
 *
 * @param {Number} index
 * @param {*} val
 * @return {*} - replaced element
 */

_.define(
  arrayProto,
  '$set',
  function $set (index, val) {
    if (index >= this.length) {
      this.length = index + 1
    }
    return this.splice(index, 1, val)[0]
  }
)

/**
 * Convenience method to remove the element at given index.
 *
 * @param {Number} index
 * @param {*} val
 */

_.define(
  arrayProto,
  '$remove',
  function $remove (index) {
    if (typeof index !== 'number') {
      index = this.indexOf(index)
    }
    if (index > -1) {
      return this.splice(index, 1)[0]
    }
  }
)

module.exports = arrayMethods
},{"../util":60}],45:[function(require,module,exports){
var uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 *
 * @constructor
 */

function Dep () {
  this.id = ++uid
  this.subs = []
}

var p = Dep.prototype

/**
 * Add a directive subscriber.
 *
 * @param {Directive} sub
 */

p.addSub = function (sub) {
  this.subs.push(sub)
}

/**
 * Remove a directive subscriber.
 *
 * @param {Directive} sub
 */

p.removeSub = function (sub) {
  if (this.subs.length) {
    var i = this.subs.indexOf(sub)
    if (i > -1) this.subs.splice(i, 1)
  }
}

/**
 * Notify all subscribers of a new value.
 */

p.notify = function () {
  for (var i = 0, l = this.subs.length; i < l; i++) {
    this.subs[i].update()
  }
}

module.exports = Dep
},{}],46:[function(require,module,exports){
var _ = require('../util')
var config = require('../config')
var Dep = require('./dep')
var arrayMethods = require('./array')
var arrayKeys = Object.getOwnPropertyNames(arrayMethods)
require('./object')

var uid = 0

/**
 * Type enums
 */

var ARRAY  = 0
var OBJECT = 1

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function protoAugment (target, src) {
  target.__proto__ = src
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function copyAugment (target, src, keys) {
  var i = keys.length
  var key
  while (i--) {
    key = keys[i]
    _.define(target, key, src[key])
  }
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 *
 * @param {Array|Object} value
 * @param {Number} type
 * @constructor
 */

function Observer (value, type) {
  this.id = ++uid
  this.value = value
  this.active = true
  this.deps = []
  _.define(value, '__ob__', this)
  if (type === ARRAY) {
    var augment = config.proto && _.hasProto
      ? protoAugment
      : copyAugment
    augment(value, arrayMethods, arrayKeys)
    this.observeArray(value)
  } else if (type === OBJECT) {
    this.walk(value)
  }
}

Observer.target = null

var p = Observer.prototype

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *
 * @param {*} value
 * @return {Observer|undefined}
 * @static
 */

Observer.create = function (value) {
  if (
    value &&
    value.hasOwnProperty('__ob__') &&
    value.__ob__ instanceof Observer
  ) {
    return value.__ob__
  } else if (_.isArray(value)) {
    return new Observer(value, ARRAY)
  } else if (
    _.isPlainObject(value) &&
    !value._isVue // avoid Vue instance
  ) {
    return new Observer(value, OBJECT)
  }
}

/**
 * Walk through each property and convert them into
 * getter/setters. This method should only be called when
 * value type is Object. Properties prefixed with `$` or `_`
 * and accessor properties are ignored.
 *
 * @param {Object} obj
 */

p.walk = function (obj) {
  var keys = Object.keys(obj)
  var i = keys.length
  var key, prefix
  while (i--) {
    key = keys[i]
    prefix = key.charCodeAt(0)
    if (prefix !== 0x24 && prefix !== 0x5F) { // skip $ or _
      this.convert(key, obj[key])
    }
  }
}

/**
 * Try to carete an observer for a child value,
 * and if value is array, link dep to the array.
 *
 * @param {*} val
 * @return {Dep|undefined}
 */

p.observe = function (val) {
  return Observer.create(val)
}

/**
 * Observe a list of Array items.
 *
 * @param {Array} items
 */

p.observeArray = function (items) {
  var i = items.length
  while (i--) {
    this.observe(items[i])
  }
}

/**
 * Convert a property into getter/setter so we can emit
 * the events when the property is accessed/changed.
 *
 * @param {String} key
 * @param {*} val
 */

p.convert = function (key, val) {
  var ob = this
  var childOb = ob.observe(val)
  var dep = new Dep()
  if (childOb) {
    childOb.deps.push(dep)
  }
  Object.defineProperty(ob.value, key, {
    enumerable: true,
    configurable: true,
    get: function () {
      // Observer.target is a watcher whose getter is
      // currently being evaluated.
      if (ob.active && Observer.target) {
        Observer.target.addDep(dep)
      }
      return val
    },
    set: function (newVal) {
      if (newVal === val) return
      // remove dep from old value
      var oldChildOb = val && val.__ob__
      if (oldChildOb) {
        var oldDeps = oldChildOb.deps
        oldDeps.splice(oldDeps.indexOf(dep), 1)
      }
      val = newVal
      // add dep to new value
      var newChildOb = ob.observe(newVal)
      if (newChildOb) {
        newChildOb.deps.push(dep)
      }
      dep.notify()
    }
  })
}

/**
 * Notify change on all self deps on an observer.
 * This is called when a mutable value mutates. e.g.
 * when an Array's mutating methods are called, or an
 * Object's $add/$delete are called.
 */

p.notify = function () {
  var deps = this.deps
  for (var i = 0, l = deps.length; i < l; i++) {
    deps[i].notify()
  }
}

/**
 * Add an owner vm, so that when $add/$delete mutations
 * happen we can notify owner vms to proxy the keys and
 * digest the watchers. This is only called when the object
 * is observed as an instance's root $data.
 *
 * @param {Vue} vm
 */

p.addVm = function (vm) {
  (this.vms = this.vms || []).push(vm)
}

/**
 * Remove an owner vm. This is called when the object is
 * swapped out as an instance's $data object.
 *
 * @param {Vue} vm
 */

p.removeVm = function (vm) {
  this.vms.splice(this.vms.indexOf(vm), 1)
}

module.exports = Observer

},{"../config":13,"../util":60,"./array":44,"./dep":45,"./object":47}],47:[function(require,module,exports){
var _ = require('../util')
var objProto = Object.prototype

/**
 * Add a new property to an observed object
 * and emits corresponding event
 *
 * @param {String} key
 * @param {*} val
 * @public
 */

_.define(
  objProto,
  '$add',
  function $add (key, val) {
    if (this.hasOwnProperty(key)) return
    var ob = this.__ob__
    if (!ob || _.isReserved(key)) {
      this[key] = val
      return
    }
    ob.convert(key, val)
    if (ob.vms) {
      var i = ob.vms.length
      while (i--) {
        var vm = ob.vms[i]
        vm._proxy(key)
        vm._digest()
      }
    } else {
      ob.notify()
    }
  }
)

/**
 * Deletes a property from an observed object
 * and emits corresponding event
 *
 * @param {String} key
 * @public
 */

_.define(
  objProto,
  '$delete',
  function $delete (key) {
    if (!this.hasOwnProperty(key)) return
    delete this[key]
    var ob = this.__ob__
    if (!ob || _.isReserved(key)) {
      return
    }
    if (ob.vms) {
      var i = ob.vms.length
      while (i--) {
        var vm = ob.vms[i]
        vm._unproxy(key)
        vm._digest()
      }
    } else {
      ob.notify()
    }
  }
)
},{"../util":60}],48:[function(require,module,exports){
var _ = require('../util')
var Cache = require('../cache')
var cache = new Cache(1000)
var argRE = /^[^\{\?]+$|^'[^']*'$|^"[^"]*"$/
var filterTokenRE = /[^\s'"]+|'[^']+'|"[^"]+"/g

/**
 * Parser state
 */

var str
var c, i, l
var inSingle
var inDouble
var curly
var square
var paren
var begin
var argIndex
var dirs
var dir
var lastFilterIndex
var arg

/**
 * Push a directive object into the result Array
 */

function pushDir () {
  dir.raw = str.slice(begin, i).trim()
  if (dir.expression === undefined) {
    dir.expression = str.slice(argIndex, i).trim()
  } else if (lastFilterIndex !== begin) {
    pushFilter()
  }
  if (i === 0 || dir.expression) {
    dirs.push(dir)
  }
}

/**
 * Push a filter to the current directive object
 */

function pushFilter () {
  var exp = str.slice(lastFilterIndex, i).trim()
  var filter
  if (exp) {
    filter = {}
    var tokens = exp.match(filterTokenRE)
    filter.name = tokens[0]
    filter.args = tokens.length > 1 ? tokens.slice(1) : null
  }
  if (filter) {
    (dir.filters = dir.filters || []).push(filter)
  }
  lastFilterIndex = i + 1
}

/**
 * Parse a directive string into an Array of AST-like
 * objects representing directives.
 *
 * Example:
 *
 * "click: a = a + 1 | uppercase" will yield:
 * {
 *   arg: 'click',
 *   expression: 'a = a + 1',
 *   filters: [
 *     { name: 'uppercase', args: null }
 *   ]
 * }
 *
 * @param {String} str
 * @return {Array<Object>}
 */

exports.parse = function (s) {

  var hit = cache.get(s)
  if (hit) {
    return hit
  }

  // reset parser state
  str = s
  inSingle = inDouble = false
  curly = square = paren = begin = argIndex = 0
  lastFilterIndex = 0
  dirs = []
  dir = {}
  arg = null

  for (i = 0, l = str.length; i < l; i++) {
    c = str.charCodeAt(i)
    if (inSingle) {
      // check single quote
      if (c === 0x27) inSingle = !inSingle
    } else if (inDouble) {
      // check double quote
      if (c === 0x22) inDouble = !inDouble
    } else if (
      c === 0x2C && // comma
      !paren && !curly && !square
    ) {
      // reached the end of a directive
      pushDir()
      // reset & skip the comma
      dir = {}
      begin = argIndex = lastFilterIndex = i + 1
    } else if (
      c === 0x3A && // colon
      !dir.expression &&
      !dir.arg
    ) {
      // argument
      arg = str.slice(begin, i).trim()
      // test for valid argument here
      // since we may have caught stuff like first half of
      // an object literal or a ternary expression.
      if (argRE.test(arg)) {
        argIndex = i + 1
        dir.arg = _.stripQuotes(arg) || arg
      }
    } else if (
      c === 0x7C && // pipe
      str.charCodeAt(i + 1) !== 0x7C &&
      str.charCodeAt(i - 1) !== 0x7C
    ) {
      if (dir.expression === undefined) {
        // first filter, end of expression
        lastFilterIndex = i + 1
        dir.expression = str.slice(argIndex, i).trim()
      } else {
        // already has filter
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22: inDouble = true; break // "
        case 0x27: inSingle = true; break // '
        case 0x28: paren++; break         // (
        case 0x29: paren--; break         // )
        case 0x5B: square++; break        // [
        case 0x5D: square--; break        // ]
        case 0x7B: curly++; break         // {
        case 0x7D: curly--; break         // }
      }
    }
  }

  if (i === 0 || begin !== i) {
    pushDir()
  }

  cache.put(s, dirs)
  return dirs
}
},{"../cache":10,"../util":60}],49:[function(require,module,exports){
var _ = require('../util')
var Path = require('./path')
var Cache = require('../cache')
var expressionCache = new Cache(1000)

var keywords =
  'Math,break,case,catch,continue,debugger,default,' +
  'delete,do,else,false,finally,for,function,if,in,' +
  'instanceof,new,null,return,switch,this,throw,true,try,' +
  'typeof,var,void,while,with,undefined,abstract,boolean,' +
  'byte,char,class,const,double,enum,export,extends,' +
  'final,float,goto,implements,import,int,interface,long,' +
  'native,package,private,protected,public,short,static,' +
  'super,synchronized,throws,transient,volatile,' +
  'arguments,let,yield'

var wsRE = /\s/g
var newlineRE = /\n/g
var saveRE = /[\{,]\s*[\w\$_]+\s*:|'[^']*'|"[^"]*"/g
var restoreRE = /"(\d+)"/g
var pathTestRE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\]|\[\d+\])*$/
var pathReplaceRE = /[^\w$\.]([A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\])*)/g
var keywordsRE = new RegExp('^(' + keywords.replace(/,/g, '\\b|') + '\\b)')

/**
 * Save / Rewrite / Restore
 *
 * When rewriting paths found in an expression, it is
 * possible for the same letter sequences to be found in
 * strings and Object literal property keys. Therefore we
 * remove and store these parts in a temporary array, and
 * restore them after the path rewrite.
 */

var saved = []

/**
 * Save replacer
 *
 * @param {String} str
 * @return {String} - placeholder with index
 */

function save (str) {
  var i = saved.length
  saved[i] = str.replace(newlineRE, '\\n')
  return '"' + i + '"'
}

/**
 * Path rewrite replacer
 *
 * @param {String} raw
 * @return {String}
 */

function rewrite (raw) {
  var c = raw.charAt(0)
  var path = raw.slice(1)
  if (keywordsRE.test(path)) {
    return raw
  } else {
    path = path.indexOf('"') > -1
      ? path.replace(restoreRE, restore)
      : path
    return c + 'scope.' + path
  }
}

/**
 * Restore replacer
 *
 * @param {String} str
 * @param {String} i - matched save index
 * @return {String}
 */

function restore (str, i) {
  return saved[i]
}

/**
 * Rewrite an expression, prefixing all path accessors with
 * `scope.` and generate getter/setter functions.
 *
 * @param {String} exp
 * @param {Boolean} needSet
 * @return {Function}
 */

function compileExpFns (exp, needSet) {
  // reset state
  saved.length = 0
  // save strings and object literal keys
  var body = exp
    .replace(saveRE, save)
    .replace(wsRE, '')
  // rewrite all paths
  // pad 1 space here becaue the regex matches 1 extra char
  body = (' ' + body)
    .replace(pathReplaceRE, rewrite)
    .replace(restoreRE, restore)
  var getter = makeGetter(body)
  if (getter) {
    return {
      get: getter,
      body: body,
      set: needSet
        ? makeSetter(body)
        : null
    }
  }
}

/**
 * Compile getter setters for a simple path.
 *
 * @param {String} exp
 * @return {Function}
 */

function compilePathFns (exp) {
  var getter, path
  if (exp.indexOf('[') < 0) {
    // really simple path
    path = exp.split('.')
    getter = Path.compileGetter(path)
  } else {
    // do the real parsing
    path = Path.parse(exp)
    getter = path.get
  }
  return {
    get: getter,
    // always generate setter for simple paths
    set: function (obj, val) {
      Path.set(obj, path, val)
    }
  }
}

/**
 * Build a getter function. Requires eval.
 *
 * We isolate the try/catch so it doesn't affect the
 * optimization of the parse function when it is not called.
 *
 * @param {String} body
 * @return {Function|undefined}
 */

function makeGetter (body) {
  try {
    return new Function('scope', 'return ' + body + ';')
  } catch (e) {
    _.warn(
      'Invalid expression. ' +
      'Generated function body: ' + body
    )
  }
}

/**
 * Build a setter function.
 *
 * This is only needed in rare situations like "a[b]" where
 * a settable path requires dynamic evaluation.
 *
 * This setter function may throw error when called if the
 * expression body is not a valid left-hand expression in
 * assignment.
 *
 * @param {String} body
 * @return {Function|undefined}
 */

function makeSetter (body) {
  try {
    return new Function('scope', 'value', body + '=value;')
  } catch (e) {
    _.warn('Invalid setter function body: ' + body)
  }
}

/**
 * Check for setter existence on a cache hit.
 *
 * @param {Function} hit
 */

function checkSetter (hit) {
  if (!hit.set) {
    hit.set = makeSetter(hit.body)
  }
}

/**
 * Parse an expression into re-written getter/setters.
 *
 * @param {String} exp
 * @param {Boolean} needSet
 * @return {Function}
 */

exports.parse = function (exp, needSet) {
  exp = exp.trim()
  // try cache
  var hit = expressionCache.get(exp)
  if (hit) {
    if (needSet) {
      checkSetter(hit)
    }
    return hit
  }
  // we do a simple path check to optimize for them.
  // the check fails valid paths with unusal whitespaces,
  // but that's too rare and we don't care.
  var res = pathTestRE.test(exp)
    ? compilePathFns(exp)
    : compileExpFns(exp, needSet)
  expressionCache.put(exp, res)
  return res
}

// Export the pathRegex for external use
exports.pathTestRE = pathTestRE
},{"../cache":10,"../util":60,"./path":50}],50:[function(require,module,exports){
var _ = require('../util')
var Cache = require('../cache')
var pathCache = new Cache(1000)
var identRE = /^[$_a-zA-Z]+[\w$]*$/

/**
 * Path-parsing algorithm scooped from Polymer/observe-js
 */

var pathStateMachine = {
  'beforePath': {
    'ws': ['beforePath'],
    'ident': ['inIdent', 'append'],
    '[': ['beforeElement'],
    'eof': ['afterPath']
  },

  'inPath': {
    'ws': ['inPath'],
    '.': ['beforeIdent'],
    '[': ['beforeElement'],
    'eof': ['afterPath']
  },

  'beforeIdent': {
    'ws': ['beforeIdent'],
    'ident': ['inIdent', 'append']
  },

  'inIdent': {
    'ident': ['inIdent', 'append'],
    '0': ['inIdent', 'append'],
    'number': ['inIdent', 'append'],
    'ws': ['inPath', 'push'],
    '.': ['beforeIdent', 'push'],
    '[': ['beforeElement', 'push'],
    'eof': ['afterPath', 'push']
  },

  'beforeElement': {
    'ws': ['beforeElement'],
    '0': ['afterZero', 'append'],
    'number': ['inIndex', 'append'],
    "'": ['inSingleQuote', 'append', ''],
    '"': ['inDoubleQuote', 'append', '']
  },

  'afterZero': {
    'ws': ['afterElement', 'push'],
    ']': ['inPath', 'push']
  },

  'inIndex': {
    '0': ['inIndex', 'append'],
    'number': ['inIndex', 'append'],
    'ws': ['afterElement'],
    ']': ['inPath', 'push']
  },

  'inSingleQuote': {
    "'": ['afterElement'],
    'eof': 'error',
    'else': ['inSingleQuote', 'append']
  },

  'inDoubleQuote': {
    '"': ['afterElement'],
    'eof': 'error',
    'else': ['inDoubleQuote', 'append']
  },

  'afterElement': {
    'ws': ['afterElement'],
    ']': ['inPath', 'push']
  }
}

function noop () {}

/**
 * Determine the type of a character in a keypath.
 *
 * @param {Char} char
 * @return {String} type
 */

function getPathCharType (char) {
  if (char === undefined) {
    return 'eof'
  }

  var code = char.charCodeAt(0)

  switch(code) {
    case 0x5B: // [
    case 0x5D: // ]
    case 0x2E: // .
    case 0x22: // "
    case 0x27: // '
    case 0x30: // 0
      return char

    case 0x5F: // _
    case 0x24: // $
      return 'ident'

    case 0x20: // Space
    case 0x09: // Tab
    case 0x0A: // Newline
    case 0x0D: // Return
    case 0xA0:  // No-break space
    case 0xFEFF:  // Byte Order Mark
    case 0x2028:  // Line Separator
    case 0x2029:  // Paragraph Separator
      return 'ws'
  }

  // a-z, A-Z
  if ((0x61 <= code && code <= 0x7A) ||
      (0x41 <= code && code <= 0x5A)) {
    return 'ident'
  }

  // 1-9
  if (0x31 <= code && code <= 0x39) {
    return 'number'
  }

  return 'else'
}

/**
 * Parse a string path into an array of segments
 * Todo implement cache
 *
 * @param {String} path
 * @return {Array|undefined}
 */

function parsePath (path) {
  var keys = []
  var index = -1
  var mode = 'beforePath'
  var c, newChar, key, type, transition, action, typeMap

  var actions = {
    push: function() {
      if (key === undefined) {
        return
      }
      keys.push(key)
      key = undefined
    },
    append: function() {
      if (key === undefined) {
        key = newChar
      } else {
        key += newChar
      }
    }
  }

  function maybeUnescapeQuote () {
    var nextChar = path[index + 1]
    if ((mode === 'inSingleQuote' && nextChar === "'") ||
        (mode === 'inDoubleQuote' && nextChar === '"')) {
      index++
      newChar = nextChar
      actions.append()
      return true
    }
  }

  while (mode) {
    index++
    c = path[index]

    if (c === '\\' && maybeUnescapeQuote()) {
      continue
    }

    type = getPathCharType(c)
    typeMap = pathStateMachine[mode]
    transition = typeMap[type] || typeMap['else'] || 'error'

    if (transition === 'error') {
      return // parse error
    }

    mode = transition[0]
    action = actions[transition[1]] || noop
    newChar = transition[2] === undefined
      ? c
      : transition[2]
    action()

    if (mode === 'afterPath') {
      return keys
    }
  }
}

/**
 * Format a accessor segment based on its type.
 *
 * @param {String} key
 * @return {Boolean}
 */

function formatAccessor(key) {
  if (identRE.test(key)) { // identifier
    return '.' + key
  } else if (+key === key >>> 0) { // bracket index
    return '[' + key + ']'
  } else { // bracket string
    return '["' + key.replace(/"/g, '\\"') + '"]'
  }
}

/**
 * Compiles a getter function with a fixed path.
 *
 * @param {Array} path
 * @return {Function}
 */

exports.compileGetter = function (path) {
  var body =
    'try{return o' +
    path.map(formatAccessor).join('') +
    '}catch(e){};'
  return new Function('o', body)
}

/**
 * External parse that check for a cache hit first
 *
 * @param {String} path
 * @return {Array|undefined}
 */

exports.parse = function (path) {
  var hit = pathCache.get(path)
  if (!hit) {
    hit = parsePath(path)
    if (hit) {
      hit.get = exports.compileGetter(hit)
      pathCache.put(path, hit)
    }
  }
  return hit
}

/**
 * Get from an object from a path string
 *
 * @param {Object} obj
 * @param {String} path
 */

exports.get = function (obj, path) {
  path = exports.parse(path)
  if (path) {
    return path.get(obj)
  }
}

/**
 * Set on an object from a path
 *
 * @param {Object} obj
 * @param {String | Array} path
 * @param {*} val
 */

exports.set = function (obj, path, val) {
  if (typeof path === 'string') {
    path = exports.parse(path)
  }
  if (!path || !_.isObject(obj)) {
    return false
  }
  var last, key
  for (var i = 0, l = path.length - 1; i < l; i++) {
    last = obj
    key = path[i]
    obj = obj[key]
    if (!_.isObject(obj)) {
      obj = {}
      last.$add(key, obj)
    }
  }
  key = path[i]
  if (key in obj) {
    obj[key] = val
  } else {
    obj.$add(key, val)
  }
  return true
}
},{"../cache":10,"../util":60}],51:[function(require,module,exports){
var _ = require('../util')
var Cache = require('../cache')
var templateCache = new Cache(1000)
var idSelectorCache = new Cache(1000)

var map = {
  _default : [0, '', ''],
  legend   : [1, '<fieldset>', '</fieldset>'],
  tr       : [2, '<table><tbody>', '</tbody></table>'],
  col      : [
    2,
    '<table><tbody></tbody><colgroup>',
    '</colgroup></table>'
  ]
}

map.td =
map.th = [
  3,
  '<table><tbody><tr>',
  '</tr></tbody></table>'
]

map.option =
map.optgroup = [
  1,
  '<select multiple="multiple">',
  '</select>'
]

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>']

map.g =
map.defs =
map.symbol =
map.use =
map.image =
map.text =
map.circle =
map.ellipse =
map.line =
map.path =
map.polygon =
map.polyline =
map.rect = [
  1,
  '<svg ' +
    'xmlns="http://www.w3.org/2000/svg" ' +
    'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    'xmlns:ev="http://www.w3.org/2001/xml-events"' +
    'version="1.1">',
  '</svg>'
]

var tagRE = /<([\w:]+)/
var entityRE = /&\w+;/

/**
 * Convert a string template to a DocumentFragment.
 * Determines correct wrapping by tag types. Wrapping
 * strategy found in jQuery & component/domify.
 *
 * @param {String} templateString
 * @return {DocumentFragment}
 */

function stringToFragment (templateString) {
  // try a cache hit first
  var hit = templateCache.get(templateString)
  if (hit) {
    return hit
  }

  var frag = document.createDocumentFragment()
  var tagMatch = templateString.match(tagRE)
  var entityMatch = entityRE.test(templateString)

  if (!tagMatch && !entityMatch) {
    // text only, return a single text node.
    frag.appendChild(
      document.createTextNode(templateString)
    )
  } else {

    var tag    = tagMatch && tagMatch[1]
    var wrap   = map[tag] || map._default
    var depth  = wrap[0]
    var prefix = wrap[1]
    var suffix = wrap[2]
    var node   = document.createElement('div')

    node.innerHTML = prefix + templateString.trim() + suffix
    while (depth--) {
      node = node.lastChild
    }

    var child
    /* jshint boss:true */
    while (child = node.firstChild) {
      frag.appendChild(child)
    }
  }

  templateCache.put(templateString, frag)
  return frag
}

/**
 * Convert a template node to a DocumentFragment.
 *
 * @param {Node} node
 * @return {DocumentFragment}
 */

function nodeToFragment (node) {
  var tag = node.tagName
  // if its a template tag and the browser supports it,
  // its content is already a document fragment.
  if (
    tag === 'TEMPLATE' &&
    node.content instanceof DocumentFragment
  ) {
    return node.content
  }
  return tag === 'SCRIPT'
    ? stringToFragment(node.textContent)
    : stringToFragment(node.innerHTML)
}

// Test for the presence of the Safari template cloning bug
// https://bugs.webkit.org/show_bug.cgi?id=137755
var hasBrokenTemplate = _.inBrowser
  ? (function () {
      var a = document.createElement('div')
      a.innerHTML = '<template>1</template>'
      return !a.cloneNode(true).firstChild.innerHTML
    })()
  : false

// Test for IE10/11 textarea placeholder clone bug
var hasTextareaCloneBug = _.inBrowser
  ? (function () {
      var t = document.createElement('textarea')
      t.placeholder = 't'
      return t.cloneNode(true).value === 't'
    })()
  : false

/**
 * 1. Deal with Safari cloning nested <template> bug by
 *    manually cloning all template instances.
 * 2. Deal with IE10/11 textarea placeholder bug by setting
 *    the correct value after cloning.
 *
 * @param {Element|DocumentFragment} node
 * @return {Element|DocumentFragment}
 */

exports.clone = function (node) {
  var res = node.cloneNode(true)
  var i, original, cloned
  /* istanbul ignore if */
  if (hasBrokenTemplate) {
    original = node.querySelectorAll('template')
    if (original.length) {
      cloned = res.querySelectorAll('template')
      i = cloned.length
      while (i--) {
        cloned[i].parentNode.replaceChild(
          original[i].cloneNode(true),
          cloned[i]
        )
      }
    }
  }
  /* istanbul ignore if */
  if (hasTextareaCloneBug) {
    if (node.tagName === 'TEXTAREA') {
      res.value = node.value
    } else {
      original = node.querySelectorAll('textarea')
      if (original.length) {
        cloned = res.querySelectorAll('textarea')
        i = cloned.length
        while (i--) {
          cloned[i].value = original[i].value
        }
      }
    }
  }
  return res
}

/**
 * Process the template option and normalizes it into a
 * a DocumentFragment that can be used as a partial or a
 * instance template.
 *
 * @param {*} template
 *    Possible values include:
 *    - DocumentFragment object
 *    - Node object of type Template
 *    - id selector: '#some-template-id'
 *    - template string: '<div><span>{{msg}}</span></div>'
 * @param {Boolean} clone
 * @param {Boolean} noSelector
 * @return {DocumentFragment|undefined}
 */

exports.parse = function (template, clone, noSelector) {
  var node, frag

  // if the template is already a document fragment,
  // do nothing
  if (template instanceof DocumentFragment) {
    return clone
      ? template.cloneNode(true)
      : template
  }

  if (typeof template === 'string') {
    // id selector
    if (!noSelector && template.charAt(0) === '#') {
      // id selector can be cached too
      frag = idSelectorCache.get(template)
      if (!frag) {
        node = document.getElementById(template.slice(1))
        if (node) {
          frag = nodeToFragment(node)
          // save selector to cache
          idSelectorCache.put(template, frag)
        }
      }
    } else {
      // normal string template
      frag = stringToFragment(template)
    }
  } else if (template.nodeType) {
    // a direct node
    frag = nodeToFragment(template)
  }

  return frag && clone
    ? exports.clone(frag)
    : frag
}
},{"../cache":10,"../util":60}],52:[function(require,module,exports){
var Cache = require('../cache')
var config = require('../config')
var dirParser = require('./directive')
var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g
var cache, tagRE, htmlRE, firstChar, lastChar

/**
 * Escape a string so it can be used in a RegExp
 * constructor.
 *
 * @param {String} str
 */

function escapeRegex (str) {
  return str.replace(regexEscapeRE, '\\$&')
}

/**
 * Compile the interpolation tag regex.
 *
 * @return {RegExp}
 */

function compileRegex () {
  config._delimitersChanged = false
  var open = config.delimiters[0]
  var close = config.delimiters[1]
  firstChar = open.charAt(0)
  lastChar = close.charAt(close.length - 1)
  var firstCharRE = escapeRegex(firstChar)
  var lastCharRE = escapeRegex(lastChar)
  var openRE = escapeRegex(open)
  var closeRE = escapeRegex(close)
  tagRE = new RegExp(
    firstCharRE + '?' + openRE +
    '(.+?)' +
    closeRE + lastCharRE + '?',
    'g'
  )
  htmlRE = new RegExp(
    '^' + firstCharRE + openRE +
    '.*' +
    closeRE + lastCharRE + '$'
  )
  // reset cache
  cache = new Cache(1000)
}

/**
 * Parse a template text string into an array of tokens.
 *
 * @param {String} text
 * @return {Array<Object> | null}
 *               - {String} type
 *               - {String} value
 *               - {Boolean} [html]
 *               - {Boolean} [oneTime]
 */

exports.parse = function (text) {
  if (config._delimitersChanged) {
    compileRegex()
  }
  var hit = cache.get(text)
  if (hit) {
    return hit
  }
  if (!tagRE.test(text)) {
    return null
  }
  var tokens = []
  var lastIndex = tagRE.lastIndex = 0
  var match, index, value, first, oneTime, partial
  /* jshint boss:true */
  while (match = tagRE.exec(text)) {
    index = match.index
    // push text token
    if (index > lastIndex) {
      tokens.push({
        value: text.slice(lastIndex, index)
      })
    }
    // tag token
    first = match[1].charCodeAt(0)
    oneTime = first === 0x2A // *
    partial = first === 0x3E // >
    value = (oneTime || partial)
      ? match[1].slice(1)
      : match[1]
    tokens.push({
      tag: true,
      value: value.trim(),
      html: htmlRE.test(match[0]),
      oneTime: oneTime,
      partial: partial
    })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    tokens.push({
      value: text.slice(lastIndex)
    })
  }
  cache.put(text, tokens)
  return tokens
}

/**
 * Format a list of tokens into an expression.
 * e.g. tokens parsed from 'a {{b}} c' can be serialized
 * into one single expression as '"a " + b + " c"'.
 *
 * @param {Array} tokens
 * @param {Vue} [vm]
 * @return {String}
 */

exports.tokensToExp = function (tokens, vm) {
  return tokens.length > 1
    ? tokens.map(function (token) {
        return formatToken(token, vm)
      }).join('+')
    : formatToken(tokens[0], vm, true)
}

/**
 * Format a single token.
 *
 * @param {Object} token
 * @param {Vue} [vm]
 * @param {Boolean} single
 * @return {String}
 */

function formatToken (token, vm, single) {
  return token.tag
    ? vm && token.oneTime
      ? '"' + vm.$eval(token.value) + '"'
      : single
        ? token.value
        : inlineFilters(token.value)
    : '"' + token.value + '"'
}

/**
 * For an attribute with multiple interpolation tags,
 * e.g. attr="some-{{thing | filter}}", in order to combine
 * the whole thing into a single watchable expression, we
 * have to inline those filters. This function does exactly
 * that. This is a bit hacky but it avoids heavy changes
 * to directive parser and watcher mechanism.
 *
 * @param {String} exp
 * @return {String}
 */

var filterRE = /[^|]\|[^|]/
function inlineFilters (exp) {
  if (!filterRE.test(exp)) {
    return '(' + exp + ')'
  } else {
    var dir = dirParser.parse(exp)[0]
    if (!dir.filters) {
      return '(' + exp + ')'
    } else {
      exp = dir.expression
      for (var i = 0, l = dir.filters.length; i < l; i++) {
        var filter = dir.filters[i]
        var args = filter.args
          ? ',"' + filter.args.join('","') + '"'
          : ''
        exp = 'this.$options.filters["' + filter.name + '"]' +
          '.apply(this,[' + exp + args + '])'
      }
      return exp
    }
  }
}
},{"../cache":10,"../config":13,"./directive":48}],53:[function(require,module,exports){
var _ = require('../util')
var addClass = _.addClass
var removeClass = _.removeClass
var transDurationProp = _.transitionProp + 'Duration'
var animDurationProp = _.animationProp + 'Duration'

var queue = []
var queued = false

/**
 * Push a job into the transition queue, which is to be
 * executed on next frame.
 *
 * @param {Element} el    - target element
 * @param {Number} dir    - 1: enter, -1: leave
 * @param {Function} op   - the actual dom operation
 * @param {String} cls    - the className to remove when the
 *                          transition is done.
 * @param {Function} [cb] - user supplied callback.
 */

function push (el, dir, op, cls, cb) {
  queue.push({
    el  : el,
    dir : dir,
    cb  : cb,
    cls : cls,
    op  : op
  })
  if (!queued) {
    queued = true
    _.nextTick(flush)
  }
}

/**
 * Flush the queue, and do one forced reflow before
 * triggering transitions.
 */

function flush () {
  /* jshint unused: false */
  var f = document.documentElement.offsetHeight
  queue.forEach(run)
  queue = []
  queued = false
}

/**
 * Run a transition job.
 *
 * @param {Object} job
 */

function run (job) {

  var el = job.el
  var data = el.__v_trans
  var cls = job.cls
  var cb = job.cb
  var op = job.op
  var transitionType = getTransitionType(el, data, cls)

  if (job.dir > 0) { // ENTER
    if (transitionType === 1) {
      // trigger transition by removing enter class
      removeClass(el, cls)
      // only need to listen for transitionend if there's
      // a user callback
      if (cb) setupTransitionCb(_.transitionEndEvent)
    } else if (transitionType === 2) {
      // animations are triggered when class is added
      // so we just listen for animationend to remove it.
      setupTransitionCb(_.animationEndEvent, function () {
        removeClass(el, cls)
      })
    } else {
      // no transition applicable
      removeClass(el, cls)
      if (cb) cb()
    }
  } else { // LEAVE
    if (transitionType) {
      // leave transitions/animations are both triggered
      // by adding the class, just remove it on end event.
      var event = transitionType === 1
        ? _.transitionEndEvent
        : _.animationEndEvent
      setupTransitionCb(event, function () {
        op()
        removeClass(el, cls)
      })
    } else {
      op()
      removeClass(el, cls)
      if (cb) cb()
    }
  }

  /**
   * Set up a transition end callback, store the callback
   * on the element's __v_trans data object, so we can
   * clean it up if another transition is triggered before
   * the callback is fired.
   *
   * @param {String} event
   * @param {Function} [cleanupFn]
   */

  function setupTransitionCb (event, cleanupFn) {
    data.event = event
    var onEnd = data.callback = function transitionCb (e) {
      if (e.target === el) {
        _.off(el, event, onEnd)
        data.event = data.callback = null
        if (cleanupFn) cleanupFn()
        if (cb) cb()
      }
    }
    _.on(el, event, onEnd)
  }
}

/**
 * Get an element's transition type based on the
 * calculated styles
 *
 * @param {Element} el
 * @param {Object} data
 * @param {String} className
 * @return {Number}
 *         1 - transition
 *         2 - animation
 */

function getTransitionType (el, data, className) {
  var type = data.cache && data.cache[className]
  if (type) return type
  var inlineStyles = el.style
  var computedStyles = window.getComputedStyle(el)
  var transDuration =
    inlineStyles[transDurationProp] ||
    computedStyles[transDurationProp]
  if (transDuration && transDuration !== '0s') {
    type = 1
  } else {
    var animDuration =
      inlineStyles[animDurationProp] ||
      computedStyles[animDurationProp]
    if (animDuration && animDuration !== '0s') {
      type = 2
    }
  }
  if (type) {
    if (!data.cache) data.cache = {}
    data.cache[className] = type
  }
  return type
}

/**
 * Apply CSS transition to an element.
 *
 * @param {Element} el
 * @param {Number} direction - 1: enter, -1: leave
 * @param {Function} op - the actual DOM operation
 * @param {Object} data - target element's transition data
 */

module.exports = function (el, direction, op, data, cb) {
  var prefix = data.id || 'v'
  var enterClass = prefix + '-enter'
  var leaveClass = prefix + '-leave'
  // clean up potential previous unfinished transition
  if (data.callback) {
    _.off(el, data.event, data.callback)
    removeClass(el, enterClass)
    removeClass(el, leaveClass)
    data.event = data.callback = null
  }
  if (direction > 0) { // enter
    addClass(el, enterClass)
    op()
    push(el, direction, null, enterClass, cb)
  } else { // leave
    addClass(el, leaveClass)
    push(el, direction, op, leaveClass, cb)
  }
}
},{"../util":60}],54:[function(require,module,exports){
var _ = require('../util')
var applyCSSTransition = require('./css')
var applyJSTransition = require('./js')

/**
 * Append with transition.
 *
 * @oaram {Element} el
 * @param {Element} target
 * @param {Vue} vm
 * @param {Function} [cb]
 */

exports.append = function (el, target, vm, cb) {
  apply(el, 1, function () {
    target.appendChild(el)
  }, vm, cb)
}

/**
 * InsertBefore with transition.
 *
 * @oaram {Element} el
 * @param {Element} target
 * @param {Vue} vm
 * @param {Function} [cb]
 */

exports.before = function (el, target, vm, cb) {
  apply(el, 1, function () {
    _.before(el, target)
  }, vm, cb)
}

/**
 * Remove with transition.
 *
 * @oaram {Element} el
 * @param {Vue} vm
 * @param {Function} [cb]
 */

exports.remove = function (el, vm, cb) {
  apply(el, -1, function () {
    _.remove(el)
  }, vm, cb)
}

/**
 * Remove by appending to another parent with transition.
 * This is only used in block operations.
 *
 * @oaram {Element} el
 * @param {Element} target
 * @param {Vue} vm
 * @param {Function} [cb]
 */

exports.removeThenAppend = function (el, target, vm, cb) {
  apply(el, -1, function () {
    target.appendChild(el)
  }, vm, cb)
}

/**
 * Append the childNodes of a fragment to target.
 *
 * @param {DocumentFragment} block
 * @param {Node} target
 * @param {Vue} vm
 */

exports.blockAppend = function (block, target, vm) {
  var nodes = _.toArray(block.childNodes)
  for (var i = 0, l = nodes.length; i < l; i++) {
    exports.before(nodes[i], target, vm)
  }
}

/**
 * Remove a block of nodes between two edge nodes.
 *
 * @param {Node} start
 * @param {Node} end
 * @param {Vue} vm
 */

exports.blockRemove = function (start, end, vm) {
  var node = start.nextSibling
  var next
  while (node !== end) {
    next = node.nextSibling
    exports.remove(node, vm)
    node = next
  }
}

/**
 * Apply transitions with an operation callback.
 *
 * @oaram {Element} el
 * @param {Number} direction
 *                  1: enter
 *                 -1: leave
 * @param {Function} op - the actual DOM operation
 * @param {Vue} vm
 * @param {Function} [cb]
 */

var apply = exports.apply = function (el, direction, op, vm, cb) {
  var transData = el.__v_trans
  if (
    !transData ||
    !vm._isCompiled ||
    // if the vm is being manipulated by a parent directive
    // during the parent's compilation phase, skip the
    // animation.
    (vm.$parent && !vm.$parent._isCompiled)
  ) {
    op()
    if (cb) cb()
    return
  }
  // determine the transition type on the element
  var jsTransition = vm.$options.transitions[transData.id]
  if (jsTransition) {
    // js
    applyJSTransition(
      el,
      direction,
      op,
      transData,
      jsTransition,
      vm,
      cb
    )
  } else if (_.transitionEndEvent) {
    // css
    applyCSSTransition(
      el,
      direction,
      op,
      transData,
      cb
    )
  } else {
    // not applicable
    op()
    if (cb) cb()
  }
}
},{"../util":60,"./css":53,"./js":55}],55:[function(require,module,exports){
/**
 * Apply JavaScript enter/leave functions.
 *
 * @param {Element} el
 * @param {Number} direction - 1: enter, -1: leave
 * @param {Function} op - the actual DOM operation
 * @param {Object} data - target element's transition data
 * @param {Object} def - transition definition object
 * @param {Vue} vm - the owner vm of the element
 * @param {Function} [cb]
 */

module.exports = function (el, direction, op, data, def, vm, cb) {
  if (data.cancel) {
    data.cancel()
    data.cancel = null
  }
  if (direction > 0) { // enter
    if (def.beforeEnter) {
      def.beforeEnter.call(vm, el)
    }
    op()
    if (def.enter) {
      data.cancel = def.enter.call(vm, el, function () {
        data.cancel = null
        if (cb) cb()
      })
    } else if (cb) {
      cb()
    }
  } else { // leave
    if (def.leave) {
      data.cancel = def.leave.call(vm, el, function () {
        data.cancel = null
        op()
        if (cb) cb()
      })
    } else {
      op()
      if (cb) cb()
    }
  }
}
},{}],56:[function(require,module,exports){
var config = require('../config')

/**
 * Enable debug utilities. The enableDebug() function and
 * all _.log() & _.warn() calls will be dropped in the
 * minified production build.
 */

enableDebug()

function enableDebug () {
  var hasConsole = typeof console !== 'undefined'
  
  /**
   * Log a message.
   *
   * @param {String} msg
   */

  exports.log = function (msg) {
    if (hasConsole && config.debug) {
      console.log('[Vue info]: ' + msg)
    }
  }

  /**
   * We've got a problem here.
   *
   * @param {String} msg
   */

  exports.warn = function (msg) {
    if (hasConsole && !config.silent) {
      console.warn('[Vue warn]: ' + msg)
      /* istanbul ignore if */
      if (config.debug) {
        /* jshint debug: true */
        debugger
      } else {
        console.log(
          'Set `Vue.config.debug = true` to enable debug mode.'
        )
      }
    }
  }

  /**
   * Assert asset exists
   */

  exports.assertAsset = function (val, type, id) {
    if (!val) {
      exports.warn('Failed to resolve ' + type + ': ' + id)
    }
  }
}
},{"../config":13}],57:[function(require,module,exports){
var config = require('../config')

/**
 * Check if a node is in the document.
 *
 * @param {Node} node
 * @return {Boolean}
 */

var doc =
  typeof document !== 'undefined' &&
  document.documentElement

exports.inDoc = function (node) {
  return doc && doc.contains(node)
}

/**
 * Extract an attribute from a node.
 *
 * @param {Node} node
 * @param {String} attr
 */

exports.attr = function (node, attr) {
  attr = config.prefix + attr
  var val = node.getAttribute(attr)
  if (val !== null) {
    node.removeAttribute(attr)
  }
  return val
}

/**
 * Insert el before target
 *
 * @param {Element} el
 * @param {Element} target 
 */

exports.before = function (el, target) {
  target.parentNode.insertBefore(el, target)
}

/**
 * Insert el after target
 *
 * @param {Element} el
 * @param {Element} target 
 */

exports.after = function (el, target) {
  if (target.nextSibling) {
    exports.before(el, target.nextSibling)
  } else {
    target.parentNode.appendChild(el)
  }
}

/**
 * Remove el from DOM
 *
 * @param {Element} el
 */

exports.remove = function (el) {
  el.parentNode.removeChild(el)
}

/**
 * Prepend el to target
 *
 * @param {Element} el
 * @param {Element} target 
 */

exports.prepend = function (el, target) {
  if (target.firstChild) {
    exports.before(el, target.firstChild)
  } else {
    target.appendChild(el)
  }
}

/**
 * Replace target with el
 *
 * @param {Element} target
 * @param {Element} el
 */

exports.replace = function (target, el) {
  var parent = target.parentNode
  if (parent) {
    parent.replaceChild(el, target)
  }
}

/**
 * Copy attributes from one element to another.
 *
 * @param {Element} from
 * @param {Element} to
 */

exports.copyAttributes = function (from, to) {
  if (from.hasAttributes()) {
    var attrs = from.attributes
    for (var i = 0, l = attrs.length; i < l; i++) {
      var attr = attrs[i]
      to.setAttribute(attr.name, attr.value)
    }
  }
}

/**
 * Add event listener shorthand.
 *
 * @param {Element} el
 * @param {String} event
 * @param {Function} cb
 */

exports.on = function (el, event, cb) {
  el.addEventListener(event, cb)
}

/**
 * Remove event listener shorthand.
 *
 * @param {Element} el
 * @param {String} event
 * @param {Function} cb
 */

exports.off = function (el, event, cb) {
  el.removeEventListener(event, cb)
}

/**
 * Add class with compatibility for IE & SVG
 *
 * @param {Element} el
 * @param {Strong} cls
 */

exports.addClass = function (el, cls) {
  if (el.classList) {
    el.classList.add(cls)
  } else {
    var cur = ' ' + (el.getAttribute('class') || '') + ' '
    if (cur.indexOf(' ' + cls + ' ') < 0) {
      el.setAttribute('class', (cur + cls).trim())
    }
  }
}

/**
 * Remove class with compatibility for IE & SVG
 *
 * @param {Element} el
 * @param {Strong} cls
 */

exports.removeClass = function (el, cls) {
  if (el.classList) {
    el.classList.remove(cls)
  } else {
    var cur = ' ' + (el.getAttribute('class') || '') + ' '
    var tar = ' ' + cls + ' '
    while (cur.indexOf(tar) >= 0) {
      cur = cur.replace(tar, ' ')
    }
    el.setAttribute('class', cur.trim())
  }
}

/**
 * Extract raw content inside an element into a temporary
 * container div
 *
 * @param {Element} el
 * @return {Element}
 */

exports.extractContent = function (el) {
  var child
  var rawContent
  if (el.hasChildNodes()) {
    rawContent = document.createElement('div')
    /* jshint boss:true */
    while (child = el.firstChild) {
      rawContent.appendChild(child)
    }
  }
  return rawContent
}
},{"../config":13}],58:[function(require,module,exports){
/**
 * Can we use __proto__?
 *
 * @type {Boolean}
 */

exports.hasProto = '__proto__' in {}

/**
 * Indicates we have a window
 *
 * @type {Boolean}
 */

var toString = Object.prototype.toString
var inBrowser = exports.inBrowser =
  typeof window !== 'undefined' &&
  toString.call(window) !== '[object Object]'

/**
 * Defer a task to the start of the next event loop
 *
 * @param {Function} cb
 * @param {Object} ctx
 */

var defer = inBrowser
  ? (window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    setTimeout)
  : setTimeout

exports.nextTick = function (cb, ctx) {
  if (ctx) {
    defer(function () { cb.call(ctx) }, 0)
  } else {
    defer(cb, 0)
  }
}

/**
 * Detect if we are in IE9...
 *
 * @type {Boolean}
 */

exports.isIE9 =
  inBrowser &&
  navigator.userAgent.indexOf('MSIE 9.0') > 0

/**
 * Sniff transition/animation events
 */

if (inBrowser && !exports.isIE9) {
  var isWebkitTrans =
    window.ontransitionend === undefined &&
    window.onwebkittransitionend !== undefined
  var isWebkitAnim =
    window.onanimationend === undefined &&
    window.onwebkitanimationend !== undefined
  exports.transitionProp = isWebkitTrans
    ? 'WebkitTransition'
    : 'transition'
  exports.transitionEndEvent = isWebkitTrans
    ? 'webkitTransitionEnd'
    : 'transitionend'
  exports.animationProp = isWebkitAnim
    ? 'WebkitAnimation'
    : 'animation'
  exports.animationEndEvent = isWebkitAnim
    ? 'webkitAnimationEnd'
    : 'animationend'
}
},{}],59:[function(require,module,exports){
var _ = require('./debug')

/**
 * Resolve read & write filters for a vm instance. The
 * filters descriptor Array comes from the directive parser.
 *
 * This is extracted into its own utility so it can
 * be used in multiple scenarios.
 *
 * @param {Vue} vm
 * @param {Array<Object>} filters
 * @param {Object} [target]
 * @return {Object}
 */

exports.resolveFilters = function (vm, filters, target) {
  if (!filters) {
    return
  }
  var res = target || {}
  // var registry = vm.$options.filters
  filters.forEach(function (f) {
    var def = vm.$options.filters[f.name]
    _.assertAsset(def, 'filter', f.name)
    if (!def) return
    var args = f.args
    var reader, writer
    if (typeof def === 'function') {
      reader = def
    } else {
      reader = def.read
      writer = def.write
    }
    if (reader) {
      if (!res.read) res.read = []
      res.read.push(function (value) {
        return args
          ? reader.apply(vm, [value].concat(args))
          : reader.call(vm, value)
      })
    }
    if (writer) {
      if (!res.write) res.write = []
      res.write.push(function (value, oldVal) {
        return args
          ? writer.apply(vm, [value, oldVal].concat(args))
          : writer.call(vm, value, oldVal)
      })
    }
  })
  return res
}

/**
 * Apply filters to a value
 *
 * @param {*} value
 * @param {Array} filters
 * @param {Vue} vm
 * @param {*} oldVal
 * @return {*}
 */

exports.applyFilters = function (value, filters, vm, oldVal) {
  if (!filters) {
    return value
  }
  for (var i = 0, l = filters.length; i < l; i++) {
    value = filters[i].call(vm, value, oldVal)
  }
  return value
}
},{"./debug":56}],60:[function(require,module,exports){
var lang   = require('./lang')
var extend = lang.extend

extend(exports, lang)
extend(exports, require('./env'))
extend(exports, require('./dom'))
extend(exports, require('./filter'))
extend(exports, require('./debug'))
},{"./debug":56,"./dom":57,"./env":58,"./filter":59,"./lang":61}],61:[function(require,module,exports){
/**
 * Check is a string starts with $ or _
 *
 * @param {String} str
 * @return {Boolean}
 */

exports.isReserved = function (str) {
  var c = str.charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Guard text output, make sure undefined outputs
 * empty string
 *
 * @param {*} value
 * @return {String}
 */

exports.toString = function (value) {
  return value == null
    ? ''
    : value.toString()
}

/**
 * Check and convert possible numeric numbers before
 * setting back to data
 *
 * @param {*} value
 * @return {*|Number}
 */

exports.toNumber = function (value) {
  return (
    isNaN(value) ||
    value === null ||
    typeof value === 'boolean'
  ) ? value
    : Number(value)
}

/**
 * Strip quotes from a string
 *
 * @param {String} str
 * @return {String | false}
 */

exports.stripQuotes = function (str) {
  var a = str.charCodeAt(0)
  var b = str.charCodeAt(str.length - 1)
  return a === b && (a === 0x22 || a === 0x27)
    ? str.slice(1, -1)
    : false
}

/**
 * Camelize a hyphen-delmited string.
 *
 * @param {String} str
 * @return {String}
 */

var camelRE = /[-_](\w)/g
var capitalCamelRE = /(?:^|[-_])(\w)/g

exports.camelize = function (str, cap) {
  var RE = cap ? capitalCamelRE : camelRE
  return str.replace(RE, function (_, c) {
    return c ? c.toUpperCase () : ''
  })
}

/**
 * Simple bind, faster than native
 *
 * @param {Function} fn
 * @param {Object} ctx
 * @return {Function}
 */

exports.bind = function (fn, ctx) {
  return function () {
    return fn.apply(ctx, arguments)
  }
}

/**
 * Convert an Array-like object to a real Array.
 *
 * @param {Array-like} list
 * @param {Number} [start] - start index
 * @return {Array}
 */

exports.toArray = function (list, start) {
  start = start || 0
  var i = list.length - start
  var ret = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

/**
 * Mix properties into target object.
 *
 * @param {Object} to
 * @param {Object} from
 */

exports.extend = function (to, from) {
  for (var key in from) {
    to[key] = from[key]
  }
  return to
}

/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 *
 * @param {*} obj
 * @return {Boolean}
 */

exports.isObject = function (obj) {
  return obj && typeof obj === 'object'
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 *
 * @param {*} obj
 * @return {Boolean}
 */

var toString = Object.prototype.toString
exports.isPlainObject = function (obj) {
  return toString.call(obj) === '[object Object]'
}

/**
 * Array type check.
 *
 * @param {*} obj
 * @return {Boolean}
 */

exports.isArray = function (obj) {
  return Array.isArray(obj)
}

/**
 * Define a non-enumerable property
 *
 * @param {Object} obj
 * @param {String} key
 * @param {*} val
 * @param {Boolean} [enumerable]
 */

exports.define = function (obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value        : val,
    enumerable   : !!enumerable,
    writable     : true,
    configurable : true
  })
}
},{}],62:[function(require,module,exports){
var _ = require('./index')
var extend = _.extend

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 *
 * All strategy functions follow the same signature:
 *
 * @param {*} parentVal
 * @param {*} childVal
 * @param {Vue} [vm]
 */

var strats = Object.create(null)

/**
 * Helper that recursively merges two data objects together.
 */

function mergeData (to, from) {
  var key, toVal, fromVal
  for (key in from) {
    toVal = to[key]
    fromVal = from[key]
    if (!to.hasOwnProperty(key)) {
      to.$add(key, fromVal)
    } else if (_.isObject(toVal) && _.isObject(fromVal)) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data
 */

strats.data = function (parentVal, childVal, vm) {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (typeof childVal !== 'function') {
      _.warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.'
      )
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn () {
      return mergeData(
        childVal.call(this),
        parentVal.call(this)
      )
    }
  } else {
    // instance merge, return raw object
    var instanceData = typeof childVal === 'function'
      ? childVal.call(vm)
      : childVal
    var defaultData = typeof parentVal === 'function'
      ? parentVal.call(vm)
      : undefined
    if (instanceData) {
      return mergeData(instanceData, defaultData)
    } else {
      return defaultData
    }
  }
}

/**
 * El
 */

strats.el = function (parentVal, childVal, vm) {
  if (!vm && childVal && typeof childVal !== 'function') {
    _.warn(
      'The "el" option should be a function ' +
      'that returns a per-instance value in component ' +
      'definitions.'
    )
    return
  }
  var ret = childVal || parentVal
  // invoke the element factory if this is instance merge
  return vm && typeof ret === 'function'
    ? ret.call(vm)
    : ret
}

/**
 * Hooks and param attributes are merged as arrays.
 */

strats.created =
strats.ready =
strats.attached =
strats.detached =
strats.beforeCompile =
strats.compiled =
strats.beforeDestroy =
strats.destroyed =
strats.paramAttributes = function (parentVal, childVal) {
  return childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : _.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
}

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */

strats.directives =
strats.filters =
strats.partials =
strats.transitions =
strats.components = function (parentVal, childVal, vm, key) {
  var ret = Object.create(
    vm && vm.$parent
      ? vm.$parent.$options[key]
      : _.Vue.options[key]
  )
  if (parentVal) {
    var keys = Object.keys(parentVal)
    var i = keys.length
    var field
    while (i--) {
      field = keys[i]
      ret[field] = parentVal[field]
    }
  }
  if (childVal) extend(ret, childVal)
  return ret
}

/**
 * Events & Watchers.
 *
 * Events & watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */

strats.watch =
strats.events = function (parentVal, childVal) {
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  var ret = {}
  extend(ret, parentVal)
  for (var key in childVal) {
    var parent = ret[key]
    var child = childVal[key]
    ret[key] = parent
      ? parent.concat(child)
      : [child]
  }
  return ret
}

/**
 * Other object hashes.
 */

strats.methods =
strats.computed = function (parentVal, childVal) {
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  var ret = Object.create(parentVal)
  extend(ret, childVal)
  return ret
}

/**
 * Default strategy.
 */

var defaultStrat = function (parentVal, childVal) {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Make sure component options get converted to actual
 * constructors.
 *
 * @param {Object} components
 */

function guardComponents (components) {
  if (components) {
    var def
    for (var key in components) {
      def = components[key]
      if (_.isPlainObject(def)) {
        def.name = key
        components[key] = _.Vue.extend(def)
      }
    }
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 *
 * @param {Object} parent
 * @param {Object} child
 * @param {Vue} [vm] - if vm is present, indicates this is
 *                     an instantiation merge.
 */

module.exports = function mergeOptions (parent, child, vm) {
  guardComponents(child.components)
  var options = {}
  var key
  if (child.mixins) {
    for (var i = 0, l = child.mixins.length; i < l; i++) {
      parent = mergeOptions(parent, child.mixins[i], vm)
    }
  }
  for (key in parent) {
    merge(key)
  }
  for (key in child) {
    if (!(parent.hasOwnProperty(key))) {
      merge(key)
    }
  }
  function merge (key) {
    var strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}
},{"./index":60}],63:[function(require,module,exports){
var _ = require('./util')
var extend = _.extend

/**
 * The exposed Vue constructor.
 *
 * API conventions:
 * - public API methods/properties are prefiexed with `$`
 * - internal methods/properties are prefixed with `_`
 * - non-prefixed properties are assumed to be proxied user
 *   data.
 *
 * @constructor
 * @param {Object} [options]
 * @public
 */

function Vue (options) {
  this._init(options)
}

/**
 * Mixin global API
 */

extend(Vue, require('./api/global'))

/**
 * Vue and every constructor that extends Vue has an
 * associated options object, which can be accessed during
 * compilation steps as `this.constructor.options`.
 *
 * These can be seen as the default options of every
 * Vue instance.
 */

Vue.options = {
  directives  : require('./directives'),
  filters     : require('./filters'),
  partials    : {},
  transitions : {},
  components  : {}
}

/**
 * Build up the prototype
 */

var p = Vue.prototype

/**
 * $data has a setter which does a bunch of
 * teardown/setup work
 */

Object.defineProperty(p, '$data', {
  get: function () {
    return this._data
  },
  set: function (newData) {
    this._setData(newData)
  }
})

/**
 * Mixin internal instance methods
 */

extend(p, require('./instance/init'))
extend(p, require('./instance/events'))
extend(p, require('./instance/scope'))
extend(p, require('./instance/compile'))

/**
 * Mixin public API methods
 */

extend(p, require('./api/data'))
extend(p, require('./api/dom'))
extend(p, require('./api/events'))
extend(p, require('./api/child'))
extend(p, require('./api/lifecycle'))

module.exports = _.Vue = Vue
},{"./api/child":3,"./api/data":4,"./api/dom":5,"./api/events":6,"./api/global":7,"./api/lifecycle":8,"./directives":23,"./filters":39,"./instance/compile":40,"./instance/events":41,"./instance/init":42,"./instance/scope":43,"./util":60}],64:[function(require,module,exports){
var _ = require('./util')
var config = require('./config')
var Observer = require('./observer')
var expParser = require('./parsers/expression')
var batcher = require('./batcher')
var uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 *
 * @param {Vue} vm
 * @param {String} expression
 * @param {Function} cb
 * @param {Object} options
 *                 - {Array} filters
 *                 - {Boolean} twoWay
 *                 - {Boolean} deep
 *                 - {Boolean} user
 * @constructor
 */

function Watcher (vm, expression, cb, options) {
  this.vm = vm
  vm._watcherList.push(this)
  this.expression = expression
  this.cbs = [cb]
  this.id = ++uid // uid for batching
  this.active = true
  options = options || {}
  this.deep = options.deep
  this.user = options.user
  this.deps = Object.create(null)
  // setup filters if any.
  // We delegate directive filters here to the watcher
  // because they need to be included in the dependency
  // collection process.
  if (options.filters) {
    this.readFilters = options.filters.read
    this.writeFilters = options.filters.write
  }
  // parse expression for getter/setter
  var res = expParser.parse(expression, options.twoWay)
  this.getter = res.get
  this.setter = res.set
  this.value = this.get()
}

var p = Watcher.prototype

/**
 * Add a dependency to this directive.
 *
 * @param {Dep} dep
 */

p.addDep = function (dep) {
  var id = dep.id
  if (!this.newDeps[id]) {
    this.newDeps[id] = dep
    if (!this.deps[id]) {
      this.deps[id] = dep
      dep.addSub(this)
    }
  }
}

/**
 * Evaluate the getter, and re-collect dependencies.
 */

p.get = function () {
  this.beforeGet()
  var vm = this.vm
  var value
  try {
    value = this.getter.call(vm, vm)
  } catch (e) {
    _.warn(
      'Error when evaluating expression "' +
      this.expression + '":\n   ' + e
    )
  }
  // "touch" every property so they are all tracked as
  // dependencies for deep watching
  if (this.deep) {
    traverse(value)
  }
  value = _.applyFilters(value, this.readFilters, vm)
  this.afterGet()
  return value
}

/**
 * Set the corresponding value with the setter.
 *
 * @param {*} value
 */

p.set = function (value) {
  var vm = this.vm
  value = _.applyFilters(
    value, this.writeFilters, vm, this.value
  )
  try {
    this.setter.call(vm, vm, value)
  } catch (e) {
    _.warn(
      'Error when evaluating setter "' +
      this.expression + '":\n   ' + e
    )
  }
}

/**
 * Prepare for dependency collection.
 */

p.beforeGet = function () {
  Observer.target = this
  this.newDeps = {}
}

/**
 * Clean up for dependency collection.
 */

p.afterGet = function () {
  Observer.target = null
  for (var id in this.deps) {
    if (!this.newDeps[id]) {
      this.deps[id].removeSub(this)
    }
  }
  this.deps = this.newDeps
}

/**
 * Subscriber interface.
 * Will be called when a dependency changes.
 */

p.update = function () {
  if (!config.async || config.debug) {
    this.run()
  } else {
    batcher.push(this)
  }
}

/**
 * Batcher job interface.
 * Will be called by the batcher.
 */

p.run = function () {
  if (this.active) {
    var value = this.get()
    if (
      (typeof value === 'object' && value !== null) ||
      value !== this.value
    ) {
      var oldValue = this.value
      this.value = value
      var cbs = this.cbs
      for (var i = 0, l = cbs.length; i < l; i++) {
        cbs[i](value, oldValue)
        // if a callback also removed other callbacks,
        // we need to adjust the loop accordingly.
        var removed = l - cbs.length
        if (removed) {
          i -= removed
          l -= removed
        }
      }
    }
  }
}

/**
 * Add a callback.
 *
 * @param {Function} cb
 */

p.addCb = function (cb) {
  this.cbs.push(cb)
}

/**
 * Remove a callback.
 *
 * @param {Function} cb
 */

p.removeCb = function (cb) {
  var cbs = this.cbs
  if (cbs.length > 1) {
    var i = cbs.indexOf(cb)
    if (i > -1) {
      cbs.splice(i, 1)
    }
  } else if (cb === cbs[0]) {
    this.teardown()
  }
}

/**
 * Remove self from all dependencies' subcriber list.
 */

p.teardown = function () {
  if (this.active) {
    // remove self from vm's watcher list
    // we can skip this if the vm if being destroyed
    // which can improve teardown performance.
    if (!this.vm._isBeingDestroyed) {
      var list = this.vm._watcherList
      list.splice(list.indexOf(this))
    }
    for (var id in this.deps) {
      this.deps[id].removeSub(this)
    }
    this.active = false
    this.vm = this.cbs = this.value = null
  }
}


/**
 * Recrusively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 *
 * @param {Object} obj
 */

function traverse (obj) {
  var key, val, i
  for (key in obj) {
    val = obj[key]
    if (_.isArray(val)) {
      i = val.length
      while (i--) traverse(val[i])
    } else if (_.isObject(val)) {
      traverse(val)
    }
  }
}

module.exports = Watcher
},{"./batcher":9,"./config":13,"./observer":46,"./parsers/expression":49,"./util":60}],65:[function(require,module,exports){
require("insert-css")(".red{color:red}");
var __vue_template__ = "<h1 class=\"red\">{{msg}}</h1>";
module.exports = {
  data: function() {
    return {
      msg: 'Hello world!ho'
    };
  }
};

module.exports.template = __vue_template__;

},{"insert-css":2}]},{},[1]);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsInNvdXJjZXMiOlsiYnVuZGxlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBWdWUsIGFwcCwgYXBwT3B0aW9ucztcblxuVnVlID0gcmVxdWlyZSgndnVlJyk7XG5cbmFwcE9wdGlvbnMgPSByZXF1aXJlKCcuL2FwcC52dWUnKTtcblxuYXBwID0gbmV3IFZ1ZShhcHBPcHRpb25zKS4kbW91bnQoJ2JvZHknKTtcblxuXG5cbn0se1wiLi9hcHAudnVlXCI6NjUsXCJ2dWVcIjo2M31dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIGluc2VydGVkID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzcywgb3B0aW9ucykge1xuICAgIGlmIChpbnNlcnRlZFtjc3NdKSByZXR1cm47XG4gICAgaW5zZXJ0ZWRbY3NzXSA9IHRydWU7XG4gICAgXG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIGVsZW0uc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQvY3NzJyk7XG5cbiAgICBpZiAoJ3RleHRDb250ZW50JyBpbiBlbGVtKSB7XG4gICAgICBlbGVtLnRleHRDb250ZW50ID0gY3NzO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbGVtLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICB9XG4gICAgXG4gICAgdmFyIGhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMucHJlcGVuZCkge1xuICAgICAgICBoZWFkLmluc2VydEJlZm9yZShlbGVtLCBoZWFkLmNoaWxkTm9kZXNbMF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgfVxufTtcblxufSx7fV0sMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxuXG4vKipcbiAqIENyZWF0ZSBhIGNoaWxkIGluc3RhbmNlIHRoYXQgcHJvdG90eXBhbGx5IGluZWhyaXRzXG4gKiBkYXRhIG9uIHBhcmVudC4gVG8gYWNoaWV2ZSB0aGF0IHdlIGNyZWF0ZSBhbiBpbnRlcm1lZGlhdGVcbiAqIGNvbnN0cnVjdG9yIHdpdGggaXRzIHByb3RvdHlwZSBwb2ludGluZyB0byBwYXJlbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtCYXNlQ3Rvcl1cbiAqIEByZXR1cm4ge1Z1ZX1cbiAqIEBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLiRhZGRDaGlsZCA9IGZ1bmN0aW9uIChvcHRzLCBCYXNlQ3Rvcikge1xuICBCYXNlQ3RvciA9IEJhc2VDdG9yIHx8IF8uVnVlXG4gIG9wdHMgPSBvcHRzIHx8IHt9XG4gIHZhciBwYXJlbnQgPSB0aGlzXG4gIHZhciBDaGlsZFZ1ZVxuICB2YXIgaW5oZXJpdCA9IG9wdHMuaW5oZXJpdCAhPT0gdW5kZWZpbmVkXG4gICAgPyBvcHRzLmluaGVyaXRcbiAgICA6IEJhc2VDdG9yLm9wdGlvbnMuaW5oZXJpdFxuICBpZiAoaW5oZXJpdCkge1xuICAgIHZhciBjdG9ycyA9IHBhcmVudC5fY2hpbGRDdG9yc1xuICAgIGlmICghY3RvcnMpIHtcbiAgICAgIGN0b3JzID0gcGFyZW50Ll9jaGlsZEN0b3JzID0ge31cbiAgICB9XG4gICAgQ2hpbGRWdWUgPSBjdG9yc1tCYXNlQ3Rvci5jaWRdXG4gICAgaWYgKCFDaGlsZFZ1ZSkge1xuICAgICAgdmFyIG9wdGlvbk5hbWUgPSBCYXNlQ3Rvci5vcHRpb25zLm5hbWVcbiAgICAgIHZhciBjbGFzc05hbWUgPSBvcHRpb25OYW1lXG4gICAgICAgID8gXy5jYW1lbGl6ZShvcHRpb25OYW1lLCB0cnVlKVxuICAgICAgICA6ICdWdWVDb21wb25lbnQnXG4gICAgICBDaGlsZFZ1ZSA9IG5ldyBGdW5jdGlvbihcbiAgICAgICAgJ3JldHVybiBmdW5jdGlvbiAnICsgY2xhc3NOYW1lICsgJyAob3B0aW9ucykgeycgK1xuICAgICAgICAndGhpcy5jb25zdHJ1Y3RvciA9ICcgKyBjbGFzc05hbWUgKyAnOycgK1xuICAgICAgICAndGhpcy5faW5pdChvcHRpb25zKSB9J1xuICAgICAgKSgpXG4gICAgICBDaGlsZFZ1ZS5vcHRpb25zID0gQmFzZUN0b3Iub3B0aW9uc1xuICAgICAgQ2hpbGRWdWUucHJvdG90eXBlID0gdGhpc1xuICAgICAgY3RvcnNbQmFzZUN0b3IuY2lkXSA9IENoaWxkVnVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIENoaWxkVnVlID0gQmFzZUN0b3JcbiAgfVxuICBvcHRzLl9wYXJlbnQgPSBwYXJlbnRcbiAgb3B0cy5fcm9vdCA9IHBhcmVudC4kcm9vdFxuICB2YXIgY2hpbGQgPSBuZXcgQ2hpbGRWdWUob3B0cylcbiAgaWYgKCF0aGlzLl9jaGlsZHJlbikge1xuICAgIHRoaXMuX2NoaWxkcmVuID0gW11cbiAgfVxuICB0aGlzLl9jaGlsZHJlbi5wdXNoKGNoaWxkKVxuICByZXR1cm4gY2hpbGRcbn1cbn0se1wiLi4vdXRpbFwiOjYwfV0sNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIFdhdGNoZXIgPSByZXF1aXJlKCcuLi93YXRjaGVyJylcbnZhciBQYXRoID0gcmVxdWlyZSgnLi4vcGFyc2Vycy9wYXRoJylcbnZhciB0ZXh0UGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy90ZXh0JylcbnZhciBkaXJQYXJzZXIgPSByZXF1aXJlKCcuLi9wYXJzZXJzL2RpcmVjdGl2ZScpXG52YXIgZXhwUGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy9leHByZXNzaW9uJylcbnZhciBmaWx0ZXJSRSA9IC9bXnxdXFx8W158XS9cblxuLyoqXG4gKiBHZXQgdGhlIHZhbHVlIGZyb20gYW4gZXhwcmVzc2lvbiBvbiB0aGlzIHZtLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBleHBcbiAqIEByZXR1cm4geyp9XG4gKi9cblxuZXhwb3J0cy4kZ2V0ID0gZnVuY3Rpb24gKGV4cCkge1xuICB2YXIgcmVzID0gZXhwUGFyc2VyLnBhcnNlKGV4cClcbiAgaWYgKHJlcykge1xuICAgIHJldHVybiByZXMuZ2V0LmNhbGwodGhpcywgdGhpcylcbiAgfVxufVxuXG4vKipcbiAqIFNldCB0aGUgdmFsdWUgZnJvbSBhbiBleHByZXNzaW9uIG9uIHRoaXMgdm0uXG4gKiBUaGUgZXhwcmVzc2lvbiBtdXN0IGJlIGEgdmFsaWQgbGVmdC1oYW5kXG4gKiBleHByZXNzaW9uIGluIGFuIGFzc2lnbm1lbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV4cFxuICogQHBhcmFtIHsqfSB2YWxcbiAqL1xuXG5leHBvcnRzLiRzZXQgPSBmdW5jdGlvbiAoZXhwLCB2YWwpIHtcbiAgdmFyIHJlcyA9IGV4cFBhcnNlci5wYXJzZShleHAsIHRydWUpXG4gIGlmIChyZXMgJiYgcmVzLnNldCkge1xuICAgIHJlcy5zZXQuY2FsbCh0aGlzLCB0aGlzLCB2YWwpXG4gIH1cbn1cblxuLyoqXG4gKiBBZGQgYSBwcm9wZXJ0eSBvbiB0aGUgVk1cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0geyp9IHZhbFxuICovXG5cbmV4cG9ydHMuJGFkZCA9IGZ1bmN0aW9uIChrZXksIHZhbCkge1xuICB0aGlzLl9kYXRhLiRhZGQoa2V5LCB2YWwpXG59XG5cbi8qKlxuICogRGVsZXRlIGEgcHJvcGVydHkgb24gdGhlIFZNXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICovXG5cbmV4cG9ydHMuJGRlbGV0ZSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgdGhpcy5fZGF0YS4kZGVsZXRlKGtleSlcbn1cblxuLyoqXG4gKiBXYXRjaCBhbiBleHByZXNzaW9uLCB0cmlnZ2VyIGNhbGxiYWNrIHdoZW4gaXRzXG4gKiB2YWx1ZSBjaGFuZ2VzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBleHBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtkZWVwXVxuICogQHBhcmFtIHtCb29sZWFufSBbaW1tZWRpYXRlXVxuICogQHJldHVybiB7RnVuY3Rpb259IC0gdW53YXRjaEZuXG4gKi9cblxuZXhwb3J0cy4kd2F0Y2ggPSBmdW5jdGlvbiAoZXhwLCBjYiwgZGVlcCwgaW1tZWRpYXRlKSB7XG4gIHZhciB2bSA9IHRoaXNcbiAgdmFyIGtleSA9IGRlZXAgPyBleHAgKyAnKipkZWVwKionIDogZXhwXG4gIHZhciB3YXRjaGVyID0gdm0uX3VzZXJXYXRjaGVyc1trZXldXG4gIHZhciB3cmFwcGVkQ2IgPSBmdW5jdGlvbiAodmFsLCBvbGRWYWwpIHtcbiAgICBjYi5jYWxsKHZtLCB2YWwsIG9sZFZhbClcbiAgfVxuICBpZiAoIXdhdGNoZXIpIHtcbiAgICB3YXRjaGVyID0gdm0uX3VzZXJXYXRjaGVyc1trZXldID1cbiAgICAgIG5ldyBXYXRjaGVyKHZtLCBleHAsIHdyYXBwZWRDYiwge1xuICAgICAgICBkZWVwOiBkZWVwLFxuICAgICAgICB1c2VyOiB0cnVlXG4gICAgICB9KVxuICB9IGVsc2Uge1xuICAgIHdhdGNoZXIuYWRkQ2Iod3JhcHBlZENiKVxuICB9XG4gIGlmIChpbW1lZGlhdGUpIHtcbiAgICB3cmFwcGVkQ2Iod2F0Y2hlci52YWx1ZSlcbiAgfVxuICByZXR1cm4gZnVuY3Rpb24gdW53YXRjaEZuICgpIHtcbiAgICB3YXRjaGVyLnJlbW92ZUNiKHdyYXBwZWRDYilcbiAgICBpZiAoIXdhdGNoZXIuYWN0aXZlKSB7XG4gICAgICB2bS5fdXNlcldhdGNoZXJzW2tleV0gPSBudWxsXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRXZhbHVhdGUgYSB0ZXh0IGRpcmVjdGl2ZSwgaW5jbHVkaW5nIGZpbHRlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5leHBvcnRzLiRldmFsID0gZnVuY3Rpb24gKHRleHQpIHtcbiAgLy8gY2hlY2sgZm9yIGZpbHRlcnMuXG4gIGlmIChmaWx0ZXJSRS50ZXN0KHRleHQpKSB7XG4gICAgdmFyIGRpciA9IGRpclBhcnNlci5wYXJzZSh0ZXh0KVswXVxuICAgIC8vIHRoZSBmaWx0ZXIgcmVnZXggY2hlY2sgbWlnaHQgZ2l2ZSBmYWxzZSBwb3NpdGl2ZVxuICAgIC8vIGZvciBwaXBlcyBpbnNpZGUgc3RyaW5ncywgc28gaXQncyBwb3NzaWJsZSB0aGF0XG4gICAgLy8gd2UgZG9uJ3QgZ2V0IGFueSBmaWx0ZXJzIGhlcmVcbiAgICByZXR1cm4gZGlyLmZpbHRlcnNcbiAgICAgID8gXy5hcHBseUZpbHRlcnMoXG4gICAgICAgICAgdGhpcy4kZ2V0KGRpci5leHByZXNzaW9uKSxcbiAgICAgICAgICBfLnJlc29sdmVGaWx0ZXJzKHRoaXMsIGRpci5maWx0ZXJzKS5yZWFkLFxuICAgICAgICAgIHRoaXNcbiAgICAgICAgKVxuICAgICAgOiB0aGlzLiRnZXQoZGlyLmV4cHJlc3Npb24pXG4gIH0gZWxzZSB7XG4gICAgLy8gbm8gZmlsdGVyXG4gICAgcmV0dXJuIHRoaXMuJGdldCh0ZXh0KVxuICB9XG59XG5cbi8qKlxuICogSW50ZXJwb2xhdGUgYSBwaWVjZSBvZiB0ZW1wbGF0ZSB0ZXh0LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZXhwb3J0cy4kaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAodGV4dCkge1xuICB2YXIgdG9rZW5zID0gdGV4dFBhcnNlci5wYXJzZSh0ZXh0KVxuICB2YXIgdm0gPSB0aGlzXG4gIGlmICh0b2tlbnMpIHtcbiAgICByZXR1cm4gdG9rZW5zLmxlbmd0aCA9PT0gMVxuICAgICAgPyB2bS4kZXZhbCh0b2tlbnNbMF0udmFsdWUpXG4gICAgICA6IHRva2Vucy5tYXAoZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgICAgICAgcmV0dXJuIHRva2VuLnRhZ1xuICAgICAgICAgICAgPyB2bS4kZXZhbCh0b2tlbi52YWx1ZSlcbiAgICAgICAgICAgIDogdG9rZW4udmFsdWVcbiAgICAgICAgfSkuam9pbignJylcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGV4dFxuICB9XG59XG5cbi8qKlxuICogTG9nIGluc3RhbmNlIGRhdGEgYXMgYSBwbGFpbiBKUyBvYmplY3RcbiAqIHNvIHRoYXQgaXQgaXMgZWFzaWVyIHRvIGluc3BlY3QgaW4gY29uc29sZS5cbiAqIFRoaXMgbWV0aG9kIGFzc3VtZXMgY29uc29sZSBpcyBhdmFpbGFibGUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXVxuICovXG5cbmV4cG9ydHMuJGxvZyA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHZhciBkYXRhID0gcGF0aFxuICAgID8gUGF0aC5nZXQodGhpcy5fZGF0YSwgcGF0aClcbiAgICA6IHRoaXMuX2RhdGFcbiAgaWYgKGRhdGEpIHtcbiAgICBkYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhKSlcbiAgfVxuICBjb25zb2xlLmxvZyhkYXRhKVxufVxufSx7XCIuLi9wYXJzZXJzL2RpcmVjdGl2ZVwiOjQ4LFwiLi4vcGFyc2Vycy9leHByZXNzaW9uXCI6NDksXCIuLi9wYXJzZXJzL3BhdGhcIjo1MCxcIi4uL3BhcnNlcnMvdGV4dFwiOjUyLFwiLi4vdXRpbFwiOjYwLFwiLi4vd2F0Y2hlclwiOjY0fV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIHRyYW5zaXRpb24gPSByZXF1aXJlKCcuLi90cmFuc2l0aW9uJylcblxuLyoqXG4gKiBBcHBlbmQgaW5zdGFuY2UgdG8gdGFyZ2V0XG4gKlxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3dpdGhUcmFuc2l0aW9uXSAtIGRlZmF1bHRzIHRvIHRydWVcbiAqL1xuXG5leHBvcnRzLiRhcHBlbmRUbyA9IGZ1bmN0aW9uICh0YXJnZXQsIGNiLCB3aXRoVHJhbnNpdGlvbikge1xuICByZXR1cm4gaW5zZXJ0KFxuICAgIHRoaXMsIHRhcmdldCwgY2IsIHdpdGhUcmFuc2l0aW9uLFxuICAgIGFwcGVuZCwgdHJhbnNpdGlvbi5hcHBlbmRcbiAgKVxufVxuXG4vKipcbiAqIFByZXBlbmQgaW5zdGFuY2UgdG8gdGFyZ2V0XG4gKlxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3dpdGhUcmFuc2l0aW9uXSAtIGRlZmF1bHRzIHRvIHRydWVcbiAqL1xuXG5leHBvcnRzLiRwcmVwZW5kVG8gPSBmdW5jdGlvbiAodGFyZ2V0LCBjYiwgd2l0aFRyYW5zaXRpb24pIHtcbiAgdGFyZ2V0ID0gcXVlcnkodGFyZ2V0KVxuICBpZiAodGFyZ2V0Lmhhc0NoaWxkTm9kZXMoKSkge1xuICAgIHRoaXMuJGJlZm9yZSh0YXJnZXQuZmlyc3RDaGlsZCwgY2IsIHdpdGhUcmFuc2l0aW9uKVxuICB9IGVsc2Uge1xuICAgIHRoaXMuJGFwcGVuZFRvKHRhcmdldCwgY2IsIHdpdGhUcmFuc2l0aW9uKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogSW5zZXJ0IGluc3RhbmNlIGJlZm9yZSB0YXJnZXRcbiAqXG4gKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICogQHBhcmFtIHtCb29sZWFufSBbd2l0aFRyYW5zaXRpb25dIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICovXG5cbmV4cG9ydHMuJGJlZm9yZSA9IGZ1bmN0aW9uICh0YXJnZXQsIGNiLCB3aXRoVHJhbnNpdGlvbikge1xuICByZXR1cm4gaW5zZXJ0KFxuICAgIHRoaXMsIHRhcmdldCwgY2IsIHdpdGhUcmFuc2l0aW9uLFxuICAgIGJlZm9yZSwgdHJhbnNpdGlvbi5iZWZvcmVcbiAgKVxufVxuXG4vKipcbiAqIEluc2VydCBpbnN0YW5jZSBhZnRlciB0YXJnZXRcbiAqXG4gKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICogQHBhcmFtIHtCb29sZWFufSBbd2l0aFRyYW5zaXRpb25dIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICovXG5cbmV4cG9ydHMuJGFmdGVyID0gZnVuY3Rpb24gKHRhcmdldCwgY2IsIHdpdGhUcmFuc2l0aW9uKSB7XG4gIHRhcmdldCA9IHF1ZXJ5KHRhcmdldClcbiAgaWYgKHRhcmdldC5uZXh0U2libGluZykge1xuICAgIHRoaXMuJGJlZm9yZSh0YXJnZXQubmV4dFNpYmxpbmcsIGNiLCB3aXRoVHJhbnNpdGlvbilcbiAgfSBlbHNlIHtcbiAgICB0aGlzLiRhcHBlbmRUbyh0YXJnZXQucGFyZW50Tm9kZSwgY2IsIHdpdGhUcmFuc2l0aW9uKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogUmVtb3ZlIGluc3RhbmNlIGZyb20gRE9NXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICogQHBhcmFtIHtCb29sZWFufSBbd2l0aFRyYW5zaXRpb25dIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICovXG5cbmV4cG9ydHMuJHJlbW92ZSA9IGZ1bmN0aW9uIChjYiwgd2l0aFRyYW5zaXRpb24pIHtcbiAgdmFyIGluRG9jID0gdGhpcy5faXNBdHRhY2hlZCAmJiBfLmluRG9jKHRoaXMuJGVsKVxuICAvLyBpZiB3ZSBhcmUgbm90IGluIGRvY3VtZW50LCBubyBuZWVkIHRvIGNoZWNrXG4gIC8vIGZvciB0cmFuc2l0aW9uc1xuICBpZiAoIWluRG9jKSB3aXRoVHJhbnNpdGlvbiA9IGZhbHNlXG4gIHZhciBvcFxuICB2YXIgc2VsZiA9IHRoaXNcbiAgdmFyIHJlYWxDYiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoaW5Eb2MpIHNlbGYuX2NhbGxIb29rKCdkZXRhY2hlZCcpXG4gICAgaWYgKGNiKSBjYigpXG4gIH1cbiAgaWYgKFxuICAgIHRoaXMuX2lzQmxvY2sgJiZcbiAgICAhdGhpcy5fYmxvY2tGcmFnbWVudC5oYXNDaGlsZE5vZGVzKClcbiAgKSB7XG4gICAgb3AgPSB3aXRoVHJhbnNpdGlvbiA9PT0gZmFsc2VcbiAgICAgID8gYXBwZW5kXG4gICAgICA6IHRyYW5zaXRpb24ucmVtb3ZlVGhlbkFwcGVuZFxuICAgIGJsb2NrT3AodGhpcywgdGhpcy5fYmxvY2tGcmFnbWVudCwgb3AsIHJlYWxDYilcbiAgfSBlbHNlIHtcbiAgICBvcCA9IHdpdGhUcmFuc2l0aW9uID09PSBmYWxzZVxuICAgICAgPyByZW1vdmVcbiAgICAgIDogdHJhbnNpdGlvbi5yZW1vdmVcbiAgICBvcCh0aGlzLiRlbCwgdGhpcywgcmVhbENiKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogU2hhcmVkIERPTSBpbnNlcnRpb24gZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtWdWV9IHZtXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICogQHBhcmFtIHtCb29sZWFufSBbd2l0aFRyYW5zaXRpb25dXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcDEgLSBvcCBmb3Igbm9uLXRyYW5zaXRpb24gaW5zZXJ0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcDIgLSBvcCBmb3IgdHJhbnNpdGlvbiBpbnNlcnRcbiAqIEByZXR1cm4gdm1cbiAqL1xuXG5mdW5jdGlvbiBpbnNlcnQgKHZtLCB0YXJnZXQsIGNiLCB3aXRoVHJhbnNpdGlvbiwgb3AxLCBvcDIpIHtcbiAgdGFyZ2V0ID0gcXVlcnkodGFyZ2V0KVxuICB2YXIgdGFyZ2V0SXNEZXRhY2hlZCA9ICFfLmluRG9jKHRhcmdldClcbiAgdmFyIG9wID0gd2l0aFRyYW5zaXRpb24gPT09IGZhbHNlIHx8IHRhcmdldElzRGV0YWNoZWRcbiAgICA/IG9wMVxuICAgIDogb3AyXG4gIHZhciBzaG91bGRDYWxsSG9vayA9XG4gICAgIXRhcmdldElzRGV0YWNoZWQgJiZcbiAgICAhdm0uX2lzQXR0YWNoZWQgJiZcbiAgICAhXy5pbkRvYyh2bS4kZWwpXG4gIGlmICh2bS5faXNCbG9jaykge1xuICAgIGJsb2NrT3Aodm0sIHRhcmdldCwgb3AsIGNiKVxuICB9IGVsc2Uge1xuICAgIG9wKHZtLiRlbCwgdGFyZ2V0LCB2bSwgY2IpXG4gIH1cbiAgaWYgKHNob3VsZENhbGxIb29rKSB7XG4gICAgdm0uX2NhbGxIb29rKCdhdHRhY2hlZCcpXG4gIH1cbiAgcmV0dXJuIHZtXG59XG5cbi8qKlxuICogRXhlY3V0ZSBhIHRyYW5zaXRpb24gb3BlcmF0aW9uIG9uIGEgYmxvY2sgaW5zdGFuY2UsXG4gKiBpdGVyYXRpbmcgdGhyb3VnaCBhbGwgaXRzIGJsb2NrIG5vZGVzLlxuICpcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYlxuICovXG5cbmZ1bmN0aW9uIGJsb2NrT3AgKHZtLCB0YXJnZXQsIG9wLCBjYikge1xuICB2YXIgY3VycmVudCA9IHZtLl9ibG9ja1N0YXJ0XG4gIHZhciBlbmQgPSB2bS5fYmxvY2tFbmRcbiAgdmFyIG5leHRcbiAgd2hpbGUgKG5leHQgIT09IGVuZCkge1xuICAgIG5leHQgPSBjdXJyZW50Lm5leHRTaWJsaW5nXG4gICAgb3AoY3VycmVudCwgdGFyZ2V0LCB2bSlcbiAgICBjdXJyZW50ID0gbmV4dFxuICB9XG4gIG9wKGVuZCwgdGFyZ2V0LCB2bSwgY2IpXG59XG5cbi8qKlxuICogQ2hlY2sgZm9yIHNlbGVjdG9yc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfEVsZW1lbnR9IGVsXG4gKi9cblxuZnVuY3Rpb24gcXVlcnkgKGVsKSB7XG4gIHJldHVybiB0eXBlb2YgZWwgPT09ICdzdHJpbmcnXG4gICAgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsKVxuICAgIDogZWxcbn1cblxuLyoqXG4gKiBBcHBlbmQgb3BlcmF0aW9uIHRoYXQgdGFrZXMgYSBjYWxsYmFjay5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IGVsXG4gKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICogQHBhcmFtIHtWdWV9IHZtIC0gdW51c2VkXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gKi9cblxuZnVuY3Rpb24gYXBwZW5kIChlbCwgdGFyZ2V0LCB2bSwgY2IpIHtcbiAgdGFyZ2V0LmFwcGVuZENoaWxkKGVsKVxuICBpZiAoY2IpIGNiKClcbn1cblxuLyoqXG4gKiBJbnNlcnRCZWZvcmUgb3BlcmF0aW9uIHRoYXQgdGFrZXMgYSBjYWxsYmFjay5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IGVsXG4gKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICogQHBhcmFtIHtWdWV9IHZtIC0gdW51c2VkXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gKi9cblxuZnVuY3Rpb24gYmVmb3JlIChlbCwgdGFyZ2V0LCB2bSwgY2IpIHtcbiAgXy5iZWZvcmUoZWwsIHRhcmdldClcbiAgaWYgKGNiKSBjYigpXG59XG5cbi8qKlxuICogUmVtb3ZlIG9wZXJhdGlvbiB0aGF0IHRha2VzIGEgY2FsbGJhY2suXG4gKlxuICogQHBhcmFtIHtOb2RlfSBlbFxuICogQHBhcmFtIHtWdWV9IHZtIC0gdW51c2VkXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gKi9cblxuZnVuY3Rpb24gcmVtb3ZlIChlbCwgdm0sIGNiKSB7XG4gIF8ucmVtb3ZlKGVsKVxuICBpZiAoY2IpIGNiKClcbn1cbn0se1wiLi4vdHJhbnNpdGlvblwiOjU0LFwiLi4vdXRpbFwiOjYwfV0sNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxuXG4vKipcbiAqIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICovXG5cbmV4cG9ydHMuJG9uID0gZnVuY3Rpb24gKGV2ZW50LCBmbikge1xuICAodGhpcy5fZXZlbnRzW2V2ZW50XSB8fCAodGhpcy5fZXZlbnRzW2V2ZW50XSA9IFtdKSlcbiAgICAucHVzaChmbilcbiAgbW9kaWZ5TGlzdGVuZXJDb3VudCh0aGlzLCBldmVudCwgMSlcbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICovXG5cbmV4cG9ydHMuJG9uY2UgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICBmdW5jdGlvbiBvbiAoKSB7XG4gICAgc2VsZi4kb2ZmKGV2ZW50LCBvbilcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gIH1cbiAgb24uZm4gPSBmblxuICB0aGlzLiRvbihldmVudCwgb24pXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYGV2ZW50YCBvciBhbGxcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuXG5leHBvcnRzLiRvZmYgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XG4gIHZhciBjYnNcbiAgLy8gYWxsXG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIGlmICh0aGlzLiRwYXJlbnQpIHtcbiAgICAgIGZvciAoZXZlbnQgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICAgIGNicyA9IHRoaXMuX2V2ZW50c1tldmVudF1cbiAgICAgICAgaWYgKGNicykge1xuICAgICAgICAgIG1vZGlmeUxpc3RlbmVyQ291bnQodGhpcywgZXZlbnQsIC1jYnMubGVuZ3RoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuICAvLyBzcGVjaWZpYyBldmVudFxuICBjYnMgPSB0aGlzLl9ldmVudHNbZXZlbnRdXG4gIGlmICghY2JzKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIG1vZGlmeUxpc3RlbmVyQ291bnQodGhpcywgZXZlbnQsIC1jYnMubGVuZ3RoKVxuICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSBudWxsXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuICAvLyBzcGVjaWZpYyBoYW5kbGVyXG4gIHZhciBjYlxuICB2YXIgaSA9IGNicy5sZW5ndGhcbiAgd2hpbGUgKGktLSkge1xuICAgIGNiID0gY2JzW2ldXG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgIG1vZGlmeUxpc3RlbmVyQ291bnQodGhpcywgZXZlbnQsIC0xKVxuICAgICAgY2JzLnNwbGljZShpLCAxKVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBUcmlnZ2VyIGFuIGV2ZW50IG9uIHNlbGYuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKi9cblxuZXhwb3J0cy4kZW1pdCA9IGZ1bmN0aW9uIChldmVudCkge1xuICB0aGlzLl9ldmVudENhbmNlbGxlZCA9IGZhbHNlXG4gIHZhciBjYnMgPSB0aGlzLl9ldmVudHNbZXZlbnRdXG4gIGlmIChjYnMpIHtcbiAgICAvLyBhdm9pZCBsZWFraW5nIGFyZ3VtZW50czpcbiAgICAvLyBodHRwOi8vanNwZXJmLmNvbS9jbG9zdXJlLXdpdGgtYXJndW1lbnRzXG4gICAgdmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMVxuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGkpXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpICsgMV1cbiAgICB9XG4gICAgaSA9IDBcbiAgICBjYnMgPSBjYnMubGVuZ3RoID4gMVxuICAgICAgPyBfLnRvQXJyYXkoY2JzKVxuICAgICAgOiBjYnNcbiAgICBmb3IgKHZhciBsID0gY2JzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaWYgKGNic1tpXS5hcHBseSh0aGlzLCBhcmdzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRDYW5jZWxsZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgYnJvYWRjYXN0IGFuIGV2ZW50IHRvIGFsbCBjaGlsZHJlbiBpbnN0YW5jZXMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0gey4uLip9IGFkZGl0aW9uYWwgYXJndW1lbnRzXG4gKi9cblxuZXhwb3J0cy4kYnJvYWRjYXN0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIC8vIGlmIG5vIGNoaWxkIGhhcyByZWdpc3RlcmVkIGZvciB0aGlzIGV2ZW50LFxuICAvLyB0aGVuIHRoZXJlJ3Mgbm8gbmVlZCB0byBicm9hZGNhc3QuXG4gIGlmICghdGhpcy5fZXZlbnRzQ291bnRbZXZlbnRdKSByZXR1cm5cbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW5cbiAgaWYgKGNoaWxkcmVuKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICBjaGlsZC4kZW1pdC5hcHBseShjaGlsZCwgYXJndW1lbnRzKVxuICAgICAgaWYgKCFjaGlsZC5fZXZlbnRDYW5jZWxsZWQpIHtcbiAgICAgICAgY2hpbGQuJGJyb2FkY2FzdC5hcHBseShjaGlsZCwgYXJndW1lbnRzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IHByb3BhZ2F0ZSBhbiBldmVudCB1cCB0aGUgcGFyZW50IGNoYWluLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHsuLi4qfSBhZGRpdGlvbmFsIGFyZ3VtZW50c1xuICovXG5cbmV4cG9ydHMuJGRpc3BhdGNoID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy4kcGFyZW50XG4gIHdoaWxlIChwYXJlbnQpIHtcbiAgICBwYXJlbnQuJGVtaXQuYXBwbHkocGFyZW50LCBhcmd1bWVudHMpXG4gICAgcGFyZW50ID0gcGFyZW50Ll9ldmVudENhbmNlbGxlZFxuICAgICAgPyBudWxsXG4gICAgICA6IHBhcmVudC4kcGFyZW50XG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBNb2RpZnkgdGhlIGxpc3RlbmVyIGNvdW50cyBvbiBhbGwgcGFyZW50cy5cbiAqIFRoaXMgYm9va2tlZXBpbmcgYWxsb3dzICRicm9hZGNhc3QgdG8gcmV0dXJuIGVhcmx5IHdoZW5cbiAqIG5vIGNoaWxkIGhhcyBsaXN0ZW5lZCB0byBhIGNlcnRhaW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtWdWV9IHZtXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudFxuICovXG5cbnZhciBob29rUkUgPSAvXmhvb2s6L1xuZnVuY3Rpb24gbW9kaWZ5TGlzdGVuZXJDb3VudCAodm0sIGV2ZW50LCBjb3VudCkge1xuICB2YXIgcGFyZW50ID0gdm0uJHBhcmVudFxuICAvLyBob29rcyBkbyBub3QgZ2V0IGJyb2FkY2FzdGVkIHNvIG5vIG5lZWRcbiAgLy8gdG8gZG8gYm9va2tlZXBpbmcgZm9yIHRoZW1cbiAgaWYgKCFwYXJlbnQgfHwgIWNvdW50IHx8IGhvb2tSRS50ZXN0KGV2ZW50KSkgcmV0dXJuXG4gIHdoaWxlIChwYXJlbnQpIHtcbiAgICBwYXJlbnQuX2V2ZW50c0NvdW50W2V2ZW50XSA9XG4gICAgICAocGFyZW50Ll9ldmVudHNDb3VudFtldmVudF0gfHwgMCkgKyBjb3VudFxuICAgIHBhcmVudCA9IHBhcmVudC4kcGFyZW50XG4gIH1cbn1cbn0se1wiLi4vdXRpbFwiOjYwfV0sNzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIG1lcmdlT3B0aW9ucyA9IHJlcXVpcmUoJy4uL3V0aWwvbWVyZ2Utb3B0aW9uJylcblxuLyoqXG4gKiBFeHBvc2UgdXNlZnVsIGludGVybmFsc1xuICovXG5cbmV4cG9ydHMudXRpbCA9IF9cbmV4cG9ydHMubmV4dFRpY2sgPSBfLm5leHRUaWNrXG5leHBvcnRzLmNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cbmV4cG9ydHMuY29tcGlsZXIgPSB7XG4gIGNvbXBpbGU6IHJlcXVpcmUoJy4uL2NvbXBpbGVyL2NvbXBpbGUnKSxcbiAgdHJhbnNjbHVkZTogcmVxdWlyZSgnLi4vY29tcGlsZXIvdHJhbnNjbHVkZScpXG59XG5cbmV4cG9ydHMucGFyc2VycyA9IHtcbiAgcGF0aDogcmVxdWlyZSgnLi4vcGFyc2Vycy9wYXRoJyksXG4gIHRleHQ6IHJlcXVpcmUoJy4uL3BhcnNlcnMvdGV4dCcpLFxuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi4vcGFyc2Vycy90ZW1wbGF0ZScpLFxuICBkaXJlY3RpdmU6IHJlcXVpcmUoJy4uL3BhcnNlcnMvZGlyZWN0aXZlJyksXG4gIGV4cHJlc3Npb246IHJlcXVpcmUoJy4uL3BhcnNlcnMvZXhwcmVzc2lvbicpXG59XG5cbi8qKlxuICogRWFjaCBpbnN0YW5jZSBjb25zdHJ1Y3RvciwgaW5jbHVkaW5nIFZ1ZSwgaGFzIGEgdW5pcXVlXG4gKiBjaWQuIFRoaXMgZW5hYmxlcyB1cyB0byBjcmVhdGUgd3JhcHBlZCBcImNoaWxkXG4gKiBjb25zdHJ1Y3RvcnNcIiBmb3IgcHJvdG90eXBhbCBpbmhlcml0YW5jZSBhbmQgY2FjaGUgdGhlbS5cbiAqL1xuXG5leHBvcnRzLmNpZCA9IDBcbnZhciBjaWQgPSAxXG5cbi8qKlxuICogQ2xhc3MgaW5laHJpdGFuY2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZXh0ZW5kT3B0aW9uc1xuICovXG5cbmV4cG9ydHMuZXh0ZW5kID0gZnVuY3Rpb24gKGV4dGVuZE9wdGlvbnMpIHtcbiAgZXh0ZW5kT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMgfHwge31cbiAgdmFyIFN1cGVyID0gdGhpc1xuICB2YXIgU3ViID0gY3JlYXRlQ2xhc3MoZXh0ZW5kT3B0aW9ucy5uYW1lIHx8ICdWdWVDb21wb25lbnQnKVxuICBTdWIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlci5wcm90b3R5cGUpXG4gIFN1Yi5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdWJcbiAgU3ViLmNpZCA9IGNpZCsrXG4gIFN1Yi5vcHRpb25zID0gbWVyZ2VPcHRpb25zKFxuICAgIFN1cGVyLm9wdGlvbnMsXG4gICAgZXh0ZW5kT3B0aW9uc1xuICApXG4gIFN1Ylsnc3VwZXInXSA9IFN1cGVyXG4gIC8vIGFsbG93IGZ1cnRoZXIgZXh0ZW5zaW9uXG4gIFN1Yi5leHRlbmQgPSBTdXBlci5leHRlbmRcbiAgLy8gY3JlYXRlIGFzc2V0IHJlZ2lzdGVycywgc28gZXh0ZW5kZWQgY2xhc3Nlc1xuICAvLyBjYW4gaGF2ZSB0aGVpciBwcml2YXRlIGFzc2V0cyB0b28uXG4gIGNyZWF0ZUFzc2V0UmVnaXN0ZXJzKFN1YilcbiAgcmV0dXJuIFN1YlxufVxuXG4vKipcbiAqIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgc3ViLWNsYXNzIGNvbnN0cnVjdG9yIHdpdGggdGhlXG4gKiBnaXZlbiBuYW1lLiBUaGlzIGdpdmVzIHVzIG11Y2ggbmljZXIgb3V0cHV0IHdoZW5cbiAqIGxvZ2dpbmcgaW5zdGFuY2VzIGluIHRoZSBjb25zb2xlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuXG5mdW5jdGlvbiBjcmVhdGVDbGFzcyAobmFtZSkge1xuICByZXR1cm4gbmV3IEZ1bmN0aW9uKFxuICAgICdyZXR1cm4gZnVuY3Rpb24gJyArIF8uY2FtZWxpemUobmFtZSwgdHJ1ZSkgK1xuICAgICcgKG9wdGlvbnMpIHsgdGhpcy5faW5pdChvcHRpb25zKSB9J1xuICApKClcbn1cblxuLyoqXG4gKiBQbHVnaW4gc3lzdGVtXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHBsdWdpblxuICovXG5cbmV4cG9ydHMudXNlID0gZnVuY3Rpb24gKHBsdWdpbikge1xuICAvLyBhZGRpdGlvbmFsIHBhcmFtZXRlcnNcbiAgdmFyIGFyZ3MgPSBfLnRvQXJyYXkoYXJndW1lbnRzLCAxKVxuICBhcmdzLnVuc2hpZnQodGhpcylcbiAgaWYgKHR5cGVvZiBwbHVnaW4uaW5zdGFsbCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHBsdWdpbi5pbnN0YWxsLmFwcGx5KHBsdWdpbiwgYXJncylcbiAgfSBlbHNlIHtcbiAgICBwbHVnaW4uYXBwbHkobnVsbCwgYXJncylcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIERlZmluZSBhc3NldCByZWdpc3RyYXRpb24gbWV0aG9kcyBvbiBhIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IENvbnN0cnVjdG9yXG4gKi9cblxudmFyIGFzc2V0VHlwZXMgPSBbXG4gICdkaXJlY3RpdmUnLFxuICAnZmlsdGVyJyxcbiAgJ3BhcnRpYWwnLFxuICAndHJhbnNpdGlvbidcbl1cblxuZnVuY3Rpb24gY3JlYXRlQXNzZXRSZWdpc3RlcnMgKENvbnN0cnVjdG9yKSB7XG5cbiAgLyogQXNzZXQgcmVnaXN0cmF0aW9uIG1ldGhvZHMgc2hhcmUgdGhlIHNhbWUgc2lnbmF0dXJlOlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWRcbiAgICogQHBhcmFtIHsqfSBkZWZpbml0aW9uXG4gICAqL1xuXG4gIGFzc2V0VHlwZXMuZm9yRWFjaChmdW5jdGlvbiAodHlwZSkge1xuICAgIENvbnN0cnVjdG9yW3R5cGVdID0gZnVuY3Rpb24gKGlkLCBkZWZpbml0aW9uKSB7XG4gICAgICBpZiAoIWRlZmluaXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9uc1t0eXBlICsgJ3MnXVtpZF1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1t0eXBlICsgJ3MnXVtpZF0gPSBkZWZpbml0aW9uXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgcmVnaXN0cmF0aW9uIG5lZWRzIHRvIGF1dG9tYXRpY2FsbHkgaW52b2tlXG4gICAqIFZ1ZS5leHRlbmQgb24gb2JqZWN0IHZhbHVlcy5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkXG4gICAqIEBwYXJhbSB7T2JqZWN0fEZ1bmN0aW9ufSBkZWZpbml0aW9uXG4gICAqL1xuXG4gIENvbnN0cnVjdG9yLmNvbXBvbmVudCA9IGZ1bmN0aW9uIChpZCwgZGVmaW5pdGlvbikge1xuICAgIGlmICghZGVmaW5pdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5jb21wb25lbnRzW2lkXVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoXy5pc1BsYWluT2JqZWN0KGRlZmluaXRpb24pKSB7XG4gICAgICAgIGRlZmluaXRpb24ubmFtZSA9IGlkXG4gICAgICAgIGRlZmluaXRpb24gPSBfLlZ1ZS5leHRlbmQoZGVmaW5pdGlvbilcbiAgICAgIH1cbiAgICAgIHRoaXMub3B0aW9ucy5jb21wb25lbnRzW2lkXSA9IGRlZmluaXRpb25cbiAgICB9XG4gIH1cbn1cblxuY3JlYXRlQXNzZXRSZWdpc3RlcnMoZXhwb3J0cylcbn0se1wiLi4vY29tcGlsZXIvY29tcGlsZVwiOjExLFwiLi4vY29tcGlsZXIvdHJhbnNjbHVkZVwiOjEyLFwiLi4vY29uZmlnXCI6MTMsXCIuLi9wYXJzZXJzL2RpcmVjdGl2ZVwiOjQ4LFwiLi4vcGFyc2Vycy9leHByZXNzaW9uXCI6NDksXCIuLi9wYXJzZXJzL3BhdGhcIjo1MCxcIi4uL3BhcnNlcnMvdGVtcGxhdGVcIjo1MSxcIi4uL3BhcnNlcnMvdGV4dFwiOjUyLFwiLi4vdXRpbFwiOjYwLFwiLi4vdXRpbC9tZXJnZS1vcHRpb25cIjo2Mn1dLDg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBjb21waWxlID0gcmVxdWlyZSgnLi4vY29tcGlsZXIvY29tcGlsZScpXG5cbi8qKlxuICogU2V0IGluc3RhbmNlIHRhcmdldCBlbGVtZW50IGFuZCBraWNrIG9mZiB0aGUgY29tcGlsYXRpb25cbiAqIHByb2Nlc3MuIFRoZSBwYXNzZWQgaW4gYGVsYCBjYW4gYmUgYSBzZWxlY3RvciBzdHJpbmcsIGFuXG4gKiBleGlzdGluZyBFbGVtZW50LCBvciBhIERvY3VtZW50RnJhZ21lbnQgKGZvciBibG9ja1xuICogaW5zdGFuY2VzKS5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR8RG9jdW1lbnRGcmFnbWVudHxzdHJpbmd9IGVsXG4gKiBAcHVibGljXG4gKi9cblxuZXhwb3J0cy4kbW91bnQgPSBmdW5jdGlvbiAoZWwpIHtcbiAgaWYgKHRoaXMuX2lzQ29tcGlsZWQpIHtcbiAgICBfLndhcm4oJyRtb3VudCgpIHNob3VsZCBiZSBjYWxsZWQgb25seSBvbmNlLicpXG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKCFlbCkge1xuICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgfSBlbHNlIGlmICh0eXBlb2YgZWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gZWxcbiAgICBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWwpXG4gICAgaWYgKCFlbCkge1xuICAgICAgXy53YXJuKCdDYW5ub3QgZmluZCBlbGVtZW50OiAnICsgc2VsZWN0b3IpXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cbiAgdGhpcy5fY29tcGlsZShlbClcbiAgdGhpcy5faXNDb21waWxlZCA9IHRydWVcbiAgdGhpcy5fY2FsbEhvb2soJ2NvbXBpbGVkJylcbiAgaWYgKF8uaW5Eb2ModGhpcy4kZWwpKSB7XG4gICAgdGhpcy5fY2FsbEhvb2soJ2F0dGFjaGVkJylcbiAgICB0aGlzLl9pbml0RE9NSG9va3MoKVxuICAgIHJlYWR5LmNhbGwodGhpcylcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9pbml0RE9NSG9va3MoKVxuICAgIHRoaXMuJG9uY2UoJ2hvb2s6YXR0YWNoZWQnLCByZWFkeSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIE1hcmsgYW4gaW5zdGFuY2UgYXMgcmVhZHkuXG4gKi9cblxuZnVuY3Rpb24gcmVhZHkgKCkge1xuICB0aGlzLl9pc0F0dGFjaGVkID0gdHJ1ZVxuICB0aGlzLl9pc1JlYWR5ID0gdHJ1ZVxuICB0aGlzLl9jYWxsSG9vaygncmVhZHknKVxufVxuXG4vKipcbiAqIFRlYXJkb3duIHRoZSBpbnN0YW5jZSwgc2ltcGx5IGRlbGVnYXRlIHRvIHRoZSBpbnRlcm5hbFxuICogX2Rlc3Ryb3kuXG4gKi9cblxuZXhwb3J0cy4kZGVzdHJveSA9IGZ1bmN0aW9uIChyZW1vdmUsIGRlZmVyQ2xlYW51cCkge1xuICB0aGlzLl9kZXN0cm95KHJlbW92ZSwgZGVmZXJDbGVhbnVwKVxufVxuXG4vKipcbiAqIFBhcnRpYWxseSBjb21waWxlIGEgcGllY2Ugb2YgRE9NIGFuZCByZXR1cm4gYVxuICogZGVjb21waWxlIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBlbFxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblxuZXhwb3J0cy4kY29tcGlsZSA9IGZ1bmN0aW9uIChlbCkge1xuICByZXR1cm4gY29tcGlsZShlbCwgdGhpcy4kb3B0aW9ucywgdHJ1ZSkodGhpcywgZWwpXG59XG59LHtcIi4uL2NvbXBpbGVyL2NvbXBpbGVcIjoxMSxcIi4uL3V0aWxcIjo2MH1dLDk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKVxuXG4vLyB3ZSBoYXZlIHR3byBzZXBhcmF0ZSBxdWV1ZXM6IG9uZSBmb3IgZGlyZWN0aXZlIHVwZGF0ZXNcbi8vIGFuZCBvbmUgZm9yIHVzZXIgd2F0Y2hlciByZWdpc3RlcmVkIHZpYSAkd2F0Y2goKS5cbi8vIHdlIHdhbnQgdG8gZ3VhcmFudGVlIGRpcmVjdGl2ZSB1cGRhdGVzIHRvIGJlIGNhbGxlZFxuLy8gYmVmb3JlIHVzZXIgd2F0Y2hlcnMgc28gdGhhdCB3aGVuIHVzZXIgd2F0Y2hlcnMgYXJlXG4vLyB0cmlnZ2VyZWQsIHRoZSBET00gd291bGQgaGF2ZSBhbHJlYWR5IGJlZW4gaW4gdXBkYXRlZFxuLy8gc3RhdGUuXG52YXIgcXVldWUgPSBbXVxudmFyIHVzZXJRdWV1ZSA9IFtdXG52YXIgaGFzID0ge31cbnZhciB3YWl0aW5nID0gZmFsc2VcbnZhciBmbHVzaGluZyA9IGZhbHNlXG5cbi8qKlxuICogUmVzZXQgdGhlIGJhdGNoZXIncyBzdGF0ZS5cbiAqL1xuXG5mdW5jdGlvbiByZXNldCAoKSB7XG4gIHF1ZXVlID0gW11cbiAgdXNlclF1ZXVlID0gW11cbiAgaGFzID0ge31cbiAgd2FpdGluZyA9IGZhbHNlXG4gIGZsdXNoaW5nID0gZmFsc2Vcbn1cblxuLyoqXG4gKiBGbHVzaCBib3RoIHF1ZXVlcyBhbmQgcnVuIHRoZSBqb2JzLlxuICovXG5cbmZ1bmN0aW9uIGZsdXNoICgpIHtcbiAgZmx1c2hpbmcgPSB0cnVlXG4gIHJ1bihxdWV1ZSlcbiAgcnVuKHVzZXJRdWV1ZSlcbiAgcmVzZXQoKVxufVxuXG4vKipcbiAqIFJ1biB0aGUgam9icyBpbiBhIHNpbmdsZSBxdWV1ZS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBxdWV1ZVxuICovXG5cbmZ1bmN0aW9uIHJ1biAocXVldWUpIHtcbiAgLy8gZG8gbm90IGNhY2hlIGxlbmd0aCBiZWNhdXNlIG1vcmUgam9icyBtaWdodCBiZSBwdXNoZWRcbiAgLy8gYXMgd2UgcnVuIGV4aXN0aW5nIGpvYnNcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgIHF1ZXVlW2ldLnJ1bigpXG4gIH1cbn1cblxuLyoqXG4gKiBQdXNoIGEgam9iIGludG8gdGhlIGpvYiBxdWV1ZS5cbiAqIEpvYnMgd2l0aCBkdXBsaWNhdGUgSURzIHdpbGwgYmUgc2tpcHBlZCB1bmxlc3MgaXQnc1xuICogcHVzaGVkIHdoZW4gdGhlIHF1ZXVlIGlzIGJlaW5nIGZsdXNoZWQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGpvYlxuICogICBwcm9wZXJ0aWVzOlxuICogICAtIHtTdHJpbmd8TnVtYmVyfSBpZFxuICogICAtIHtGdW5jdGlvbn0gICAgICBydW5cbiAqL1xuXG5leHBvcnRzLnB1c2ggPSBmdW5jdGlvbiAoam9iKSB7XG4gIGlmICgham9iLmlkIHx8ICFoYXNbam9iLmlkXSB8fCBmbHVzaGluZykge1xuICAgIC8vIEEgdXNlciB3YXRjaGVyIGNhbGxiYWNrIGNvdWxkIHRyaWdnZXIgYW5vdGhlclxuICAgIC8vIGRpcmVjdGl2ZSB1cGRhdGUgZHVyaW5nIHRoZSBmbHVzaGluZzsgYXQgdGhhdCB0aW1lXG4gICAgLy8gdGhlIGRpcmVjdGl2ZSBxdWV1ZSB3b3VsZCBhbHJlYWR5IGhhdmUgYmVlbiBydW4sIHNvXG4gICAgLy8gd2UgY2FsbCB0aGF0IHVwZGF0ZSBpbW1lZGlhdGVseSBhcyBpdCBpcyBwdXNoZWQuXG4gICAgaWYgKGZsdXNoaW5nICYmICFqb2IudXNlcikge1xuICAgICAgam9iLnJ1bigpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgOyhqb2IudXNlciA/IHVzZXJRdWV1ZSA6IHF1ZXVlKS5wdXNoKGpvYilcbiAgICBoYXNbam9iLmlkXSA9IGpvYlxuICAgIGlmICghd2FpdGluZykge1xuICAgICAgd2FpdGluZyA9IHRydWVcbiAgICAgIF8ubmV4dFRpY2soZmx1c2gpXG4gICAgfVxuICB9XG59XG59LHtcIi4vdXRpbFwiOjYwfV0sMTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLyoqXG4gKiBBIGRvdWJseSBsaW5rZWQgbGlzdC1iYXNlZCBMZWFzdCBSZWNlbnRseSBVc2VkIChMUlUpXG4gKiBjYWNoZS4gV2lsbCBrZWVwIG1vc3QgcmVjZW50bHkgdXNlZCBpdGVtcyB3aGlsZVxuICogZGlzY2FyZGluZyBsZWFzdCByZWNlbnRseSB1c2VkIGl0ZW1zIHdoZW4gaXRzIGxpbWl0IGlzXG4gKiByZWFjaGVkLiBUaGlzIGlzIGEgYmFyZS1ib25lIHZlcnNpb24gb2ZcbiAqIFJhc211cyBBbmRlcnNzb24ncyBqcy1scnU6XG4gKlxuICogICBodHRwczovL2dpdGh1Yi5jb20vcnNtcy9qcy1scnVcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbGltaXRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbmZ1bmN0aW9uIENhY2hlIChsaW1pdCkge1xuICB0aGlzLnNpemUgPSAwXG4gIHRoaXMubGltaXQgPSBsaW1pdFxuICB0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSB1bmRlZmluZWRcbiAgdGhpcy5fa2V5bWFwID0ge31cbn1cblxudmFyIHAgPSBDYWNoZS5wcm90b3R5cGVcblxuLyoqXG4gKiBQdXQgPHZhbHVlPiBpbnRvIHRoZSBjYWNoZSBhc3NvY2lhdGVkIHdpdGggPGtleT4uXG4gKiBSZXR1cm5zIHRoZSBlbnRyeSB3aGljaCB3YXMgcmVtb3ZlZCB0byBtYWtlIHJvb20gZm9yXG4gKiB0aGUgbmV3IGVudHJ5LiBPdGhlcndpc2UgdW5kZWZpbmVkIGlzIHJldHVybmVkLlxuICogKGkuZS4gaWYgdGhlcmUgd2FzIGVub3VnaCByb29tIGFscmVhZHkpLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm4ge0VudHJ5fHVuZGVmaW5lZH1cbiAqL1xuXG5wLnB1dCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIHZhciBlbnRyeSA9IHtcbiAgICBrZXk6a2V5LFxuICAgIHZhbHVlOnZhbHVlXG4gIH1cbiAgdGhpcy5fa2V5bWFwW2tleV0gPSBlbnRyeVxuICBpZiAodGhpcy50YWlsKSB7XG4gICAgdGhpcy50YWlsLm5ld2VyID0gZW50cnlcbiAgICBlbnRyeS5vbGRlciA9IHRoaXMudGFpbFxuICB9IGVsc2Uge1xuICAgIHRoaXMuaGVhZCA9IGVudHJ5XG4gIH1cbiAgdGhpcy50YWlsID0gZW50cnlcbiAgaWYgKHRoaXMuc2l6ZSA9PT0gdGhpcy5saW1pdCkge1xuICAgIHJldHVybiB0aGlzLnNoaWZ0KClcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnNpemUrK1xuICB9XG59XG5cbi8qKlxuICogUHVyZ2UgdGhlIGxlYXN0IHJlY2VudGx5IHVzZWQgKG9sZGVzdCkgZW50cnkgZnJvbSB0aGVcbiAqIGNhY2hlLiBSZXR1cm5zIHRoZSByZW1vdmVkIGVudHJ5IG9yIHVuZGVmaW5lZCBpZiB0aGVcbiAqIGNhY2hlIHdhcyBlbXB0eS5cbiAqL1xuXG5wLnNoaWZ0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZW50cnkgPSB0aGlzLmhlYWRcbiAgaWYgKGVudHJ5KSB7XG4gICAgdGhpcy5oZWFkID0gdGhpcy5oZWFkLm5ld2VyXG4gICAgdGhpcy5oZWFkLm9sZGVyID0gdW5kZWZpbmVkXG4gICAgZW50cnkubmV3ZXIgPSBlbnRyeS5vbGRlciA9IHVuZGVmaW5lZFxuICAgIHRoaXMuX2tleW1hcFtlbnRyeS5rZXldID0gdW5kZWZpbmVkXG4gIH1cbiAgcmV0dXJuIGVudHJ5XG59XG5cbi8qKlxuICogR2V0IGFuZCByZWdpc3RlciByZWNlbnQgdXNlIG9mIDxrZXk+LiBSZXR1cm5zIHRoZSB2YWx1ZVxuICogYXNzb2NpYXRlZCB3aXRoIDxrZXk+IG9yIHVuZGVmaW5lZCBpZiBub3QgaW4gY2FjaGUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtCb29sZWFufSByZXR1cm5FbnRyeVxuICogQHJldHVybiB7RW50cnl8Kn1cbiAqL1xuXG5wLmdldCA9IGZ1bmN0aW9uIChrZXksIHJldHVybkVudHJ5KSB7XG4gIHZhciBlbnRyeSA9IHRoaXMuX2tleW1hcFtrZXldXG4gIGlmIChlbnRyeSA9PT0gdW5kZWZpbmVkKSByZXR1cm5cbiAgaWYgKGVudHJ5ID09PSB0aGlzLnRhaWwpIHtcbiAgICByZXR1cm4gcmV0dXJuRW50cnlcbiAgICAgID8gZW50cnlcbiAgICAgIDogZW50cnkudmFsdWVcbiAgfVxuICAvLyBIRUFELS0tLS0tLS0tLS0tLS1UQUlMXG4gIC8vICAgPC5vbGRlciAgIC5uZXdlcj5cbiAgLy8gIDwtLS0gYWRkIGRpcmVjdGlvbiAtLVxuICAvLyAgIEEgIEIgIEMgIDxEPiAgRVxuICBpZiAoZW50cnkubmV3ZXIpIHtcbiAgICBpZiAoZW50cnkgPT09IHRoaXMuaGVhZCkge1xuICAgICAgdGhpcy5oZWFkID0gZW50cnkubmV3ZXJcbiAgICB9XG4gICAgZW50cnkubmV3ZXIub2xkZXIgPSBlbnRyeS5vbGRlciAvLyBDIDwtLSBFLlxuICB9XG4gIGlmIChlbnRyeS5vbGRlcikge1xuICAgIGVudHJ5Lm9sZGVyLm5ld2VyID0gZW50cnkubmV3ZXIgLy8gQy4gLS0+IEVcbiAgfVxuICBlbnRyeS5uZXdlciA9IHVuZGVmaW5lZCAvLyBEIC0teFxuICBlbnRyeS5vbGRlciA9IHRoaXMudGFpbCAvLyBELiAtLT4gRVxuICBpZiAodGhpcy50YWlsKSB7XG4gICAgdGhpcy50YWlsLm5ld2VyID0gZW50cnkgLy8gRS4gPC0tIERcbiAgfVxuICB0aGlzLnRhaWwgPSBlbnRyeVxuICByZXR1cm4gcmV0dXJuRW50cnlcbiAgICA/IGVudHJ5XG4gICAgOiBlbnRyeS52YWx1ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENhY2hlXG59LHt9XSwxMTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG52YXIgdGV4dFBhcnNlciA9IHJlcXVpcmUoJy4uL3BhcnNlcnMvdGV4dCcpXG52YXIgZGlyUGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy9kaXJlY3RpdmUnKVxudmFyIHRlbXBsYXRlUGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy90ZW1wbGF0ZScpXG5cbi8qKlxuICogQ29tcGlsZSBhIHRlbXBsYXRlIGFuZCByZXR1cm4gYSByZXVzYWJsZSBjb21wb3NpdGUgbGlua1xuICogZnVuY3Rpb24sIHdoaWNoIHJlY3Vyc2l2ZWx5IGNvbnRhaW5zIG1vcmUgbGluayBmdW5jdGlvbnNcbiAqIGluc2lkZS4gVGhpcyB0b3AgbGV2ZWwgY29tcGlsZSBmdW5jdGlvbiBzaG91bGQgb25seSBiZVxuICogY2FsbGVkIG9uIGluc3RhbmNlIHJvb3Qgbm9kZXMuXG4gKlxuICogV2hlbiB0aGUgYGFzUGFyZW50YCBmbGFnIGlzIHRydWUsIHRoaXMgbWVhbnMgd2UgYXJlIGRvaW5nXG4gKiBhIHBhcnRpYWwgY29tcGlsZSBmb3IgYSBjb21wb25lbnQncyBwYXJlbnQgc2NvcGUgbWFya3VwXG4gKiAoU2VlICM1MDIpLiBUaGlzIGNvdWxkICoqb25seSoqIGJlIHRyaWdnZXJlZCBkdXJpbmdcbiAqIGNvbXBpbGF0aW9uIG9mIGB2LWNvbXBvbmVudGAsIGFuZCB3ZSBuZWVkIHRvIHNraXAgdi13aXRoLFxuICogdi1yZWYgJiB2LWNvbXBvbmVudCBpbiB0aGlzIHNpdHVhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR8RG9jdW1lbnRGcmFnbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHBhcnRpYWxcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gYXNQYXJlbnQgLSBjb21waWxpbmcgYSBjb21wb25lbnRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIgYXMgaXRzIHBhcmVudC5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY29tcGlsZSAoZWwsIG9wdGlvbnMsIHBhcnRpYWwsIGFzUGFyZW50KSB7XG4gIHZhciBwYXJhbXMgPSAhcGFydGlhbCAmJiBvcHRpb25zLnBhcmFtQXR0cmlidXRlc1xuICB2YXIgcGFyYW1zTGlua0ZuID0gcGFyYW1zXG4gICAgPyBjb21waWxlUGFyYW1BdHRyaWJ1dGVzKGVsLCBwYXJhbXMsIG9wdGlvbnMpXG4gICAgOiBudWxsXG4gIHZhciBub2RlTGlua0ZuID0gZWwgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50XG4gICAgPyBudWxsXG4gICAgOiBjb21waWxlTm9kZShlbCwgb3B0aW9ucywgYXNQYXJlbnQpXG4gIHZhciBjaGlsZExpbmtGbiA9XG4gICAgIShub2RlTGlua0ZuICYmIG5vZGVMaW5rRm4udGVybWluYWwpICYmXG4gICAgZWwudGFnTmFtZSAhPT0gJ1NDUklQVCcgJiZcbiAgICBlbC5oYXNDaGlsZE5vZGVzKClcbiAgICAgID8gY29tcGlsZU5vZGVMaXN0KGVsLmNoaWxkTm9kZXMsIG9wdGlvbnMpXG4gICAgICA6IG51bGxcblxuICAvKipcbiAgICogQSBsaW5rZXIgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGEgYWxyZWFkeSBjb21waWxlZFxuICAgKiBwaWVjZSBvZiBET00sIHdoaWNoIGluc3RhbnRpYXRlcyBhbGwgZGlyZWN0aXZlXG4gICAqIGluc3RhbmNlcy5cbiAgICpcbiAgICogQHBhcmFtIHtWdWV9IHZtXG4gICAqIEBwYXJhbSB7RWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBlbFxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbnx1bmRlZmluZWR9XG4gICAqL1xuXG4gIHJldHVybiBmdW5jdGlvbiBsaW5rICh2bSwgZWwpIHtcbiAgICB2YXIgb3JpZ2luYWxEaXJDb3VudCA9IHZtLl9kaXJlY3RpdmVzLmxlbmd0aFxuICAgIGlmIChwYXJhbXNMaW5rRm4pIHBhcmFtc0xpbmtGbih2bSwgZWwpXG4gICAgaWYgKG5vZGVMaW5rRm4pIG5vZGVMaW5rRm4odm0sIGVsKVxuICAgIGlmIChjaGlsZExpbmtGbikgY2hpbGRMaW5rRm4odm0sIGVsLmNoaWxkTm9kZXMpXG5cbiAgICAvKipcbiAgICAgKiBJZiB0aGlzIGlzIGEgcGFydGlhbCBjb21waWxlLCB0aGUgbGlua2VyIGZ1bmN0aW9uXG4gICAgICogcmV0dXJucyBhbiB1bmxpbmsgZnVuY3Rpb24gdGhhdCB0ZWFyc2Rvd24gYWxsXG4gICAgICogZGlyZWN0aXZlcyBpbnN0YW5jZXMgZ2VuZXJhdGVkIGR1cmluZyB0aGUgcGFydGlhbFxuICAgICAqIGxpbmtpbmcuXG4gICAgICovXG5cbiAgICBpZiAocGFydGlhbCkge1xuICAgICAgdmFyIGRpcnMgPSB2bS5fZGlyZWN0aXZlcy5zbGljZShvcmlnaW5hbERpckNvdW50KVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIHVubGluayAoKSB7XG4gICAgICAgIHZhciBpID0gZGlycy5sZW5ndGhcbiAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgIGRpcnNbaV0uX3RlYXJkb3duKClcbiAgICAgICAgfVxuICAgICAgICBpID0gdm0uX2RpcmVjdGl2ZXMuaW5kZXhPZihkaXJzWzBdKVxuICAgICAgICB2bS5fZGlyZWN0aXZlcy5zcGxpY2UoaSwgZGlycy5sZW5ndGgpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIG5vZGUgYW5kIHJldHVybiBhIG5vZGVMaW5rRm4gYmFzZWQgb24gdGhlXG4gKiBub2RlIHR5cGUuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtCb29sZWFufSBhc1BhcmVudFxuICogQHJldHVybiB7RnVuY3Rpb258dW5kZWZpbmVkfVxuICovXG5cbmZ1bmN0aW9uIGNvbXBpbGVOb2RlIChub2RlLCBvcHRpb25zLCBhc1BhcmVudCkge1xuICB2YXIgdHlwZSA9IG5vZGUubm9kZVR5cGVcbiAgaWYgKHR5cGUgPT09IDEgJiYgbm9kZS50YWdOYW1lICE9PSAnU0NSSVBUJykge1xuICAgIHJldHVybiBjb21waWxlRWxlbWVudChub2RlLCBvcHRpb25zLCBhc1BhcmVudClcbiAgfSBlbHNlIGlmICh0eXBlID09PSAzICYmIGNvbmZpZy5pbnRlcnBvbGF0ZSkge1xuICAgIHJldHVybiBjb21waWxlVGV4dE5vZGUobm9kZSwgb3B0aW9ucylcbiAgfVxufVxuXG4vKipcbiAqIENvbXBpbGUgYW4gZWxlbWVudCBhbmQgcmV0dXJuIGEgbm9kZUxpbmtGbi5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtCb29sZWFufSBhc1BhcmVudFxuICogQHJldHVybiB7RnVuY3Rpb258bnVsbH1cbiAqL1xuXG5mdW5jdGlvbiBjb21waWxlRWxlbWVudCAoZWwsIG9wdGlvbnMsIGFzUGFyZW50KSB7XG4gIHZhciBsaW5rRm4sIHRhZywgY29tcG9uZW50XG4gIC8vIGNoZWNrIGN1c3RvbSBlbGVtZW50IGNvbXBvbmVudCwgYnV0IG9ubHkgb24gbm9uLXJvb3RcbiAgaWYgKCFhc1BhcmVudCAmJiAhZWwuX192dWVfXykge1xuICAgIHRhZyA9IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgIGNvbXBvbmVudCA9XG4gICAgICB0YWcuaW5kZXhPZignLScpID4gMCAmJlxuICAgICAgb3B0aW9ucy5jb21wb25lbnRzW3RhZ11cbiAgICBpZiAoY29tcG9uZW50KSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoY29uZmlnLnByZWZpeCArICdjb21wb25lbnQnLCB0YWcpXG4gICAgfVxuICB9XG4gIGlmIChjb21wb25lbnQgfHwgZWwuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgLy8gY2hlY2sgdGVybWluYWwgZGlyZWNpdHZlc1xuICAgIGlmICghYXNQYXJlbnQpIHtcbiAgICAgIGxpbmtGbiA9IGNoZWNrVGVybWluYWxEaXJlY3RpdmVzKGVsLCBvcHRpb25zKVxuICAgIH1cbiAgICAvLyBpZiBub3QgdGVybWluYWwsIGJ1aWxkIG5vcm1hbCBsaW5rIGZ1bmN0aW9uXG4gICAgaWYgKCFsaW5rRm4pIHtcbiAgICAgIHZhciBkaXJzID0gY29sbGVjdERpcmVjdGl2ZXMoZWwsIG9wdGlvbnMsIGFzUGFyZW50KVxuICAgICAgbGlua0ZuID0gZGlycy5sZW5ndGhcbiAgICAgICAgPyBtYWtlRGlyZWN0aXZlc0xpbmtGbihkaXJzKVxuICAgICAgICA6IG51bGxcbiAgICB9XG4gIH1cbiAgLy8gaWYgdGhlIGVsZW1lbnQgaXMgYSB0ZXh0YXJlYSwgd2UgbmVlZCB0byBpbnRlcnBvbGF0ZVxuICAvLyBpdHMgY29udGVudCBvbiBpbml0aWFsIHJlbmRlci5cbiAgaWYgKGVsLnRhZ05hbWUgPT09ICdURVhUQVJFQScpIHtcbiAgICB2YXIgcmVhbExpbmtGbiA9IGxpbmtGblxuICAgIGxpbmtGbiA9IGZ1bmN0aW9uICh2bSwgZWwpIHtcbiAgICAgIGVsLnZhbHVlID0gdm0uJGludGVycG9sYXRlKGVsLnZhbHVlKVxuICAgICAgaWYgKHJlYWxMaW5rRm4pIHJlYWxMaW5rRm4odm0sIGVsKVxuICAgIH1cbiAgICBsaW5rRm4udGVybWluYWwgPSB0cnVlXG4gIH1cbiAgcmV0dXJuIGxpbmtGblxufVxuXG4vKipcbiAqIEJ1aWxkIGEgbXVsdGktZGlyZWN0aXZlIGxpbmsgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtBcnJheX0gZGlyZWN0aXZlc1xuICogQHJldHVybiB7RnVuY3Rpb259IGRpcmVjdGl2ZXNMaW5rRm5cbiAqL1xuXG5mdW5jdGlvbiBtYWtlRGlyZWN0aXZlc0xpbmtGbiAoZGlyZWN0aXZlcykge1xuICByZXR1cm4gZnVuY3Rpb24gZGlyZWN0aXZlc0xpbmtGbiAodm0sIGVsKSB7XG4gICAgLy8gcmV2ZXJzZSBhcHBseSBiZWNhdXNlIGl0J3Mgc29ydGVkIGxvdyB0byBoaWdoXG4gICAgdmFyIGkgPSBkaXJlY3RpdmVzLmxlbmd0aFxuICAgIHZhciBkaXIsIGosIGtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBkaXIgPSBkaXJlY3RpdmVzW2ldXG4gICAgICBpZiAoZGlyLl9saW5rKSB7XG4gICAgICAgIC8vIGN1c3RvbSBsaW5rIGZuXG4gICAgICAgIGRpci5fbGluayh2bSwgZWwpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBrID0gZGlyLmRlc2NyaXB0b3JzLmxlbmd0aFxuICAgICAgICBmb3IgKGogPSAwOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgdm0uX2JpbmREaXIoZGlyLm5hbWUsIGVsLFxuICAgICAgICAgICAgICAgICAgICAgIGRpci5kZXNjcmlwdG9yc1tqXSwgZGlyLmRlZilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENvbXBpbGUgYSB0ZXh0Tm9kZSBhbmQgcmV0dXJuIGEgbm9kZUxpbmtGbi5cbiAqXG4gKiBAcGFyYW0ge1RleHROb2RlfSBub2RlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7RnVuY3Rpb258bnVsbH0gdGV4dE5vZGVMaW5rRm5cbiAqL1xuXG5mdW5jdGlvbiBjb21waWxlVGV4dE5vZGUgKG5vZGUsIG9wdGlvbnMpIHtcbiAgdmFyIHRva2VucyA9IHRleHRQYXJzZXIucGFyc2Uobm9kZS5ub2RlVmFsdWUpXG4gIGlmICghdG9rZW5zKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuICB2YXIgZWwsIHRva2VuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdG9rZW5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHRva2VuID0gdG9rZW5zW2ldXG4gICAgZWwgPSB0b2tlbi50YWdcbiAgICAgID8gcHJvY2Vzc1RleHRUb2tlbih0b2tlbiwgb3B0aW9ucylcbiAgICAgIDogZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodG9rZW4udmFsdWUpXG4gICAgZnJhZy5hcHBlbmRDaGlsZChlbClcbiAgfVxuICByZXR1cm4gbWFrZVRleHROb2RlTGlua0ZuKHRva2VucywgZnJhZywgb3B0aW9ucylcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGEgc2luZ2xlIHRleHQgdG9rZW4uXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRva2VuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuXG5mdW5jdGlvbiBwcm9jZXNzVGV4dFRva2VuICh0b2tlbiwgb3B0aW9ucykge1xuICB2YXIgZWxcbiAgaWYgKHRva2VuLm9uZVRpbWUpIHtcbiAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRva2VuLnZhbHVlKVxuICB9IGVsc2Uge1xuICAgIGlmICh0b2tlbi5odG1sKSB7XG4gICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ3YtaHRtbCcpXG4gICAgICBzZXRUb2tlblR5cGUoJ2h0bWwnKVxuICAgIH0gZWxzZSBpZiAodG9rZW4ucGFydGlhbCkge1xuICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVDb21tZW50KCd2LXBhcnRpYWwnKVxuICAgICAgc2V0VG9rZW5UeXBlKCdwYXJ0aWFsJylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSUUgd2lsbCBjbGVhbiB1cCBlbXB0eSB0ZXh0Tm9kZXMgZHVyaW5nXG4gICAgICAvLyBmcmFnLmNsb25lTm9kZSh0cnVlKSwgc28gd2UgaGF2ZSB0byBnaXZlIGl0XG4gICAgICAvLyBzb21ldGhpbmcgaGVyZS4uLlxuICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnICcpXG4gICAgICBzZXRUb2tlblR5cGUoJ3RleHQnKVxuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBzZXRUb2tlblR5cGUgKHR5cGUpIHtcbiAgICB0b2tlbi50eXBlID0gdHlwZVxuICAgIHRva2VuLmRlZiA9IG9wdGlvbnMuZGlyZWN0aXZlc1t0eXBlXVxuICAgIHRva2VuLmRlc2NyaXB0b3IgPSBkaXJQYXJzZXIucGFyc2UodG9rZW4udmFsdWUpWzBdXG4gIH1cbiAgcmV0dXJuIGVsXG59XG5cbi8qKlxuICogQnVpbGQgYSBmdW5jdGlvbiB0aGF0IHByb2Nlc3NlcyBhIHRleHROb2RlLlxuICpcbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gdG9rZW5zXG4gKiBAcGFyYW0ge0RvY3VtZW50RnJhZ21lbnR9IGZyYWdcbiAqL1xuXG5mdW5jdGlvbiBtYWtlVGV4dE5vZGVMaW5rRm4gKHRva2VucywgZnJhZykge1xuICByZXR1cm4gZnVuY3Rpb24gdGV4dE5vZGVMaW5rRm4gKHZtLCBlbCkge1xuICAgIHZhciBmcmFnQ2xvbmUgPSBmcmFnLmNsb25lTm9kZSh0cnVlKVxuICAgIHZhciBjaGlsZE5vZGVzID0gXy50b0FycmF5KGZyYWdDbG9uZS5jaGlsZE5vZGVzKVxuICAgIHZhciB0b2tlbiwgdmFsdWUsIG5vZGVcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRva2Vucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRva2VuID0gdG9rZW5zW2ldXG4gICAgICB2YWx1ZSA9IHRva2VuLnZhbHVlXG4gICAgICBpZiAodG9rZW4udGFnKSB7XG4gICAgICAgIG5vZGUgPSBjaGlsZE5vZGVzW2ldXG4gICAgICAgIGlmICh0b2tlbi5vbmVUaW1lKSB7XG4gICAgICAgICAgdmFsdWUgPSB2bS4kZXZhbCh2YWx1ZSlcbiAgICAgICAgICBpZiAodG9rZW4uaHRtbCkge1xuICAgICAgICAgICAgXy5yZXBsYWNlKG5vZGUsIHRlbXBsYXRlUGFyc2VyLnBhcnNlKHZhbHVlLCB0cnVlKSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSB2YWx1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2bS5fYmluZERpcih0b2tlbi50eXBlLCBub2RlLFxuICAgICAgICAgICAgICAgICAgICAgIHRva2VuLmRlc2NyaXB0b3IsIHRva2VuLmRlZilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBfLnJlcGxhY2UoZWwsIGZyYWdDbG9uZSlcbiAgfVxufVxuXG4vKipcbiAqIENvbXBpbGUgYSBub2RlIGxpc3QgYW5kIHJldHVybiBhIGNoaWxkTGlua0ZuLlxuICpcbiAqIEBwYXJhbSB7Tm9kZUxpc3R9IG5vZGVMaXN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7RnVuY3Rpb258dW5kZWZpbmVkfVxuICovXG5cbmZ1bmN0aW9uIGNvbXBpbGVOb2RlTGlzdCAobm9kZUxpc3QsIG9wdGlvbnMpIHtcbiAgdmFyIGxpbmtGbnMgPSBbXVxuICB2YXIgbm9kZUxpbmtGbiwgY2hpbGRMaW5rRm4sIG5vZGVcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2RlTGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBub2RlID0gbm9kZUxpc3RbaV1cbiAgICBub2RlTGlua0ZuID0gY29tcGlsZU5vZGUobm9kZSwgb3B0aW9ucylcbiAgICBjaGlsZExpbmtGbiA9XG4gICAgICAhKG5vZGVMaW5rRm4gJiYgbm9kZUxpbmtGbi50ZXJtaW5hbCkgJiZcbiAgICAgIG5vZGUudGFnTmFtZSAhPT0gJ1NDUklQVCcgJiZcbiAgICAgIG5vZGUuaGFzQ2hpbGROb2RlcygpXG4gICAgICAgID8gY29tcGlsZU5vZGVMaXN0KG5vZGUuY2hpbGROb2Rlcywgb3B0aW9ucylcbiAgICAgICAgOiBudWxsXG4gICAgbGlua0Zucy5wdXNoKG5vZGVMaW5rRm4sIGNoaWxkTGlua0ZuKVxuICB9XG4gIHJldHVybiBsaW5rRm5zLmxlbmd0aFxuICAgID8gbWFrZUNoaWxkTGlua0ZuKGxpbmtGbnMpXG4gICAgOiBudWxsXG59XG5cbi8qKlxuICogTWFrZSBhIGNoaWxkIGxpbmsgZnVuY3Rpb24gZm9yIGEgbm9kZSdzIGNoaWxkTm9kZXMuXG4gKlxuICogQHBhcmFtIHtBcnJheTxGdW5jdGlvbj59IGxpbmtGbnNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBjaGlsZExpbmtGblxuICovXG5cbmZ1bmN0aW9uIG1ha2VDaGlsZExpbmtGbiAobGlua0Zucykge1xuICByZXR1cm4gZnVuY3Rpb24gY2hpbGRMaW5rRm4gKHZtLCBub2Rlcykge1xuICAgIC8vIHN0YWJsaXplIG5vZGVzXG4gICAgbm9kZXMgPSBfLnRvQXJyYXkobm9kZXMpXG4gICAgdmFyIG5vZGUsIG5vZGVMaW5rRm4sIGNoaWxkcmVuTGlua0ZuXG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSAwLCBsID0gbGlua0Zucy5sZW5ndGg7IGkgPCBsOyBuKyspIHtcbiAgICAgIG5vZGUgPSBub2Rlc1tuXVxuICAgICAgbm9kZUxpbmtGbiA9IGxpbmtGbnNbaSsrXVxuICAgICAgY2hpbGRyZW5MaW5rRm4gPSBsaW5rRm5zW2krK11cbiAgICAgIGlmIChub2RlTGlua0ZuKSB7XG4gICAgICAgIG5vZGVMaW5rRm4odm0sIG5vZGUpXG4gICAgICB9XG4gICAgICBpZiAoY2hpbGRyZW5MaW5rRm4pIHtcbiAgICAgICAgY2hpbGRyZW5MaW5rRm4odm0sIG5vZGUuY2hpbGROb2RlcylcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDb21waWxlIHBhcmFtIGF0dHJpYnV0ZXMgb24gYSByb290IGVsZW1lbnQgYW5kIHJldHVyblxuICogYSBwYXJhbUF0dHJpYnV0ZXMgbGluayBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge0FycmF5fSBhdHRyc1xuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBwYXJhbXNMaW5rRm5cbiAqL1xuXG5mdW5jdGlvbiBjb21waWxlUGFyYW1BdHRyaWJ1dGVzIChlbCwgYXR0cnMsIG9wdGlvbnMpIHtcbiAgdmFyIHBhcmFtcyA9IFtdXG4gIHZhciBpID0gYXR0cnMubGVuZ3RoXG4gIHZhciBuYW1lLCB2YWx1ZSwgcGFyYW1cbiAgd2hpbGUgKGktLSkge1xuICAgIG5hbWUgPSBhdHRyc1tpXVxuICAgIHZhbHVlID0gZWwuZ2V0QXR0cmlidXRlKG5hbWUpXG4gICAgaWYgKHZhbHVlICE9PSBudWxsKSB7XG4gICAgICBwYXJhbSA9IHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICB9XG4gICAgICB2YXIgdG9rZW5zID0gdGV4dFBhcnNlci5wYXJzZSh2YWx1ZSlcbiAgICAgIGlmICh0b2tlbnMpIHtcbiAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpXG4gICAgICAgIGlmICh0b2tlbnMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIF8ud2FybihcbiAgICAgICAgICAgICdJbnZhbGlkIHBhcmFtIGF0dHJpYnV0ZSBiaW5kaW5nOiBcIicgK1xuICAgICAgICAgICAgbmFtZSArICc9XCInICsgdmFsdWUgKyAnXCInICtcbiAgICAgICAgICAgICdcXG5Eb25cXCd0IG1peCBiaW5kaW5nIHRhZ3Mgd2l0aCBwbGFpbiB0ZXh0ICcgK1xuICAgICAgICAgICAgJ2luIHBhcmFtIGF0dHJpYnV0ZSBiaW5kaW5ncy4nXG4gICAgICAgICAgKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyYW0uZHluYW1pYyA9IHRydWVcbiAgICAgICAgICBwYXJhbS52YWx1ZSA9IHRva2Vuc1swXS52YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBwYXJhbXMucHVzaChwYXJhbSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1ha2VQYXJhbXNMaW5rRm4ocGFyYW1zLCBvcHRpb25zKVxufVxuXG4vKipcbiAqIEJ1aWxkIGEgZnVuY3Rpb24gdGhhdCBhcHBsaWVzIHBhcmFtIGF0dHJpYnV0ZXMgdG8gYSB2bS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBwYXJhbXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gcGFyYW1zTGlua0ZuXG4gKi9cblxudmFyIGRhdGFBdHRyUkUgPSAvXmRhdGEtL1xuXG5mdW5jdGlvbiBtYWtlUGFyYW1zTGlua0ZuIChwYXJhbXMsIG9wdGlvbnMpIHtcbiAgdmFyIGRlZiA9IG9wdGlvbnMuZGlyZWN0aXZlc1snd2l0aCddXG4gIHJldHVybiBmdW5jdGlvbiBwYXJhbXNMaW5rRm4gKHZtLCBlbCkge1xuICAgIHZhciBpID0gcGFyYW1zLmxlbmd0aFxuICAgIHZhciBwYXJhbSwgcGF0aFxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHBhcmFtID0gcGFyYW1zW2ldXG4gICAgICAvLyBwYXJhbXMgY291bGQgY29udGFpbiBkYXNoZXMsIHdoaWNoIHdpbGwgYmVcbiAgICAgIC8vIGludGVycHJldGVkIGFzIG1pbnVzIGNhbGN1bGF0aW9ucyBieSB0aGUgcGFyc2VyXG4gICAgICAvLyBzbyB3ZSBuZWVkIHRvIHdyYXAgdGhlIHBhdGggaGVyZVxuICAgICAgcGF0aCA9IF8uY2FtZWxpemUocGFyYW0ubmFtZS5yZXBsYWNlKGRhdGFBdHRyUkUsICcnKSlcbiAgICAgIGlmIChwYXJhbS5keW5hbWljKSB7XG4gICAgICAgIC8vIGR5bmFtaWMgcGFyYW0gYXR0cmlidHVlcyBhcmUgYm91bmQgYXMgdi13aXRoLlxuICAgICAgICAvLyB3ZSBjYW4gZGlyZWN0bHkgZHVjayB0aGUgZGVzY3JpcHRvciBoZXJlIGJlYWN1c2VcbiAgICAgICAgLy8gcGFyYW0gYXR0cmlidXRlcyBjYW5ub3QgdXNlIGV4cHJlc3Npb25zIG9yXG4gICAgICAgIC8vIGZpbHRlcnMuXG4gICAgICAgIHZtLl9iaW5kRGlyKCd3aXRoJywgZWwsIHtcbiAgICAgICAgICBhcmc6IHBhdGgsXG4gICAgICAgICAgZXhwcmVzc2lvbjogcGFyYW0udmFsdWVcbiAgICAgICAgfSwgZGVmKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8ganVzdCBzZXQgb25jZVxuICAgICAgICB2bS4kc2V0KHBhdGgsIHBhcmFtLnZhbHVlKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENoZWNrIGFuIGVsZW1lbnQgZm9yIHRlcm1pbmFsIGRpcmVjdGl2ZXMgaW4gZml4ZWQgb3JkZXIuXG4gKiBJZiBpdCBmaW5kcyBvbmUsIHJldHVybiBhIHRlcm1pbmFsIGxpbmsgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSB0ZXJtaW5hbExpbmtGblxuICovXG5cbnZhciB0ZXJtaW5hbERpcmVjdGl2ZXMgPSBbXG4gICdyZXBlYXQnLFxuICAnaWYnLFxuICAnY29tcG9uZW50J1xuXVxuXG5mdW5jdGlvbiBza2lwICgpIHt9XG5za2lwLnRlcm1pbmFsID0gdHJ1ZVxuXG5mdW5jdGlvbiBjaGVja1Rlcm1pbmFsRGlyZWN0aXZlcyAoZWwsIG9wdGlvbnMpIHtcbiAgaWYgKF8uYXR0cihlbCwgJ3ByZScpICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIHNraXBcbiAgfVxuICB2YXIgdmFsdWUsIGRpck5hbWVcbiAgLyoganNoaW50IGJvc3M6IHRydWUgKi9cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICBkaXJOYW1lID0gdGVybWluYWxEaXJlY3RpdmVzW2ldXG4gICAgaWYgKHZhbHVlID0gXy5hdHRyKGVsLCBkaXJOYW1lKSkge1xuICAgICAgcmV0dXJuIG1ha2VUZXJpbWluYWxMaW5rRm4oZWwsIGRpck5hbWUsIHZhbHVlLCBvcHRpb25zKVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEJ1aWxkIGEgbGluayBmdW5jdGlvbiBmb3IgYSB0ZXJtaW5hbCBkaXJlY3RpdmUuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtTdHJpbmd9IGRpck5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSB0ZXJtaW5hbExpbmtGblxuICovXG5cbmZ1bmN0aW9uIG1ha2VUZXJpbWluYWxMaW5rRm4gKGVsLCBkaXJOYW1lLCB2YWx1ZSwgb3B0aW9ucykge1xuICB2YXIgZGVzY3JpcHRvciA9IGRpclBhcnNlci5wYXJzZSh2YWx1ZSlbMF1cbiAgdmFyIGRlZiA9IG9wdGlvbnMuZGlyZWN0aXZlc1tkaXJOYW1lXVxuICB2YXIgdGVybWluYWxMaW5rRm4gPSBmdW5jdGlvbiAodm0sIGVsKSB7XG4gICAgdm0uX2JpbmREaXIoZGlyTmFtZSwgZWwsIGRlc2NyaXB0b3IsIGRlZilcbiAgfVxuICB0ZXJtaW5hbExpbmtGbi50ZXJtaW5hbCA9IHRydWVcbiAgcmV0dXJuIHRlcm1pbmFsTGlua0ZuXG59XG5cbi8qKlxuICogQ29sbGVjdCB0aGUgZGlyZWN0aXZlcyBvbiBhbiBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGFzUGFyZW50XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuXG5mdW5jdGlvbiBjb2xsZWN0RGlyZWN0aXZlcyAoZWwsIG9wdGlvbnMsIGFzUGFyZW50KSB7XG4gIHZhciBhdHRycyA9IF8udG9BcnJheShlbC5hdHRyaWJ1dGVzKVxuICB2YXIgaSA9IGF0dHJzLmxlbmd0aFxuICB2YXIgZGlycyA9IFtdXG4gIHZhciBhdHRyLCBhdHRyTmFtZSwgZGlyLCBkaXJOYW1lLCBkaXJEZWZcbiAgd2hpbGUgKGktLSkge1xuICAgIGF0dHIgPSBhdHRyc1tpXVxuICAgIGF0dHJOYW1lID0gYXR0ci5uYW1lXG4gICAgaWYgKGF0dHJOYW1lLmluZGV4T2YoY29uZmlnLnByZWZpeCkgPT09IDApIHtcbiAgICAgIGRpck5hbWUgPSBhdHRyTmFtZS5zbGljZShjb25maWcucHJlZml4Lmxlbmd0aClcbiAgICAgIGlmIChhc1BhcmVudCAmJlxuICAgICAgICAgIChkaXJOYW1lID09PSAnd2l0aCcgfHxcbiAgICAgICAgICAgZGlyTmFtZSA9PT0gJ2NvbXBvbmVudCcpKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBkaXJEZWYgPSBvcHRpb25zLmRpcmVjdGl2ZXNbZGlyTmFtZV1cbiAgICAgIF8uYXNzZXJ0QXNzZXQoZGlyRGVmLCAnZGlyZWN0aXZlJywgZGlyTmFtZSlcbiAgICAgIGlmIChkaXJEZWYpIHtcbiAgICAgICAgZGlycy5wdXNoKHtcbiAgICAgICAgICBuYW1lOiBkaXJOYW1lLFxuICAgICAgICAgIGRlc2NyaXB0b3JzOiBkaXJQYXJzZXIucGFyc2UoYXR0ci52YWx1ZSksXG4gICAgICAgICAgZGVmOiBkaXJEZWZcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbmZpZy5pbnRlcnBvbGF0ZSkge1xuICAgICAgZGlyID0gY29sbGVjdEF0dHJEaXJlY3RpdmUoZWwsIGF0dHJOYW1lLCBhdHRyLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucylcbiAgICAgIGlmIChkaXIpIHtcbiAgICAgICAgZGlycy5wdXNoKGRpcilcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gc29ydCBieSBwcmlvcml0eSwgTE9XIHRvIEhJR0hcbiAgZGlycy5zb3J0KGRpcmVjdGl2ZUNvbXBhcmF0b3IpXG4gIHJldHVybiBkaXJzXG59XG5cbi8qKlxuICogQ2hlY2sgYW4gYXR0cmlidXRlIGZvciBwb3RlbnRpYWwgZHluYW1pYyBiaW5kaW5ncyxcbiAqIGFuZCByZXR1cm4gYSBkaXJlY3RpdmUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gY29sbGVjdEF0dHJEaXJlY3RpdmUgKGVsLCBuYW1lLCB2YWx1ZSwgb3B0aW9ucykge1xuICBpZiAob3B0aW9ucy5fc2tpcEF0dHJzICYmXG4gICAgICBvcHRpb25zLl9za2lwQXR0cnMuaW5kZXhPZihuYW1lKSA+IC0xKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgdmFyIHRva2VucyA9IHRleHRQYXJzZXIucGFyc2UodmFsdWUpXG4gIGlmICh0b2tlbnMpIHtcbiAgICB2YXIgZGVmID0gb3B0aW9ucy5kaXJlY3RpdmVzLmF0dHJcbiAgICB2YXIgaSA9IHRva2Vucy5sZW5ndGhcbiAgICB2YXIgYWxsT25lVGltZSA9IHRydWVcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgdG9rZW4gPSB0b2tlbnNbaV1cbiAgICAgIGlmICh0b2tlbi50YWcgJiYgIXRva2VuLm9uZVRpbWUpIHtcbiAgICAgICAgYWxsT25lVGltZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBkZWY6IGRlZixcbiAgICAgIF9saW5rOiBhbGxPbmVUaW1lXG4gICAgICAgID8gZnVuY3Rpb24gKHZtLCBlbCkge1xuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZtLiRpbnRlcnBvbGF0ZSh2YWx1ZSkpXG4gICAgICAgICAgfVxuICAgICAgICA6IGZ1bmN0aW9uICh2bSwgZWwpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRleHRQYXJzZXIudG9rZW5zVG9FeHAodG9rZW5zLCB2bSlcbiAgICAgICAgICAgIHZhciBkZXNjID0gZGlyUGFyc2VyLnBhcnNlKG5hbWUgKyAnOicgKyB2YWx1ZSlbMF1cbiAgICAgICAgICAgIHZtLl9iaW5kRGlyKCdhdHRyJywgZWwsIGRlc2MsIGRlZilcbiAgICAgICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRGlyZWN0aXZlIHByaW9yaXR5IHNvcnQgY29tcGFyYXRvclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gKiBAcGFyYW0ge09iamVjdH0gYlxuICovXG5cbmZ1bmN0aW9uIGRpcmVjdGl2ZUNvbXBhcmF0b3IgKGEsIGIpIHtcbiAgYSA9IGEuZGVmLnByaW9yaXR5IHx8IDBcbiAgYiA9IGIuZGVmLnByaW9yaXR5IHx8IDBcbiAgcmV0dXJuIGEgPiBiID8gMSA6IC0xXG59XG59LHtcIi4uL2NvbmZpZ1wiOjEzLFwiLi4vcGFyc2Vycy9kaXJlY3RpdmVcIjo0OCxcIi4uL3BhcnNlcnMvdGVtcGxhdGVcIjo1MSxcIi4uL3BhcnNlcnMvdGV4dFwiOjUyLFwiLi4vdXRpbFwiOjYwfV0sMTI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciB0ZW1wbGF0ZVBhcnNlciA9IHJlcXVpcmUoJy4uL3BhcnNlcnMvdGVtcGxhdGUnKVxuXG4vKipcbiAqIFByb2Nlc3MgYW4gZWxlbWVudCBvciBhIERvY3VtZW50RnJhZ21lbnQgYmFzZWQgb24gYVxuICogaW5zdGFuY2Ugb3B0aW9uIG9iamVjdC4gVGhpcyBhbGxvd3MgdXMgdG8gdHJhbnNjbHVkZVxuICogYSB0ZW1wbGF0ZSBub2RlL2ZyYWdtZW50IGJlZm9yZSB0aGUgaW5zdGFuY2UgaXMgY3JlYXRlZCxcbiAqIHNvIHRoZSBwcm9jZXNzZWQgZnJhZ21lbnQgY2FuIHRoZW4gYmUgY2xvbmVkIGFuZCByZXVzZWRcbiAqIGluIHYtcmVwZWF0LlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0cmFuc2NsdWRlIChlbCwgb3B0aW9ucykge1xuICAvLyBmb3IgdGVtcGxhdGUgdGFncywgd2hhdCB3ZSB3YW50IGlzIGl0cyBjb250ZW50IGFzXG4gIC8vIGEgZG9jdW1lbnRGcmFnbWVudCAoZm9yIGJsb2NrIGluc3RhbmNlcylcbiAgaWYgKGVsLnRhZ05hbWUgPT09ICdURU1QTEFURScpIHtcbiAgICBlbCA9IHRlbXBsYXRlUGFyc2VyLnBhcnNlKGVsKVxuICB9XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMudGVtcGxhdGUpIHtcbiAgICBlbCA9IHRyYW5zY2x1ZGVUZW1wbGF0ZShlbCwgb3B0aW9ucylcbiAgfVxuICBpZiAoZWwgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgXy5wcmVwZW5kKGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ3Ytc3RhcnQnKSwgZWwpXG4gICAgZWwuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgndi1lbmQnKSlcbiAgfVxuICByZXR1cm4gZWxcbn1cblxuLyoqXG4gKiBQcm9jZXNzIHRoZSB0ZW1wbGF0ZSBvcHRpb24uXG4gKiBJZiB0aGUgcmVwbGFjZSBvcHRpb24gaXMgdHJ1ZSB0aGlzIHdpbGwgc3dhcCB0aGUgJGVsLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9XG4gKi9cblxuZnVuY3Rpb24gdHJhbnNjbHVkZVRlbXBsYXRlIChlbCwgb3B0aW9ucykge1xuICB2YXIgdGVtcGxhdGUgPSBvcHRpb25zLnRlbXBsYXRlXG4gIHZhciBmcmFnID0gdGVtcGxhdGVQYXJzZXIucGFyc2UodGVtcGxhdGUsIHRydWUpXG4gIGlmICghZnJhZykge1xuICAgIF8ud2FybignSW52YWxpZCB0ZW1wbGF0ZSBvcHRpb246ICcgKyB0ZW1wbGF0ZSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgcmF3Q29udGVudCA9IG9wdGlvbnMuX2NvbnRlbnQgfHwgXy5leHRyYWN0Q29udGVudChlbClcbiAgICBpZiAob3B0aW9ucy5yZXBsYWNlKSB7XG4gICAgICBpZiAoZnJhZy5jaGlsZE5vZGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdHJhbnNjbHVkZUNvbnRlbnQoZnJhZywgcmF3Q29udGVudClcbiAgICAgICAgcmV0dXJuIGZyYWdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciByZXBsYWNlciA9IGZyYWcuZmlyc3RDaGlsZFxuICAgICAgICBfLmNvcHlBdHRyaWJ1dGVzKGVsLCByZXBsYWNlcilcbiAgICAgICAgdHJhbnNjbHVkZUNvbnRlbnQocmVwbGFjZXIsIHJhd0NvbnRlbnQpXG4gICAgICAgIHJldHVybiByZXBsYWNlclxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlbC5hcHBlbmRDaGlsZChmcmFnKVxuICAgICAgdHJhbnNjbHVkZUNvbnRlbnQoZWwsIHJhd0NvbnRlbnQpXG4gICAgICByZXR1cm4gZWxcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIDxjb250ZW50PiBpbnNlcnRpb24gcG9pbnRzIG1pbWlja2luZyB0aGUgYmVoYXZpb3JcbiAqIG9mIHRoZSBTaGFkb3cgRE9NIHNwZWM6XG4gKlxuICogICBodHRwOi8vdzNjLmdpdGh1Yi5pby93ZWJjb21wb25lbnRzL3NwZWMvc2hhZG93LyNpbnNlcnRpb24tcG9pbnRzXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9IGVsXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHJhd1xuICovXG5cbmZ1bmN0aW9uIHRyYW5zY2x1ZGVDb250ZW50IChlbCwgcmF3KSB7XG4gIHZhciBvdXRsZXRzID0gZ2V0T3V0bGV0cyhlbClcbiAgdmFyIGkgPSBvdXRsZXRzLmxlbmd0aFxuICBpZiAoIWkpIHJldHVyblxuICB2YXIgb3V0bGV0LCBzZWxlY3QsIHNlbGVjdGVkLCBqLCBtYWluXG4gIC8vIGZpcnN0IHBhc3MsIGNvbGxlY3QgY29ycmVzcG9uZGluZyBjb250ZW50XG4gIC8vIGZvciBlYWNoIG91dGxldC5cbiAgd2hpbGUgKGktLSkge1xuICAgIG91dGxldCA9IG91dGxldHNbaV1cbiAgICBpZiAocmF3KSB7XG4gICAgICBzZWxlY3QgPSBvdXRsZXQuZ2V0QXR0cmlidXRlKCdzZWxlY3QnKVxuICAgICAgaWYgKHNlbGVjdCkgeyAgLy8gc2VsZWN0IGNvbnRlbnRcbiAgICAgICAgc2VsZWN0ZWQgPSByYXcucXVlcnlTZWxlY3RvckFsbChzZWxlY3QpXG4gICAgICAgIG91dGxldC5jb250ZW50ID0gXy50b0FycmF5KFxuICAgICAgICAgIHNlbGVjdGVkLmxlbmd0aFxuICAgICAgICAgICAgPyBzZWxlY3RlZFxuICAgICAgICAgICAgOiBvdXRsZXQuY2hpbGROb2Rlc1xuICAgICAgICApXG4gICAgICB9IGVsc2UgeyAvLyBkZWZhdWx0IGNvbnRlbnRcbiAgICAgICAgbWFpbiA9IG91dGxldFxuICAgICAgfVxuICAgIH0gZWxzZSB7IC8vIGZhbGxiYWNrIGNvbnRlbnRcbiAgICAgIG91dGxldC5jb250ZW50ID0gXy50b0FycmF5KG91dGxldC5jaGlsZE5vZGVzKVxuICAgIH1cbiAgfVxuICAvLyBzZWNvbmQgcGFzcywgYWN0dWFsbHkgaW5zZXJ0IHRoZSBjb250ZW50c1xuICBmb3IgKGkgPSAwLCBqID0gb3V0bGV0cy5sZW5ndGg7IGkgPCBqOyBpKyspIHtcbiAgICBvdXRsZXQgPSBvdXRsZXRzW2ldXG4gICAgaWYgKG91dGxldCAhPT0gbWFpbikge1xuICAgICAgaW5zZXJ0Q29udGVudEF0KG91dGxldCwgb3V0bGV0LmNvbnRlbnQpXG4gICAgfVxuICB9XG4gIC8vIGZpbmFsbHkgaW5zZXJ0IHRoZSBtYWluIGNvbnRlbnRcbiAgaWYgKG1haW4pIHtcbiAgICBpbnNlcnRDb250ZW50QXQobWFpbiwgXy50b0FycmF5KHJhdy5jaGlsZE5vZGVzKSlcbiAgfVxufVxuXG4vKipcbiAqIEdldCA8Y29udGVudD4gb3V0bGV0cyBmcm9tIHRoZSBlbGVtZW50L2xpc3RcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR8QXJyYXl9IGVsXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuXG52YXIgY29uY2F0ID0gW10uY29uY2F0XG5mdW5jdGlvbiBnZXRPdXRsZXRzIChlbCkge1xuICByZXR1cm4gXy5pc0FycmF5KGVsKVxuICAgID8gY29uY2F0LmFwcGx5KFtdLCBlbC5tYXAoZ2V0T3V0bGV0cykpXG4gICAgOiBlbC5xdWVyeVNlbGVjdG9yQWxsXG4gICAgICA/IF8udG9BcnJheShlbC5xdWVyeVNlbGVjdG9yQWxsKCdjb250ZW50JykpXG4gICAgICA6IFtdXG59XG5cbi8qKlxuICogSW5zZXJ0IGFuIGFycmF5IG9mIG5vZGVzIGF0IG91dGxldCxcbiAqIHRoZW4gcmVtb3ZlIHRoZSBvdXRsZXQuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBvdXRsZXRcbiAqIEBwYXJhbSB7QXJyYXl9IGNvbnRlbnRzXG4gKi9cblxuZnVuY3Rpb24gaW5zZXJ0Q29udGVudEF0IChvdXRsZXQsIGNvbnRlbnRzKSB7XG4gIC8vIG5vdCB1c2luZyB1dGlsIERPTSBtZXRob2RzIGhlcmUgYmVjYXVzZVxuICAvLyBwYXJlbnROb2RlIGNhbiBiZSBjYWNoZWRcbiAgdmFyIHBhcmVudCA9IG91dGxldC5wYXJlbnROb2RlXG4gIGZvciAodmFyIGkgPSAwLCBqID0gY29udGVudHMubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG4gICAgcGFyZW50Lmluc2VydEJlZm9yZShjb250ZW50c1tpXSwgb3V0bGV0KVxuICB9XG4gIHBhcmVudC5yZW1vdmVDaGlsZChvdXRsZXQpXG59XG59LHtcIi4uL3BhcnNlcnMvdGVtcGxhdGVcIjo1MSxcIi4uL3V0aWxcIjo2MH1dLDEzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBUaGUgcHJlZml4IHRvIGxvb2sgZm9yIHdoZW4gcGFyc2luZyBkaXJlY3RpdmVzLlxuICAgKlxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKi9cblxuICBwcmVmaXg6ICd2LScsXG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcHJpbnQgZGVidWcgbWVzc2FnZXMuXG4gICAqIEFsc28gZW5hYmxlcyBzdGFjayB0cmFjZSBmb3Igd2FybmluZ3MuXG4gICAqXG4gICAqIEB0eXBlIHtCb29sZWFufVxuICAgKi9cblxuICBkZWJ1ZzogZmFsc2UsXG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gc3VwcHJlc3Mgd2FybmluZ3MuXG4gICAqXG4gICAqIEB0eXBlIHtCb29sZWFufVxuICAgKi9cblxuICBzaWxlbnQ6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGFsbG93IG9ic2VydmVyIHRvIGFsdGVyIGRhdGEgb2JqZWN0cydcbiAgICogX19wcm90b19fLlxuICAgKlxuICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICovXG5cbiAgcHJvdG86IHRydWUsXG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcGFyc2UgbXVzdGFjaGUgdGFncyBpbiB0ZW1wbGF0ZXMuXG4gICAqXG4gICAqIEB0eXBlIHtCb29sZWFufVxuICAgKi9cblxuICBpbnRlcnBvbGF0ZTogdHJ1ZSxcblxuICAvKipcbiAgICogV2hldGhlciB0byB1c2UgYXN5bmMgcmVuZGVyaW5nLlxuICAgKi9cblxuICBhc3luYzogdHJ1ZSxcblxuICAvKipcbiAgICogSW50ZXJuYWwgZmxhZyB0byBpbmRpY2F0ZSB0aGUgZGVsaW1pdGVycyBoYXZlIGJlZW5cbiAgICogY2hhbmdlZC5cbiAgICpcbiAgICogQHR5cGUge0Jvb2xlYW59XG4gICAqL1xuXG4gIF9kZWxpbWl0ZXJzQ2hhbmdlZDogdHJ1ZVxuXG59XG5cbi8qKlxuICogSW50ZXJwb2xhdGlvbiBkZWxpbWl0ZXJzLlxuICogV2UgbmVlZCB0byBtYXJrIHRoZSBjaGFuZ2VkIGZsYWcgc28gdGhhdCB0aGUgdGV4dCBwYXJzZXJcbiAqIGtub3dzIGl0IG5lZWRzIHRvIHJlY29tcGlsZSB0aGUgcmVnZXguXG4gKlxuICogQHR5cGUge0FycmF5PFN0cmluZz59XG4gKi9cblxudmFyIGRlbGltaXRlcnMgPSBbJ3t7JywgJ319J11cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2R1bGUuZXhwb3J0cywgJ2RlbGltaXRlcnMnLCB7XG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBkZWxpbWl0ZXJzXG4gIH0sXG4gIHNldDogZnVuY3Rpb24gKHZhbCkge1xuICAgIGRlbGltaXRlcnMgPSB2YWxcbiAgICB0aGlzLl9kZWxpbWl0ZXJzQ2hhbmdlZCA9IHRydWVcbiAgfVxufSlcbn0se31dLDE0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBfID0gcmVxdWlyZSgnLi91dGlsJylcbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpXG52YXIgV2F0Y2hlciA9IHJlcXVpcmUoJy4vd2F0Y2hlcicpXG52YXIgdGV4dFBhcnNlciA9IHJlcXVpcmUoJy4vcGFyc2Vycy90ZXh0JylcbnZhciBleHBQYXJzZXIgPSByZXF1aXJlKCcuL3BhcnNlcnMvZXhwcmVzc2lvbicpXG5cbi8qKlxuICogQSBkaXJlY3RpdmUgbGlua3MgYSBET00gZWxlbWVudCB3aXRoIGEgcGllY2Ugb2YgZGF0YSxcbiAqIHdoaWNoIGlzIHRoZSByZXN1bHQgb2YgZXZhbHVhdGluZyBhbiBleHByZXNzaW9uLlxuICogSXQgcmVnaXN0ZXJzIGEgd2F0Y2hlciB3aXRoIHRoZSBleHByZXNzaW9uIGFuZCBjYWxsc1xuICogdGhlIERPTSB1cGRhdGUgZnVuY3Rpb24gd2hlbiBhIGNoYW5nZSBpcyB0cmlnZ2VyZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtPYmplY3R9IGRlc2NyaXB0b3JcbiAqICAgICAgICAgICAgICAgICAtIHtTdHJpbmd9IGV4cHJlc3Npb25cbiAqICAgICAgICAgICAgICAgICAtIHtTdHJpbmd9IFthcmddXG4gKiAgICAgICAgICAgICAgICAgLSB7QXJyYXk8T2JqZWN0Pn0gW2ZpbHRlcnNdXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmIC0gZGlyZWN0aXZlIGRlZmluaXRpb24gb2JqZWN0XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG5mdW5jdGlvbiBEaXJlY3RpdmUgKG5hbWUsIGVsLCB2bSwgZGVzY3JpcHRvciwgZGVmKSB7XG4gIC8vIHB1YmxpY1xuICB0aGlzLm5hbWUgPSBuYW1lXG4gIHRoaXMuZWwgPSBlbFxuICB0aGlzLnZtID0gdm1cbiAgLy8gY29weSBkZXNjcmlwdG9yIHByb3BzXG4gIHRoaXMucmF3ID0gZGVzY3JpcHRvci5yYXdcbiAgdGhpcy5leHByZXNzaW9uID0gZGVzY3JpcHRvci5leHByZXNzaW9uXG4gIHRoaXMuYXJnID0gZGVzY3JpcHRvci5hcmdcbiAgdGhpcy5maWx0ZXJzID0gXy5yZXNvbHZlRmlsdGVycyh2bSwgZGVzY3JpcHRvci5maWx0ZXJzKVxuICAvLyBwcml2YXRlXG4gIHRoaXMuX2xvY2tlZCA9IGZhbHNlXG4gIHRoaXMuX2JvdW5kID0gZmFsc2VcbiAgLy8gaW5pdFxuICB0aGlzLl9iaW5kKGRlZilcbn1cblxudmFyIHAgPSBEaXJlY3RpdmUucHJvdG90eXBlXG5cbi8qKlxuICogSW5pdGlhbGl6ZSB0aGUgZGlyZWN0aXZlLCBtaXhpbiBkZWZpbml0aW9uIHByb3BlcnRpZXMsXG4gKiBzZXR1cCB0aGUgd2F0Y2hlciwgY2FsbCBkZWZpbml0aW9uIGJpbmQoKSBhbmQgdXBkYXRlKClcbiAqIGlmIHByZXNlbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRlZlxuICovXG5cbnAuX2JpbmQgPSBmdW5jdGlvbiAoZGVmKSB7XG4gIGlmICh0aGlzLm5hbWUgIT09ICdjbG9haycgJiYgdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUpIHtcbiAgICB0aGlzLmVsLnJlbW92ZUF0dHJpYnV0ZShjb25maWcucHJlZml4ICsgdGhpcy5uYW1lKVxuICB9XG4gIGlmICh0eXBlb2YgZGVmID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy51cGRhdGUgPSBkZWZcbiAgfSBlbHNlIHtcbiAgICBfLmV4dGVuZCh0aGlzLCBkZWYpXG4gIH1cbiAgdGhpcy5fd2F0Y2hlckV4cCA9IHRoaXMuZXhwcmVzc2lvblxuICB0aGlzLl9jaGVja0R5bmFtaWNMaXRlcmFsKClcbiAgaWYgKHRoaXMuYmluZCkge1xuICAgIHRoaXMuYmluZCgpXG4gIH1cbiAgaWYgKFxuICAgIHRoaXMudXBkYXRlICYmIHRoaXMuX3dhdGNoZXJFeHAgJiZcbiAgICAoIXRoaXMuaXNMaXRlcmFsIHx8IHRoaXMuX2lzRHluYW1pY0xpdGVyYWwpICYmXG4gICAgIXRoaXMuX2NoZWNrU3RhdGVtZW50KClcbiAgKSB7XG4gICAgLy8gd3JhcHBlZCB1cGRhdGVyIGZvciBjb250ZXh0XG4gICAgdmFyIGRpciA9IHRoaXNcbiAgICB2YXIgdXBkYXRlID0gdGhpcy5fdXBkYXRlID0gZnVuY3Rpb24gKHZhbCwgb2xkVmFsKSB7XG4gICAgICBpZiAoIWRpci5fbG9ja2VkKSB7XG4gICAgICAgIGRpci51cGRhdGUodmFsLCBvbGRWYWwpXG4gICAgICB9XG4gICAgfVxuICAgIC8vIHVzZSByYXcgZXhwcmVzc2lvbiBhcyBpZGVudGlmaWVyIGJlY2F1c2UgZmlsdGVyc1xuICAgIC8vIG1ha2UgdGhlbSBkaWZmZXJlbnQgd2F0Y2hlcnNcbiAgICB2YXIgd2F0Y2hlciA9IHRoaXMudm0uX3dhdGNoZXJzW3RoaXMucmF3XVxuICAgIC8vIHYtcmVwZWF0IGFsd2F5cyBjcmVhdGVzIGEgbmV3IHdhdGNoZXIgYmVjYXVzZSBpdCBoYXNcbiAgICAvLyBhIHNwZWNpYWwgZmlsdGVyIHRoYXQncyBib3VuZCB0byBpdHMgZGlyZWN0aXZlXG4gICAgLy8gaW5zdGFuY2UuXG4gICAgaWYgKCF3YXRjaGVyIHx8IHRoaXMubmFtZSA9PT0gJ3JlcGVhdCcpIHtcbiAgICAgIHdhdGNoZXIgPSB0aGlzLnZtLl93YXRjaGVyc1t0aGlzLnJhd10gPSBuZXcgV2F0Y2hlcihcbiAgICAgICAgdGhpcy52bSxcbiAgICAgICAgdGhpcy5fd2F0Y2hlckV4cCxcbiAgICAgICAgdXBkYXRlLCAvLyBjYWxsYmFja1xuICAgICAgICB7XG4gICAgICAgICAgZmlsdGVyczogdGhpcy5maWx0ZXJzLFxuICAgICAgICAgIHR3b1dheTogdGhpcy50d29XYXksXG4gICAgICAgICAgZGVlcDogdGhpcy5kZWVwXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgd2F0Y2hlci5hZGRDYih1cGRhdGUpXG4gICAgfVxuICAgIHRoaXMuX3dhdGNoZXIgPSB3YXRjaGVyXG4gICAgaWYgKHRoaXMuX2luaXRWYWx1ZSAhPSBudWxsKSB7XG4gICAgICB3YXRjaGVyLnNldCh0aGlzLl9pbml0VmFsdWUpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXBkYXRlKHdhdGNoZXIudmFsdWUpXG4gICAgfVxuICB9XG4gIHRoaXMuX2JvdW5kID0gdHJ1ZVxufVxuXG4vKipcbiAqIGNoZWNrIGlmIHRoaXMgaXMgYSBkeW5hbWljIGxpdGVyYWwgYmluZGluZy5cbiAqXG4gKiBlLmcuIHYtY29tcG9uZW50PVwie3tjdXJyZW50Vmlld319XCJcbiAqL1xuXG5wLl9jaGVja0R5bmFtaWNMaXRlcmFsID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZXhwcmVzc2lvbiA9IHRoaXMuZXhwcmVzc2lvblxuICBpZiAoZXhwcmVzc2lvbiAmJiB0aGlzLmlzTGl0ZXJhbCkge1xuICAgIHZhciB0b2tlbnMgPSB0ZXh0UGFyc2VyLnBhcnNlKGV4cHJlc3Npb24pXG4gICAgaWYgKHRva2Vucykge1xuICAgICAgdmFyIGV4cCA9IHRleHRQYXJzZXIudG9rZW5zVG9FeHAodG9rZW5zKVxuICAgICAgdGhpcy5leHByZXNzaW9uID0gdGhpcy52bS4kZ2V0KGV4cClcbiAgICAgIHRoaXMuX3dhdGNoZXJFeHAgPSBleHBcbiAgICAgIHRoaXMuX2lzRHluYW1pY0xpdGVyYWwgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIGRpcmVjdGl2ZSBpcyBhIGZ1bmN0aW9uIGNhbGxlclxuICogYW5kIGlmIHRoZSBleHByZXNzaW9uIGlzIGEgY2FsbGFibGUgb25lLiBJZiBib3RoIHRydWUsXG4gKiB3ZSB3cmFwIHVwIHRoZSBleHByZXNzaW9uIGFuZCB1c2UgaXQgYXMgdGhlIGV2ZW50XG4gKiBoYW5kbGVyLlxuICpcbiAqIGUuZy4gdi1vbj1cImNsaWNrOiBhKytcIlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblxucC5fY2hlY2tTdGF0ZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBleHByZXNzaW9uID0gdGhpcy5leHByZXNzaW9uXG4gIGlmIChcbiAgICBleHByZXNzaW9uICYmIHRoaXMuYWNjZXB0U3RhdGVtZW50ICYmXG4gICAgIWV4cFBhcnNlci5wYXRoVGVzdFJFLnRlc3QoZXhwcmVzc2lvbilcbiAgKSB7XG4gICAgdmFyIGZuID0gZXhwUGFyc2VyLnBhcnNlKGV4cHJlc3Npb24pLmdldFxuICAgIHZhciB2bSA9IHRoaXMudm1cbiAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGZuLmNhbGwodm0sIHZtKVxuICAgIH1cbiAgICBpZiAodGhpcy5maWx0ZXJzKSB7XG4gICAgICBoYW5kbGVyID0gXy5hcHBseUZpbHRlcnMoXG4gICAgICAgIGhhbmRsZXIsXG4gICAgICAgIHRoaXMuZmlsdGVycy5yZWFkLFxuICAgICAgICB2bVxuICAgICAgKVxuICAgIH1cbiAgICB0aGlzLnVwZGF0ZShoYW5kbGVyKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBmb3IgYW4gYXR0cmlidXRlIGRpcmVjdGl2ZSBwYXJhbSwgZS5nLiBsYXp5XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5wLl9jaGVja1BhcmFtID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgdmFyIHBhcmFtID0gdGhpcy5lbC5nZXRBdHRyaWJ1dGUobmFtZSlcbiAgaWYgKHBhcmFtICE9PSBudWxsKSB7XG4gICAgdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSlcbiAgfVxuICByZXR1cm4gcGFyYW1cbn1cblxuLyoqXG4gKiBUZWFyZG93biB0aGUgd2F0Y2hlciBhbmQgY2FsbCB1bmJpbmQuXG4gKi9cblxucC5fdGVhcmRvd24gPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl9ib3VuZCkge1xuICAgIGlmICh0aGlzLnVuYmluZCkge1xuICAgICAgdGhpcy51bmJpbmQoKVxuICAgIH1cbiAgICB2YXIgd2F0Y2hlciA9IHRoaXMuX3dhdGNoZXJcbiAgICBpZiAod2F0Y2hlciAmJiB3YXRjaGVyLmFjdGl2ZSkge1xuICAgICAgd2F0Y2hlci5yZW1vdmVDYih0aGlzLl91cGRhdGUpXG4gICAgICBpZiAoIXdhdGNoZXIuYWN0aXZlKSB7XG4gICAgICAgIHRoaXMudm0uX3dhdGNoZXJzW3RoaXMucmF3XSA9IG51bGxcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fYm91bmQgPSBmYWxzZVxuICAgIHRoaXMudm0gPSB0aGlzLmVsID0gdGhpcy5fd2F0Y2hlciA9IG51bGxcbiAgfVxufVxuXG4vKipcbiAqIFNldCB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZSB3aXRoIHRoZSBzZXR0ZXIuXG4gKiBUaGlzIHNob3VsZCBvbmx5IGJlIHVzZWQgaW4gdHdvLXdheSBkaXJlY3RpdmVzXG4gKiBlLmcuIHYtbW9kZWwuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHBhcmFtIHtCb29sZWFufSBsb2NrIC0gcHJldmVudCB3cnRpZSB0cmlnZ2VyaW5nIHVwZGF0ZS5cbiAqIEBwdWJsaWNcbiAqL1xuXG5wLnNldCA9IGZ1bmN0aW9uICh2YWx1ZSwgbG9jaykge1xuICBpZiAodGhpcy50d29XYXkpIHtcbiAgICBpZiAobG9jaykge1xuICAgICAgdGhpcy5fbG9ja2VkID0gdHJ1ZVxuICAgIH1cbiAgICB0aGlzLl93YXRjaGVyLnNldCh2YWx1ZSlcbiAgICBpZiAobG9jaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICBfLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fbG9ja2VkID0gZmFsc2VcbiAgICAgIH0pXG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGlyZWN0aXZlXG59LHtcIi4vY29uZmlnXCI6MTMsXCIuL3BhcnNlcnMvZXhwcmVzc2lvblwiOjQ5LFwiLi9wYXJzZXJzL3RleHRcIjo1MixcIi4vdXRpbFwiOjYwLFwiLi93YXRjaGVyXCI6NjR9XSwxNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vLyB4bGlua1xudmFyIHhsaW5rTlMgPSAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaydcbnZhciB4bGlua1JFID0gL154bGluazovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIHByaW9yaXR5OiA4NTAsXG5cbiAgYmluZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBuYW1lID0gdGhpcy5hcmdcbiAgICB0aGlzLnVwZGF0ZSA9IHhsaW5rUkUudGVzdChuYW1lKVxuICAgICAgPyB4bGlua0hhbmRsZXJcbiAgICAgIDogZGVmYXVsdEhhbmRsZXJcbiAgfVxuXG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRIYW5kbGVyICh2YWx1ZSkge1xuICBpZiAodmFsdWUgfHwgdmFsdWUgPT09IDApIHtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSh0aGlzLmFyZywgdmFsdWUpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5hcmcpXG4gIH1cbn1cblxuZnVuY3Rpb24geGxpbmtIYW5kbGVyICh2YWx1ZSkge1xuICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlTlMoeGxpbmtOUywgdGhpcy5hcmcsIHZhbHVlKVxuICB9IGVsc2Uge1xuICAgIHRoaXMuZWwucmVtb3ZlQXR0cmlidXRlTlMoeGxpbmtOUywgJ2hyZWYnKVxuICB9XG59XG59LHt9XSwxNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIGFkZENsYXNzID0gXy5hZGRDbGFzc1xudmFyIHJlbW92ZUNsYXNzID0gXy5yZW1vdmVDbGFzc1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodGhpcy5hcmcpIHtcbiAgICB2YXIgbWV0aG9kID0gdmFsdWUgPyBhZGRDbGFzcyA6IHJlbW92ZUNsYXNzXG4gICAgbWV0aG9kKHRoaXMuZWwsIHRoaXMuYXJnKVxuICB9IGVsc2Uge1xuICAgIGlmICh0aGlzLmxhc3RWYWwpIHtcbiAgICAgIHJlbW92ZUNsYXNzKHRoaXMuZWwsIHRoaXMubGFzdFZhbClcbiAgICB9XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICBhZGRDbGFzcyh0aGlzLmVsLCB2YWx1ZSlcbiAgICAgIHRoaXMubGFzdFZhbCA9IHZhbHVlXG4gICAgfVxuICB9XG59XG59LHtcIi4uL3V0aWxcIjo2MH1dLDE3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVsID0gdGhpcy5lbFxuICAgIHRoaXMudm0uJG9uY2UoJ2hvb2s6Y29tcGlsZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoY29uZmlnLnByZWZpeCArICdjbG9haycpXG4gICAgfSlcbiAgfVxuXG59XG59LHtcIi4uL2NvbmZpZ1wiOjEzfV0sMTg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciB0ZW1wbGF0ZVBhcnNlciA9IHJlcXVpcmUoJy4uL3BhcnNlcnMvdGVtcGxhdGUnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBpc0xpdGVyYWw6IHRydWUsXG5cbiAgLyoqXG4gICAqIFNldHVwLiBUd28gcG9zc2libGUgdXNhZ2VzOlxuICAgKlxuICAgKiAtIHN0YXRpYzpcbiAgICogICB2LWNvbXBvbmVudD1cImNvbXBcIlxuICAgKlxuICAgKiAtIGR5bmFtaWM6XG4gICAqICAgdi1jb21wb25lbnQ9XCJ7e2N1cnJlbnRWaWV3fX1cIlxuICAgKi9cblxuICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmVsLl9fdnVlX18pIHtcbiAgICAgIC8vIGNyZWF0ZSBhIHJlZiBhbmNob3JcbiAgICAgIHRoaXMucmVmID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgndi1jb21wb25lbnQnKVxuICAgICAgXy5yZXBsYWNlKHRoaXMuZWwsIHRoaXMucmVmKVxuICAgICAgLy8gY2hlY2sga2VlcC1hbGl2ZSBvcHRpb25zLlxuICAgICAgLy8gSWYgeWVzLCBpbnN0ZWFkIG9mIGRlc3Ryb3lpbmcgdGhlIGFjdGl2ZSB2bSB3aGVuXG4gICAgICAvLyBoaWRpbmcgKHYtaWYpIG9yIHN3aXRjaGluZyAoZHluYW1pYyBsaXRlcmFsKSBpdCxcbiAgICAgIC8vIHdlIHNpbXBseSByZW1vdmUgaXQgZnJvbSB0aGUgRE9NIGFuZCBzYXZlIGl0IGluIGFcbiAgICAgIC8vIGNhY2hlIG9iamVjdCwgd2l0aCBpdHMgY29uc3RydWN0b3IgaWQgYXMgdGhlIGtleS5cbiAgICAgIHRoaXMua2VlcEFsaXZlID0gdGhpcy5fY2hlY2tQYXJhbSgna2VlcC1hbGl2ZScpICE9IG51bGxcbiAgICAgIGlmICh0aGlzLmtlZXBBbGl2ZSkge1xuICAgICAgICB0aGlzLmNhY2hlID0ge31cbiAgICAgIH1cbiAgICAgIC8vIGlmIHN0YXRpYywgYnVpbGQgcmlnaHQgbm93LlxuICAgICAgaWYgKCF0aGlzLl9pc0R5bmFtaWNMaXRlcmFsKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZUN0b3IodGhpcy5leHByZXNzaW9uKVxuICAgICAgICB0aGlzLmNoaWxkVk0gPSB0aGlzLmJ1aWxkKClcbiAgICAgICAgdGhpcy5jaGlsZFZNLiRiZWZvcmUodGhpcy5yZWYpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjaGVjayBkeW5hbWljIGNvbXBvbmVudCBwYXJhbXNcbiAgICAgICAgdGhpcy5yZWFkeUV2ZW50ID0gdGhpcy5fY2hlY2tQYXJhbSgnd2FpdC1mb3InKVxuICAgICAgICB0aGlzLnRyYW5zTW9kZSA9IHRoaXMuX2NoZWNrUGFyYW0oJ3RyYW5zaXRpb24tbW9kZScpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIF8ud2FybihcbiAgICAgICAgJ3YtY29tcG9uZW50PVwiJyArIHRoaXMuZXhwcmVzc2lvbiArICdcIiBjYW5ub3QgYmUgJyArXG4gICAgICAgICd1c2VkIG9uIGFuIGFscmVhZHkgbW91bnRlZCBpbnN0YW5jZS4nXG4gICAgICApXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIHRoZSBjb21wb25lbnQgY29uc3RydWN0b3IgdG8gdXNlIHdoZW4gY3JlYXRpbmdcbiAgICogdGhlIGNoaWxkIHZtLlxuICAgKi9cblxuICByZXNvbHZlQ3RvcjogZnVuY3Rpb24gKGlkKSB7XG4gICAgdGhpcy5jdG9ySWQgPSBpZFxuICAgIHRoaXMuQ3RvciA9IHRoaXMudm0uJG9wdGlvbnMuY29tcG9uZW50c1tpZF1cbiAgICBfLmFzc2VydEFzc2V0KHRoaXMuQ3RvciwgJ2NvbXBvbmVudCcsIGlkKVxuICB9LFxuXG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZS9pbnNlcnQgYSBuZXcgY2hpbGQgdm0uXG4gICAqIElmIGtlZXAgYWxpdmUgYW5kIGhhcyBjYWNoZWQgaW5zdGFuY2UsIGluc2VydCB0aGF0XG4gICAqIGluc3RhbmNlOyBvdGhlcndpc2UgYnVpbGQgYSBuZXcgb25lIGFuZCBjYWNoZSBpdC5cbiAgICpcbiAgICogQHJldHVybiB7VnVlfSAtIHRoZSBjcmVhdGVkIGluc3RhbmNlXG4gICAqL1xuXG4gIGJ1aWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMua2VlcEFsaXZlKSB7XG4gICAgICB2YXIgY2FjaGVkID0gdGhpcy5jYWNoZVt0aGlzLmN0b3JJZF1cbiAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgcmV0dXJuIGNhY2hlZFxuICAgICAgfVxuICAgIH1cbiAgICB2YXIgdm0gPSB0aGlzLnZtXG4gICAgdmFyIGVsID0gdGVtcGxhdGVQYXJzZXIuY2xvbmUodGhpcy5lbClcbiAgICBpZiAodGhpcy5DdG9yKSB7XG4gICAgICB2YXIgY2hpbGQgPSB2bS4kYWRkQ2hpbGQoe1xuICAgICAgICBlbDogZWwsXG4gICAgICAgIF9hc0NvbXBvbmVudDogdHJ1ZVxuICAgICAgfSwgdGhpcy5DdG9yKVxuICAgICAgaWYgKHRoaXMua2VlcEFsaXZlKSB7XG4gICAgICAgIHRoaXMuY2FjaGVbdGhpcy5jdG9ySWRdID0gY2hpbGRcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGlsZFxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogVGVhcmRvd24gdGhlIGN1cnJlbnQgY2hpbGQsIGJ1dCBkZWZlcnMgY2xlYW51cCBzb1xuICAgKiB0aGF0IHdlIGNhbiBzZXBhcmF0ZSB0aGUgZGVzdHJveSBhbmQgcmVtb3ZhbCBzdGVwcy5cbiAgICovXG5cbiAgdW5idWlsZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBjaGlsZCA9IHRoaXMuY2hpbGRWTVxuICAgIGlmICghY2hpbGQgfHwgdGhpcy5rZWVwQWxpdmUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICAvLyB0aGUgc29sZSBwdXJwb3NlIG9mIGBkZWZlckNsZWFudXBgIGlzIHNvIHRoYXQgd2UgY2FuXG4gICAgLy8gXCJkZWFjdGl2YXRlXCIgdGhlIHZtIHJpZ2h0IG5vdyBhbmQgcGVyZm9ybSBET00gcmVtb3ZhbFxuICAgIC8vIGxhdGVyLlxuICAgIGNoaWxkLiRkZXN0cm95KGZhbHNlLCB0cnVlKVxuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmUgY3VycmVudCBkZXN0cm95ZWQgY2hpbGQgYW5kIG1hbnVhbGx5IGRvXG4gICAqIHRoZSBjbGVhbnVwIGFmdGVyIHJlbW92YWwuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gICAqL1xuXG4gIHJlbW92ZUN1cnJlbnQ6IGZ1bmN0aW9uIChjYikge1xuICAgIHZhciBjaGlsZCA9IHRoaXMuY2hpbGRWTVxuICAgIHZhciBrZWVwQWxpdmUgPSB0aGlzLmtlZXBBbGl2ZVxuICAgIGlmIChjaGlsZCkge1xuICAgICAgY2hpbGQuJHJlbW92ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICgha2VlcEFsaXZlKSBjaGlsZC5fY2xlYW51cCgpXG4gICAgICAgIGlmIChjYikgY2IoKVxuICAgICAgfSlcbiAgICB9IGVsc2UgaWYgKGNiKSB7XG4gICAgICBjYigpXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGUgY2FsbGJhY2sgZm9yIHRoZSBkeW5hbWljIGxpdGVyYWwgc2NlbmFyaW8sXG4gICAqIGUuZy4gdi1jb21wb25lbnQ9XCJ7e3ZpZXd9fVwiXG4gICAqL1xuXG4gIHVwZGF0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgLy8ganVzdCBkZXN0cm95IGFuZCByZW1vdmUgY3VycmVudFxuICAgICAgdGhpcy51bmJ1aWxkKClcbiAgICAgIHRoaXMucmVtb3ZlQ3VycmVudCgpXG4gICAgICB0aGlzLmNoaWxkVk0gPSBudWxsXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVzb2x2ZUN0b3IodmFsdWUpXG4gICAgICB0aGlzLnVuYnVpbGQoKVxuICAgICAgdmFyIG5ld0NvbXBvbmVudCA9IHRoaXMuYnVpbGQoKVxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICBpZiAodGhpcy5yZWFkeUV2ZW50KSB7XG4gICAgICAgIG5ld0NvbXBvbmVudC4kb25jZSh0aGlzLnJlYWR5RXZlbnQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzZWxmLnN3YXBUbyhuZXdDb21wb25lbnQpXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN3YXBUbyhuZXdDb21wb25lbnQpXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBBY3R1YWxseSBzd2FwIHRoZSBjb21wb25lbnRzLCBkZXBlbmRpbmcgb24gdGhlXG4gICAqIHRyYW5zaXRpb24gbW9kZS4gRGVmYXVsdHMgdG8gc2ltdWx0YW5lb3VzLlxuICAgKlxuICAgKiBAcGFyYW0ge1Z1ZX0gdGFyZ2V0XG4gICAqL1xuXG4gIHN3YXBUbzogZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHN3aXRjaCAoc2VsZi50cmFuc01vZGUpIHtcbiAgICAgIGNhc2UgJ2luLW91dCc6XG4gICAgICAgIHRhcmdldC4kYmVmb3JlKHNlbGYucmVmLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2VsZi5yZW1vdmVDdXJyZW50KClcbiAgICAgICAgICBzZWxmLmNoaWxkVk0gPSB0YXJnZXRcbiAgICAgICAgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ291dC1pbic6XG4gICAgICAgIHNlbGYucmVtb3ZlQ3VycmVudChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGFyZ2V0LiRiZWZvcmUoc2VsZi5yZWYpXG4gICAgICAgICAgc2VsZi5jaGlsZFZNID0gdGFyZ2V0XG4gICAgICAgIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBzZWxmLnJlbW92ZUN1cnJlbnQoKVxuICAgICAgICB0YXJnZXQuJGJlZm9yZShzZWxmLnJlZilcbiAgICAgICAgc2VsZi5jaGlsZFZNID0gdGFyZ2V0XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBVbmJpbmQuXG4gICAqL1xuXG4gIHVuYmluZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudW5idWlsZCgpXG4gICAgLy8gZGVzdHJveSBhbGwga2VlcC1hbGl2ZSBjYWNoZWQgaW5zdGFuY2VzXG4gICAgaWYgKHRoaXMuY2FjaGUpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLmNhY2hlKSB7XG4gICAgICAgIHRoaXMuY2FjaGVba2V5XS4kZGVzdHJveSgpXG4gICAgICB9XG4gICAgICB0aGlzLmNhY2hlID0gbnVsbFxuICAgIH1cbiAgfVxuXG59XG59LHtcIi4uL3BhcnNlcnMvdGVtcGxhdGVcIjo1MSxcIi4uL3V0aWxcIjo2MH1dLDE5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGlzTGl0ZXJhbDogdHJ1ZSxcblxuICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy52bS4kJFt0aGlzLmV4cHJlc3Npb25dID0gdGhpcy5lbFxuICB9LFxuXG4gIHVuYmluZDogZnVuY3Rpb24gKCkge1xuICAgIGRlbGV0ZSB0aGlzLnZtLiQkW3RoaXMuZXhwcmVzc2lvbl1cbiAgfVxuICBcbn1cbn0se31dLDIwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBfID0gcmVxdWlyZSgnLi4vdXRpbCcpXG5cbm1vZHVsZS5leHBvcnRzID0geyBcblxuICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNoaWxkID0gdGhpcy5lbC5fX3Z1ZV9fXG4gICAgaWYgKCFjaGlsZCB8fCB0aGlzLnZtICE9PSBjaGlsZC4kcGFyZW50KSB7XG4gICAgICBfLndhcm4oXG4gICAgICAgICdgdi1ldmVudHNgIHNob3VsZCBvbmx5IGJlIHVzZWQgb24gYSBjaGlsZCBjb21wb25lbnQgJyArXG4gICAgICAgICdmcm9tIHRoZSBwYXJlbnQgdGVtcGxhdGUuJ1xuICAgICAgKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHZhciBtZXRob2QgPSB0aGlzLnZtW3RoaXMuZXhwcmVzc2lvbl1cbiAgICBpZiAoIW1ldGhvZCkge1xuICAgICAgXy53YXJuKFxuICAgICAgICAnYHYtZXZlbnRzYCBjYW5ub3QgZmluZCBtZXRob2QgXCInICsgdGhpcy5leHByZXNzaW9uICtcbiAgICAgICAgJ1wiIG9uIHRoZSBwYXJlbnQgaW5zdGFuY2UuJ1xuICAgICAgKVxuICAgIH1cbiAgICBjaGlsZC4kb24odGhpcy5hcmcsIG1ldGhvZClcbiAgfVxuXG4gIC8vIHdoZW4gY2hpbGQgaXMgZGVzdHJveWVkLCBhbGwgZXZlbnRzIGFyZSB0dXJuZWQgb2ZmLFxuICAvLyBzbyBubyBuZWVkIGZvciB1bmJpbmQgaGVyZS5cblxufVxufSx7XCIuLi91dGlsXCI6NjB9XSwyMTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIHRlbXBsYXRlUGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy90ZW1wbGF0ZScpXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBhIGNvbW1lbnQgbm9kZSBtZWFucyB0aGlzIGlzIGEgYmluZGluZyBmb3JcbiAgICAvLyB7e3sgaW5saW5lIHVuZXNjYXBlZCBodG1sIH19fVxuICAgIGlmICh0aGlzLmVsLm5vZGVUeXBlID09PSA4KSB7XG4gICAgICAvLyBob2xkIG5vZGVzXG4gICAgICB0aGlzLm5vZGVzID0gW11cbiAgICB9XG4gIH0sXG5cbiAgdXBkYXRlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YWx1ZSA9IF8udG9TdHJpbmcodmFsdWUpXG4gICAgaWYgKHRoaXMubm9kZXMpIHtcbiAgICAgIHRoaXMuc3dhcCh2YWx1ZSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbC5pbm5lckhUTUwgPSB2YWx1ZVxuICAgIH1cbiAgfSxcblxuICBzd2FwOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyByZW1vdmUgb2xkIG5vZGVzXG4gICAgdmFyIGkgPSB0aGlzLm5vZGVzLmxlbmd0aFxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIF8ucmVtb3ZlKHRoaXMubm9kZXNbaV0pXG4gICAgfVxuICAgIC8vIGNvbnZlcnQgbmV3IHZhbHVlIHRvIGEgZnJhZ21lbnRcbiAgICAvLyBkbyBub3QgYXR0ZW1wdCB0byByZXRyaWV2ZSBmcm9tIGlkIHNlbGVjdG9yXG4gICAgdmFyIGZyYWcgPSB0ZW1wbGF0ZVBhcnNlci5wYXJzZSh2YWx1ZSwgdHJ1ZSwgdHJ1ZSlcbiAgICAvLyBzYXZlIGEgcmVmZXJlbmNlIHRvIHRoZXNlIG5vZGVzIHNvIHdlIGNhbiByZW1vdmUgbGF0ZXJcbiAgICB0aGlzLm5vZGVzID0gXy50b0FycmF5KGZyYWcuY2hpbGROb2RlcylcbiAgICBfLmJlZm9yZShmcmFnLCB0aGlzLmVsKVxuICB9XG5cbn1cbn0se1wiLi4vcGFyc2Vycy90ZW1wbGF0ZVwiOjUxLFwiLi4vdXRpbFwiOjYwfV0sMjI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBjb21waWxlID0gcmVxdWlyZSgnLi4vY29tcGlsZXIvY29tcGlsZScpXG52YXIgdGVtcGxhdGVQYXJzZXIgPSByZXF1aXJlKCcuLi9wYXJzZXJzL3RlbXBsYXRlJylcbnZhciB0cmFuc2l0aW9uID0gcmVxdWlyZSgnLi4vdHJhbnNpdGlvbicpXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmVsXG4gICAgaWYgKCFlbC5fX3Z1ZV9fKSB7XG4gICAgICB0aGlzLnN0YXJ0ID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgndi1pZi1zdGFydCcpXG4gICAgICB0aGlzLmVuZCA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ3YtaWYtZW5kJylcbiAgICAgIF8ucmVwbGFjZShlbCwgdGhpcy5lbmQpXG4gICAgICBfLmJlZm9yZSh0aGlzLnN0YXJ0LCB0aGlzLmVuZClcbiAgICAgIGlmIChlbC50YWdOYW1lID09PSAnVEVNUExBVEUnKSB7XG4gICAgICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZVBhcnNlci5wYXJzZShlbCwgdHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcbiAgICAgICAgdGhpcy50ZW1wbGF0ZS5hcHBlbmRDaGlsZChlbClcbiAgICAgIH1cbiAgICAgIC8vIGNvbXBpbGUgdGhlIG5lc3RlZCBwYXJ0aWFsXG4gICAgICB0aGlzLmxpbmtlciA9IGNvbXBpbGUoXG4gICAgICAgIHRoaXMudGVtcGxhdGUsXG4gICAgICAgIHRoaXMudm0uJG9wdGlvbnMsXG4gICAgICAgIHRydWVcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbnZhbGlkID0gdHJ1ZVxuICAgICAgXy53YXJuKFxuICAgICAgICAndi1pZj1cIicgKyB0aGlzLmV4cHJlc3Npb24gKyAnXCIgY2Fubm90IGJlICcgK1xuICAgICAgICAndXNlZCBvbiBhbiBhbHJlYWR5IG1vdW50ZWQgaW5zdGFuY2UuJ1xuICAgICAgKVxuICAgIH1cbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh0aGlzLmludmFsaWQpIHJldHVyblxuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdGhpcy5pbnNlcnQoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRlYXJkb3duKClcbiAgICB9XG4gIH0sXG5cbiAgaW5zZXJ0OiBmdW5jdGlvbiAoKSB7XG4gICAgLy8gYXZvaWQgZHVwbGljYXRlIGluc2VydHMsIHNpbmNlIHVwZGF0ZSgpIGNhbiBiZVxuICAgIC8vIGNhbGxlZCB3aXRoIGRpZmZlcmVudCB0cnV0aHkgdmFsdWVzXG4gICAgaWYgKCF0aGlzLnVubGluaykge1xuICAgICAgdGhpcy5jb21waWxlKHRoaXMudGVtcGxhdGUpIFxuICAgIH1cbiAgfSxcblxuICBjb21waWxlOiBmdW5jdGlvbiAodGVtcGxhdGUpIHtcbiAgICB2YXIgdm0gPSB0aGlzLnZtXG4gICAgdmFyIGZyYWcgPSB0ZW1wbGF0ZVBhcnNlci5jbG9uZSh0ZW1wbGF0ZSlcbiAgICB2YXIgb3JpZ2luYWxDaGlsZExlbmd0aCA9IHZtLl9jaGlsZHJlblxuICAgICAgPyB2bS5fY2hpbGRyZW4ubGVuZ3RoXG4gICAgICA6IDBcbiAgICB0aGlzLnVubGluayA9IHRoaXMubGlua2VyXG4gICAgICA/IHRoaXMubGlua2VyKHZtLCBmcmFnKVxuICAgICAgOiB2bS4kY29tcGlsZShmcmFnKVxuICAgIHRyYW5zaXRpb24uYmxvY2tBcHBlbmQoZnJhZywgdGhpcy5lbmQsIHZtKVxuICAgIHRoaXMuY2hpbGRyZW4gPSB2bS5fY2hpbGRyZW5cbiAgICAgID8gdm0uX2NoaWxkcmVuLnNsaWNlKG9yaWdpbmFsQ2hpbGRMZW5ndGgpXG4gICAgICA6IG51bGxcbiAgICBpZiAodGhpcy5jaGlsZHJlbiAmJiBfLmluRG9jKHZtLiRlbCkpIHtcbiAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgY2hpbGQuX2NhbGxIb29rKCdhdHRhY2hlZCcpXG4gICAgICB9KVxuICAgIH1cbiAgfSxcblxuICB0ZWFyZG93bjogZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy51bmxpbmspIHJldHVyblxuICAgIHRyYW5zaXRpb24uYmxvY2tSZW1vdmUodGhpcy5zdGFydCwgdGhpcy5lbmQsIHRoaXMudm0pXG4gICAgaWYgKHRoaXMuY2hpbGRyZW4gJiYgXy5pbkRvYyh0aGlzLnZtLiRlbCkpIHtcbiAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgaWYgKCFjaGlsZC5faXNEZXN0cm95ZWQpIHtcbiAgICAgICAgICBjaGlsZC5fY2FsbEhvb2soJ2RldGFjaGVkJylcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gICAgdGhpcy51bmxpbmsoKVxuICAgIHRoaXMudW5saW5rID0gbnVsbFxuICB9XG5cbn1cbn0se1wiLi4vY29tcGlsZXIvY29tcGlsZVwiOjExLFwiLi4vcGFyc2Vycy90ZW1wbGF0ZVwiOjUxLFwiLi4vdHJhbnNpdGlvblwiOjU0LFwiLi4vdXRpbFwiOjYwfV0sMjM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLy8gbWFuaXB1bGF0aW9uIGRpcmVjdGl2ZXNcbmV4cG9ydHMudGV4dCAgICAgICA9IHJlcXVpcmUoJy4vdGV4dCcpXG5leHBvcnRzLmh0bWwgICAgICAgPSByZXF1aXJlKCcuL2h0bWwnKVxuZXhwb3J0cy5hdHRyICAgICAgID0gcmVxdWlyZSgnLi9hdHRyJylcbmV4cG9ydHMuc2hvdyAgICAgICA9IHJlcXVpcmUoJy4vc2hvdycpXG5leHBvcnRzWydjbGFzcyddICAgPSByZXF1aXJlKCcuL2NsYXNzJylcbmV4cG9ydHMuZWwgICAgICAgICA9IHJlcXVpcmUoJy4vZWwnKVxuZXhwb3J0cy5yZWYgICAgICAgID0gcmVxdWlyZSgnLi9yZWYnKVxuZXhwb3J0cy5jbG9hayAgICAgID0gcmVxdWlyZSgnLi9jbG9haycpXG5leHBvcnRzLnN0eWxlICAgICAgPSByZXF1aXJlKCcuL3N0eWxlJylcbmV4cG9ydHMucGFydGlhbCAgICA9IHJlcXVpcmUoJy4vcGFydGlhbCcpXG5leHBvcnRzLnRyYW5zaXRpb24gPSByZXF1aXJlKCcuL3RyYW5zaXRpb24nKVxuXG4vLyBldmVudCBsaXN0ZW5lciBkaXJlY3RpdmVzXG5leHBvcnRzLm9uICAgICAgICAgPSByZXF1aXJlKCcuL29uJylcbmV4cG9ydHMubW9kZWwgICAgICA9IHJlcXVpcmUoJy4vbW9kZWwnKVxuXG4vLyBjaGlsZCB2bSBkaXJlY3RpdmVzXG5leHBvcnRzLmNvbXBvbmVudCAgPSByZXF1aXJlKCcuL2NvbXBvbmVudCcpXG5leHBvcnRzLnJlcGVhdCAgICAgPSByZXF1aXJlKCcuL3JlcGVhdCcpXG5leHBvcnRzWydpZiddICAgICAgPSByZXF1aXJlKCcuL2lmJylcblxuLy8gY2hpbGQgdm0gY29tbXVuaWNhdGlvbiBkaXJlY3RpdmVzXG5leHBvcnRzWyd3aXRoJ10gICAgPSByZXF1aXJlKCcuL3dpdGgnKVxuZXhwb3J0cy5ldmVudHMgICAgID0gcmVxdWlyZSgnLi9ldmVudHMnKVxufSx7XCIuL2F0dHJcIjoxNSxcIi4vY2xhc3NcIjoxNixcIi4vY2xvYWtcIjoxNyxcIi4vY29tcG9uZW50XCI6MTgsXCIuL2VsXCI6MTksXCIuL2V2ZW50c1wiOjIwLFwiLi9odG1sXCI6MjEsXCIuL2lmXCI6MjIsXCIuL21vZGVsXCI6MjYsXCIuL29uXCI6MjksXCIuL3BhcnRpYWxcIjozMCxcIi4vcmVmXCI6MzEsXCIuL3JlcGVhdFwiOjMyLFwiLi9zaG93XCI6MzMsXCIuL3N0eWxlXCI6MzQsXCIuL3RleHRcIjozNSxcIi4vdHJhbnNpdGlvblwiOjM2LFwiLi93aXRoXCI6Mzd9XSwyNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uLy4uL3V0aWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsID0gdGhpcy5lbFxuICAgIHRoaXMubGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLnNldChlbC5jaGVja2VkLCB0cnVlKVxuICAgIH1cbiAgICBfLm9uKGVsLCAnY2hhbmdlJywgdGhpcy5saXN0ZW5lcilcbiAgICBpZiAoZWwuY2hlY2tlZCkge1xuICAgICAgdGhpcy5faW5pdFZhbHVlID0gZWwuY2hlY2tlZFxuICAgIH1cbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuZWwuY2hlY2tlZCA9ICEhdmFsdWVcbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICBfLm9mZih0aGlzLmVsLCAnY2hhbmdlJywgdGhpcy5saXN0ZW5lcilcbiAgfVxuXG59XG59LHtcIi4uLy4uL3V0aWxcIjo2MH1dLDI1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBfID0gcmVxdWlyZSgnLi4vLi4vdXRpbCcpXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgZWwgPSB0aGlzLmVsXG5cbiAgICAvLyBjaGVjayBwYXJhbXNcbiAgICAvLyAtIGxhenk6IHVwZGF0ZSBtb2RlbCBvbiBcImNoYW5nZVwiIGluc3RlYWQgb2YgXCJpbnB1dFwiXG4gICAgdmFyIGxhenkgPSB0aGlzLl9jaGVja1BhcmFtKCdsYXp5JykgIT0gbnVsbFxuICAgIC8vIC0gbnVtYmVyOiBjYXN0IHZhbHVlIGludG8gbnVtYmVyIHdoZW4gdXBkYXRpbmcgbW9kZWwuXG4gICAgdmFyIG51bWJlciA9IHRoaXMuX2NoZWNrUGFyYW0oJ251bWJlcicpICE9IG51bGxcblxuICAgIC8vIGhhbmRsZSBjb21wb3NpdGlvbiBldmVudHMuXG4gICAgLy8gaHR0cDovL2Jsb2cuZXZhbnlvdS5tZS8yMDE0LzAxLzAzL2NvbXBvc2l0aW9uLWV2ZW50L1xuICAgIHZhciBjcExvY2tlZCA9IGZhbHNlXG4gICAgdGhpcy5jcExvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBjcExvY2tlZCA9IHRydWVcbiAgICB9XG4gICAgdGhpcy5jcFVubG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGNwTG9ja2VkID0gZmFsc2VcbiAgICAgIC8vIGluIElFMTEgdGhlIFwiY29tcG9zaXRpb25lbmRcIiBldmVudCBmaXJlcyBBRlRFUlxuICAgICAgLy8gdGhlIFwiaW5wdXRcIiBldmVudCwgc28gdGhlIGlucHV0IGhhbmRsZXIgaXMgYmxvY2tlZFxuICAgICAgLy8gYXQgdGhlIGVuZC4uLiBoYXZlIHRvIGNhbGwgaXQgaGVyZS5cbiAgICAgIHNldCgpXG4gICAgfVxuICAgIF8ub24oZWwsJ2NvbXBvc2l0aW9uc3RhcnQnLCB0aGlzLmNwTG9jaylcbiAgICBfLm9uKGVsLCdjb21wb3NpdGlvbmVuZCcsIHRoaXMuY3BVbmxvY2spXG5cbiAgICAvLyBzaGFyZWQgc2V0dGVyXG4gICAgZnVuY3Rpb24gc2V0ICgpIHtcbiAgICAgIHNlbGYuc2V0KFxuICAgICAgICBudW1iZXIgPyBfLnRvTnVtYmVyKGVsLnZhbHVlKSA6IGVsLnZhbHVlLFxuICAgICAgICB0cnVlXG4gICAgICApXG4gICAgfVxuXG4gICAgLy8gaWYgdGhlIGRpcmVjdGl2ZSBoYXMgZmlsdGVycywgd2UgbmVlZCB0b1xuICAgIC8vIHJlY29yZCBjdXJzb3IgcG9zaXRpb24gYW5kIHJlc3RvcmUgaXQgYWZ0ZXIgdXBkYXRpbmdcbiAgICAvLyB0aGUgaW5wdXQgd2l0aCB0aGUgZmlsdGVyZWQgdmFsdWUuXG4gICAgLy8gYWxzbyBmb3JjZSB1cGRhdGUgZm9yIHR5cGU9XCJyYW5nZVwiIGlucHV0cyB0byBlbmFibGVcbiAgICAvLyBcImxvY2sgaW4gcmFuZ2VcIiAoc2VlICM1MDYpXG4gICAgdGhpcy5saXN0ZW5lciA9IHRoaXMuZmlsdGVycyB8fCBlbC50eXBlID09PSAncmFuZ2UnXG4gICAgICA/IGZ1bmN0aW9uIHRleHRJbnB1dExpc3RlbmVyICgpIHtcbiAgICAgICAgICBpZiAoY3BMb2NrZWQpIHJldHVyblxuICAgICAgICAgIHZhciBjaGFyc09mZnNldFxuICAgICAgICAgIC8vIHNvbWUgSFRNTDUgaW5wdXQgdHlwZXMgdGhyb3cgZXJyb3IgaGVyZVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyByZWNvcmQgaG93IG1hbnkgY2hhcnMgZnJvbSB0aGUgZW5kIG9mIGlucHV0XG4gICAgICAgICAgICAvLyB0aGUgY3Vyc29yIHdhcyBhdFxuICAgICAgICAgICAgY2hhcnNPZmZzZXQgPSBlbC52YWx1ZS5sZW5ndGggLSBlbC5zZWxlY3Rpb25TdGFydFxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgLy8gRml4IElFMTAvMTEgaW5maW5pdGUgdXBkYXRlIGN5Y2xlXG4gICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3l5eDk5MDgwMy92dWUvaXNzdWVzLzU5MlxuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChjaGFyc09mZnNldCA8IDApIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cbiAgICAgICAgICBzZXQoKVxuICAgICAgICAgIF8ubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZm9yY2UgYSB2YWx1ZSB1cGRhdGUsIGJlY2F1c2UgaW5cbiAgICAgICAgICAgIC8vIGNlcnRhaW4gY2FzZXMgdGhlIHdyaXRlIGZpbHRlcnMgb3V0cHV0IHRoZVxuICAgICAgICAgICAgLy8gc2FtZSByZXN1bHQgZm9yIGRpZmZlcmVudCBpbnB1dCB2YWx1ZXMsIGFuZFxuICAgICAgICAgICAgLy8gdGhlIE9ic2VydmVyIHNldCBldmVudHMgd29uJ3QgYmUgdHJpZ2dlcmVkLlxuICAgICAgICAgICAgdmFyIG5ld1ZhbCA9IHNlbGYuX3dhdGNoZXIudmFsdWVcbiAgICAgICAgICAgIHNlbGYudXBkYXRlKG5ld1ZhbClcbiAgICAgICAgICAgIGlmIChjaGFyc09mZnNldCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciBjdXJzb3JQb3MgPVxuICAgICAgICAgICAgICAgIF8udG9TdHJpbmcobmV3VmFsKS5sZW5ndGggLSBjaGFyc09mZnNldFxuICAgICAgICAgICAgICBlbC5zZXRTZWxlY3Rpb25SYW5nZShjdXJzb3JQb3MsIGN1cnNvclBvcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICA6IGZ1bmN0aW9uIHRleHRJbnB1dExpc3RlbmVyICgpIHtcbiAgICAgICAgICBpZiAoY3BMb2NrZWQpIHJldHVyblxuICAgICAgICAgIHNldCgpXG4gICAgICAgIH1cblxuICAgIHRoaXMuZXZlbnQgPSBsYXp5ID8gJ2NoYW5nZScgOiAnaW5wdXQnXG4gICAgXy5vbihlbCwgdGhpcy5ldmVudCwgdGhpcy5saXN0ZW5lcilcblxuICAgIC8vIElFOSBkb2Vzbid0IGZpcmUgaW5wdXQgZXZlbnQgb24gYmFja3NwYWNlL2RlbC9jdXRcbiAgICBpZiAoIWxhenkgJiYgXy5pc0lFOSkge1xuICAgICAgdGhpcy5vbkN1dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgXy5uZXh0VGljayhzZWxmLmxpc3RlbmVyKVxuICAgICAgfVxuICAgICAgdGhpcy5vbkRlbCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGlmIChlLmtleUNvZGUgPT09IDQ2IHx8IGUua2V5Q29kZSA9PT0gOCkge1xuICAgICAgICAgIHNlbGYubGlzdGVuZXIoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBfLm9uKGVsLCAnY3V0JywgdGhpcy5vbkN1dClcbiAgICAgIF8ub24oZWwsICdrZXl1cCcsIHRoaXMub25EZWwpXG4gICAgfVxuXG4gICAgLy8gc2V0IGluaXRpYWwgdmFsdWUgaWYgcHJlc2VudFxuICAgIGlmIChcbiAgICAgIGVsLmhhc0F0dHJpYnV0ZSgndmFsdWUnKSB8fFxuICAgICAgKGVsLnRhZ05hbWUgPT09ICdURVhUQVJFQScgJiYgZWwudmFsdWUudHJpbSgpKVxuICAgICkge1xuICAgICAgdGhpcy5faW5pdFZhbHVlID0gbnVtYmVyXG4gICAgICAgID8gXy50b051bWJlcihlbC52YWx1ZSlcbiAgICAgICAgOiBlbC52YWx1ZVxuICAgIH1cbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuZWwudmFsdWUgPSBfLnRvU3RyaW5nKHZhbHVlKVxuICB9LFxuXG4gIHVuYmluZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBlbCA9IHRoaXMuZWxcbiAgICBfLm9mZihlbCwgdGhpcy5ldmVudCwgdGhpcy5saXN0ZW5lcilcbiAgICBfLm9mZihlbCwnY29tcG9zaXRpb25zdGFydCcsIHRoaXMuY3BMb2NrKVxuICAgIF8ub2ZmKGVsLCdjb21wb3NpdGlvbmVuZCcsIHRoaXMuY3BVbmxvY2spXG4gICAgaWYgKHRoaXMub25DdXQpIHtcbiAgICAgIF8ub2ZmKGVsLCdjdXQnLCB0aGlzLm9uQ3V0KVxuICAgICAgXy5vZmYoZWwsJ2tleXVwJywgdGhpcy5vbkRlbClcbiAgICB9XG4gIH1cblxufVxufSx7XCIuLi8uLi91dGlsXCI6NjB9XSwyNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uLy4uL3V0aWwnKVxuXG52YXIgaGFuZGxlcnMgPSB7XG4gIF9kZWZhdWx0OiByZXF1aXJlKCcuL2RlZmF1bHQnKSxcbiAgcmFkaW86IHJlcXVpcmUoJy4vcmFkaW8nKSxcbiAgc2VsZWN0OiByZXF1aXJlKCcuL3NlbGVjdCcpLFxuICBjaGVja2JveDogcmVxdWlyZSgnLi9jaGVja2JveCcpXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIHByaW9yaXR5OiA4MDAsXG4gIHR3b1dheTogdHJ1ZSxcbiAgaGFuZGxlcnM6IGhhbmRsZXJzLFxuXG4gIC8qKlxuICAgKiBQb3NzaWJsZSBlbGVtZW50czpcbiAgICogICA8c2VsZWN0PlxuICAgKiAgIDx0ZXh0YXJlYT5cbiAgICogICA8aW5wdXQgdHlwZT1cIipcIj5cbiAgICogICAgIC0gdGV4dFxuICAgKiAgICAgLSBjaGVja2JveFxuICAgKiAgICAgLSByYWRpb1xuICAgKiAgICAgLSBudW1iZXJcbiAgICogICAgIC0gVE9ETzogbW9yZSB0eXBlcyBtYXkgYmUgc3VwcGxpZWQgYXMgYSBwbHVnaW5cbiAgICovXG5cbiAgYmluZDogZnVuY3Rpb24gKCkge1xuICAgIC8vIGZyaWVuZGx5IHdhcm5pbmcuLi5cbiAgICB2YXIgZmlsdGVycyA9IHRoaXMuZmlsdGVyc1xuICAgIGlmIChmaWx0ZXJzICYmIGZpbHRlcnMucmVhZCAmJiAhZmlsdGVycy53cml0ZSkge1xuICAgICAgXy53YXJuKFxuICAgICAgICAnSXQgc2VlbXMgeW91IGFyZSB1c2luZyBhIHJlYWQtb25seSBmaWx0ZXIgd2l0aCAnICtcbiAgICAgICAgJ3YtbW9kZWwuIFlvdSBtaWdodCB3YW50IHRvIHVzZSBhIHR3by13YXkgZmlsdGVyICcgK1xuICAgICAgICAndG8gZW5zdXJlIGNvcnJlY3QgYmVoYXZpb3IuJ1xuICAgICAgKVxuICAgIH1cbiAgICB2YXIgZWwgPSB0aGlzLmVsXG4gICAgdmFyIHRhZyA9IGVsLnRhZ05hbWVcbiAgICB2YXIgaGFuZGxlclxuICAgIGlmICh0YWcgPT09ICdJTlBVVCcpIHtcbiAgICAgIGhhbmRsZXIgPSBoYW5kbGVyc1tlbC50eXBlXSB8fCBoYW5kbGVycy5fZGVmYXVsdFxuICAgIH0gZWxzZSBpZiAodGFnID09PSAnU0VMRUNUJykge1xuICAgICAgaGFuZGxlciA9IGhhbmRsZXJzLnNlbGVjdFxuICAgIH0gZWxzZSBpZiAodGFnID09PSAnVEVYVEFSRUEnKSB7XG4gICAgICBoYW5kbGVyID0gaGFuZGxlcnMuX2RlZmF1bHRcbiAgICB9IGVsc2Uge1xuICAgICAgXy53YXJuKFwidi1tb2RlbCBkb2Vzbid0IHN1cHBvcnQgZWxlbWVudCB0eXBlOiBcIiArIHRhZylcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBoYW5kbGVyLmJpbmQuY2FsbCh0aGlzKVxuICAgIHRoaXMudXBkYXRlID0gaGFuZGxlci51cGRhdGVcbiAgICB0aGlzLnVuYmluZCA9IGhhbmRsZXIudW5iaW5kXG4gIH1cblxufVxufSx7XCIuLi8uLi91dGlsXCI6NjAsXCIuL2NoZWNrYm94XCI6MjQsXCIuL2RlZmF1bHRcIjoyNSxcIi4vcmFkaW9cIjoyNyxcIi4vc2VsZWN0XCI6Mjh9XSwyNzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uLy4uL3V0aWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsID0gdGhpcy5lbFxuICAgIHRoaXMubGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLnNldChlbC52YWx1ZSwgdHJ1ZSlcbiAgICB9XG4gICAgXy5vbihlbCwgJ2NoYW5nZScsIHRoaXMubGlzdGVuZXIpXG4gICAgaWYgKGVsLmNoZWNrZWQpIHtcbiAgICAgIHRoaXMuX2luaXRWYWx1ZSA9IGVsLnZhbHVlXG4gICAgfVxuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLyoganNoaW50IGVxZXFlcTogZmFsc2UgKi9cbiAgICB0aGlzLmVsLmNoZWNrZWQgPSB2YWx1ZSA9PSB0aGlzLmVsLnZhbHVlXG4gIH0sXG5cbiAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgXy5vZmYodGhpcy5lbCwgJ2NoYW5nZScsIHRoaXMubGlzdGVuZXIpXG4gIH1cblxufVxufSx7XCIuLi8uLi91dGlsXCI6NjB9XSwyODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uLy4uL3V0aWwnKVxudmFyIFdhdGNoZXIgPSByZXF1aXJlKCcuLi8uLi93YXRjaGVyJylcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgYmluZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBlbCA9IHRoaXMuZWxcbiAgICAvLyBjaGVjayBvcHRpb25zIHBhcmFtXG4gICAgdmFyIG9wdGlvbnNQYXJhbSA9IHRoaXMuX2NoZWNrUGFyYW0oJ29wdGlvbnMnKVxuICAgIGlmIChvcHRpb25zUGFyYW0pIHtcbiAgICAgIGluaXRPcHRpb25zLmNhbGwodGhpcywgb3B0aW9uc1BhcmFtKVxuICAgIH1cbiAgICB0aGlzLm11bHRpcGxlID0gZWwuaGFzQXR0cmlidXRlKCdtdWx0aXBsZScpXG4gICAgdGhpcy5saXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciB2YWx1ZSA9IHNlbGYubXVsdGlwbGVcbiAgICAgICAgPyBnZXRNdWx0aVZhbHVlKGVsKVxuICAgICAgICA6IGVsLnZhbHVlXG4gICAgICBzZWxmLnNldCh2YWx1ZSwgdHJ1ZSlcbiAgICB9XG4gICAgXy5vbihlbCwgJ2NoYW5nZScsIHRoaXMubGlzdGVuZXIpXG4gICAgY2hlY2tJbml0aWFsVmFsdWUuY2FsbCh0aGlzKVxuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLyoganNoaW50IGVxZXFlcTogZmFsc2UgKi9cbiAgICB2YXIgZWwgPSB0aGlzLmVsXG4gICAgZWwuc2VsZWN0ZWRJbmRleCA9IC0xXG4gICAgdmFyIG11bHRpID0gdGhpcy5tdWx0aXBsZSAmJiBfLmlzQXJyYXkodmFsdWUpXG4gICAgdmFyIG9wdGlvbnMgPSBlbC5vcHRpb25zXG4gICAgdmFyIGkgPSBvcHRpb25zLmxlbmd0aFxuICAgIHZhciBvcHRpb25cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBvcHRpb24gPSBvcHRpb25zW2ldXG4gICAgICBvcHRpb24uc2VsZWN0ZWQgPSBtdWx0aVxuICAgICAgICA/IGluZGV4T2YodmFsdWUsIG9wdGlvbi52YWx1ZSkgPiAtMVxuICAgICAgICA6IHZhbHVlID09IG9wdGlvbi52YWx1ZVxuICAgIH1cbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICBfLm9mZih0aGlzLmVsLCAnY2hhbmdlJywgdGhpcy5saXN0ZW5lcilcbiAgICBpZiAodGhpcy5vcHRpb25XYXRjaGVyKSB7XG4gICAgICB0aGlzLm9wdGlvbldhdGNoZXIudGVhcmRvd24oKVxuICAgIH1cbiAgfVxuXG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSB0aGUgb3B0aW9uIGxpc3QgZnJvbSB0aGUgcGFyYW0uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV4cHJlc3Npb25cbiAqL1xuXG5mdW5jdGlvbiBpbml0T3B0aW9ucyAoZXhwcmVzc2lvbikge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgZnVuY3Rpb24gb3B0aW9uVXBkYXRlV2F0Y2hlciAodmFsdWUpIHtcbiAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgc2VsZi5lbC5pbm5lckhUTUwgPSAnJ1xuICAgICAgYnVpbGRPcHRpb25zKHNlbGYuZWwsIHZhbHVlKVxuICAgICAgaWYgKHNlbGYuX3dhdGNoZXIpIHtcbiAgICAgICAgc2VsZi51cGRhdGUoc2VsZi5fd2F0Y2hlci52YWx1ZSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgXy53YXJuKCdJbnZhbGlkIG9wdGlvbnMgdmFsdWUgZm9yIHYtbW9kZWw6ICcgKyB2YWx1ZSlcbiAgICB9XG4gIH1cbiAgdGhpcy5vcHRpb25XYXRjaGVyID0gbmV3IFdhdGNoZXIoXG4gICAgdGhpcy52bSxcbiAgICBleHByZXNzaW9uLFxuICAgIG9wdGlvblVwZGF0ZVdhdGNoZXIsXG4gICAgeyBkZWVwOiB0cnVlIH1cbiAgKVxuICAvLyB1cGRhdGUgd2l0aCBpbml0aWFsIHZhbHVlXG4gIG9wdGlvblVwZGF0ZVdhdGNoZXIodGhpcy5vcHRpb25XYXRjaGVyLnZhbHVlKVxufVxuXG4vKipcbiAqIEJ1aWxkIHVwIG9wdGlvbiBlbGVtZW50cy4gSUU5IGRvZXNuJ3QgY3JlYXRlIG9wdGlvbnNcbiAqIHdoZW4gc2V0dGluZyBpbm5lckhUTUwgb24gPHNlbGVjdD4gZWxlbWVudHMsIHNvIHdlIGhhdmVcbiAqIHRvIHVzZSBET00gQVBJIGhlcmUuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBwYXJlbnQgLSBhIDxzZWxlY3Q+IG9yIGFuIDxvcHRncm91cD5cbiAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnNcbiAqL1xuXG5mdW5jdGlvbiBidWlsZE9wdGlvbnMgKHBhcmVudCwgb3B0aW9ucykge1xuICB2YXIgb3AsIGVsXG4gIGZvciAodmFyIGkgPSAwLCBsID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBvcCA9IG9wdGlvbnNbaV1cbiAgICBpZiAoIW9wLm9wdGlvbnMpIHtcbiAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJylcbiAgICAgIGlmICh0eXBlb2Ygb3AgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGVsLnRleHQgPSBlbC52YWx1ZSA9IG9wXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbC50ZXh0ID0gb3AudGV4dFxuICAgICAgICBlbC52YWx1ZSA9IG9wLnZhbHVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0Z3JvdXAnKVxuICAgICAgZWwubGFiZWwgPSBvcC5sYWJlbFxuICAgICAgYnVpbGRPcHRpb25zKGVsLCBvcC5vcHRpb25zKVxuICAgIH1cbiAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoZWwpXG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayB0aGUgaW5pdGlhbCB2YWx1ZSBmb3Igc2VsZWN0ZWQgb3B0aW9ucy5cbiAqL1xuXG5mdW5jdGlvbiBjaGVja0luaXRpYWxWYWx1ZSAoKSB7XG4gIHZhciBpbml0VmFsdWVcbiAgdmFyIG9wdGlvbnMgPSB0aGlzLmVsLm9wdGlvbnNcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBvcHRpb25zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChvcHRpb25zW2ldLmhhc0F0dHJpYnV0ZSgnc2VsZWN0ZWQnKSkge1xuICAgICAgaWYgKHRoaXMubXVsdGlwbGUpIHtcbiAgICAgICAgKGluaXRWYWx1ZSB8fCAoaW5pdFZhbHVlID0gW10pKVxuICAgICAgICAgIC5wdXNoKG9wdGlvbnNbaV0udmFsdWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbml0VmFsdWUgPSBvcHRpb25zW2ldLnZhbHVlXG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChpbml0VmFsdWUpIHtcbiAgICB0aGlzLl9pbml0VmFsdWUgPSBpbml0VmFsdWVcbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciB0byBleHRyYWN0IGEgdmFsdWUgYXJyYXkgZm9yIHNlbGVjdFttdWx0aXBsZV1cbiAqXG4gKiBAcGFyYW0ge1NlbGVjdEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuXG5mdW5jdGlvbiBnZXRNdWx0aVZhbHVlIChlbCkge1xuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmZpbHRlclxuICAgIC5jYWxsKGVsLm9wdGlvbnMsIGZpbHRlclNlbGVjdGVkKVxuICAgIC5tYXAoZ2V0T3B0aW9uVmFsdWUpXG59XG5cbmZ1bmN0aW9uIGZpbHRlclNlbGVjdGVkIChvcCkge1xuICByZXR1cm4gb3Auc2VsZWN0ZWRcbn1cblxuZnVuY3Rpb24gZ2V0T3B0aW9uVmFsdWUgKG9wKSB7XG4gIHJldHVybiBvcC52YWx1ZSB8fCBvcC50ZXh0XG59XG5cbi8qKlxuICogTmF0aXZlIEFycmF5LmluZGV4T2YgdXNlcyBzdHJpY3QgZXF1YWwsIGJ1dCBpbiB0aGlzXG4gKiBjYXNlIHdlIG5lZWQgdG8gbWF0Y2ggc3RyaW5nL251bWJlcnMgd2l0aCBzb2Z0IGVxdWFsLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGFyclxuICogQHBhcmFtIHsqfSB2YWxcbiAqL1xuXG5mdW5jdGlvbiBpbmRleE9mIChhcnIsIHZhbCkge1xuICAvKiBqc2hpbnQgZXFlcWVxOiBmYWxzZSAqL1xuICB2YXIgaSA9IGFyci5sZW5ndGhcbiAgd2hpbGUgKGktLSkge1xuICAgIGlmIChhcnJbaV0gPT0gdmFsKSByZXR1cm4gaVxuICB9XG4gIHJldHVybiAtMVxufVxufSx7XCIuLi8uLi91dGlsXCI6NjAsXCIuLi8uLi93YXRjaGVyXCI6NjR9XSwyOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBhY2NlcHRTdGF0ZW1lbnQ6IHRydWUsXG4gIHByaW9yaXR5OiA3MDAsXG5cbiAgYmluZDogZnVuY3Rpb24gKCkge1xuICAgIC8vIGRlYWwgd2l0aCBpZnJhbWVzXG4gICAgaWYgKFxuICAgICAgdGhpcy5lbC50YWdOYW1lID09PSAnSUZSQU1FJyAmJlxuICAgICAgdGhpcy5hcmcgIT09ICdsb2FkJ1xuICAgICkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICB0aGlzLmlmcmFtZUJpbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF8ub24oc2VsZi5lbC5jb250ZW50V2luZG93LCBzZWxmLmFyZywgc2VsZi5oYW5kbGVyKVxuICAgICAgfVxuICAgICAgXy5vbih0aGlzLmVsLCAnbG9hZCcsIHRoaXMuaWZyYW1lQmluZClcbiAgICB9XG4gIH0sXG5cbiAgdXBkYXRlOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgIGlmICh0eXBlb2YgaGFuZGxlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgXy53YXJuKFxuICAgICAgICAnRGlyZWN0aXZlIFwidi1vbjonICsgdGhpcy5leHByZXNzaW9uICsgJ1wiICcgK1xuICAgICAgICAnZXhwZWN0cyBhIGZ1bmN0aW9uIHZhbHVlLidcbiAgICAgIClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB0aGlzLnJlc2V0KClcbiAgICB2YXIgdm0gPSB0aGlzLnZtXG4gICAgdGhpcy5oYW5kbGVyID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIGUudGFyZ2V0Vk0gPSB2bVxuICAgICAgdm0uJGV2ZW50ID0gZVxuICAgICAgdmFyIHJlcyA9IGhhbmRsZXIoZSlcbiAgICAgIHZtLiRldmVudCA9IG51bGxcbiAgICAgIHJldHVybiByZXNcbiAgICB9XG4gICAgaWYgKHRoaXMuaWZyYW1lQmluZCkge1xuICAgICAgdGhpcy5pZnJhbWVCaW5kKClcbiAgICB9IGVsc2Uge1xuICAgICAgXy5vbih0aGlzLmVsLCB0aGlzLmFyZywgdGhpcy5oYW5kbGVyKVxuICAgIH1cbiAgfSxcblxuICByZXNldDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBlbCA9IHRoaXMuaWZyYW1lQmluZFxuICAgICAgPyB0aGlzLmVsLmNvbnRlbnRXaW5kb3dcbiAgICAgIDogdGhpcy5lbFxuICAgIGlmICh0aGlzLmhhbmRsZXIpIHtcbiAgICAgIF8ub2ZmKGVsLCB0aGlzLmFyZywgdGhpcy5oYW5kbGVyKVxuICAgIH1cbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJlc2V0KClcbiAgICBfLm9mZih0aGlzLmVsLCAnbG9hZCcsIHRoaXMuaWZyYW1lQmluZClcbiAgfVxufVxufSx7XCIuLi91dGlsXCI6NjB9XSwzMDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIHRlbXBsYXRlUGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy90ZW1wbGF0ZScpXG52YXIgdklmID0gcmVxdWlyZSgnLi9pZicpXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGlzTGl0ZXJhbDogdHJ1ZSxcblxuICAvLyBzYW1lIGxvZ2ljIHJldXNlIGZyb20gdi1pZlxuICBjb21waWxlOiB2SWYuY29tcGlsZSxcbiAgdGVhcmRvd246IHZJZi50ZWFyZG93bixcblxuICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVsID0gdGhpcy5lbFxuICAgIHRoaXMuc3RhcnQgPSBkb2N1bWVudC5jcmVhdGVDb21tZW50KCd2LXBhcnRpYWwtc3RhcnQnKVxuICAgIHRoaXMuZW5kID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgndi1wYXJ0aWFsLWVuZCcpXG4gICAgaWYgKGVsLm5vZGVUeXBlICE9PSA4KSB7XG4gICAgICBlbC5pbm5lckhUTUwgPSAnJ1xuICAgIH1cbiAgICBpZiAoZWwudGFnTmFtZSA9PT0gJ1RFTVBMQVRFJyB8fCBlbC5ub2RlVHlwZSA9PT0gOCkge1xuICAgICAgXy5yZXBsYWNlKGVsLCB0aGlzLmVuZClcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuYXBwZW5kQ2hpbGQodGhpcy5lbmQpXG4gICAgfVxuICAgIF8uYmVmb3JlKHRoaXMuc3RhcnQsIHRoaXMuZW5kKVxuICAgIGlmICghdGhpcy5faXNEeW5hbWljTGl0ZXJhbCkge1xuICAgICAgdGhpcy5pbnNlcnQodGhpcy5leHByZXNzaW9uKVxuICAgIH1cbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uIChpZCkge1xuICAgIHRoaXMudGVhcmRvd24oKVxuICAgIHRoaXMuaW5zZXJ0KGlkKVxuICB9LFxuXG4gIGluc2VydDogZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIHBhcnRpYWwgPSB0aGlzLnZtLiRvcHRpb25zLnBhcnRpYWxzW2lkXVxuICAgIF8uYXNzZXJ0QXNzZXQocGFydGlhbCwgJ3BhcnRpYWwnLCBpZClcbiAgICBpZiAocGFydGlhbCkge1xuICAgICAgdGhpcy5jb21waWxlKHRlbXBsYXRlUGFyc2VyLnBhcnNlKHBhcnRpYWwpKVxuICAgIH1cbiAgfVxuXG59XG59LHtcIi4uL3BhcnNlcnMvdGVtcGxhdGVcIjo1MSxcIi4uL3V0aWxcIjo2MCxcIi4vaWZcIjoyMn1dLDMxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBfID0gcmVxdWlyZSgnLi4vdXRpbCcpXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGlzTGl0ZXJhbDogdHJ1ZSxcblxuICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNoaWxkID0gdGhpcy5lbC5fX3Z1ZV9fXG4gICAgaWYgKCFjaGlsZCB8fCB0aGlzLnZtICE9PSBjaGlsZC4kcGFyZW50KSB7XG4gICAgICBfLndhcm4oXG4gICAgICAgICd2LXJlZiBzaG91bGQgb25seSBiZSB1c2VkIG9uIGEgY2hpbGQgY29tcG9uZW50ICcgK1xuICAgICAgICAnZnJvbSB0aGUgcGFyZW50IHRlbXBsYXRlLidcbiAgICAgIClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB0aGlzLnZtLiRbdGhpcy5leHByZXNzaW9uXSA9IGNoaWxkXG4gIH0sXG5cbiAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMudm0uJFt0aGlzLmV4cHJlc3Npb25dID09PSB0aGlzLmVsLl9fdnVlX18pIHtcbiAgICAgIGRlbGV0ZSB0aGlzLnZtLiRbdGhpcy5leHByZXNzaW9uXVxuICAgIH1cbiAgfVxuICBcbn1cbn0se1wiLi4vdXRpbFwiOjYwfV0sMzI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBpc09iamVjdCA9IF8uaXNPYmplY3RcbnZhciB0ZXh0UGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy90ZXh0JylcbnZhciBleHBQYXJzZXIgPSByZXF1aXJlKCcuLi9wYXJzZXJzL2V4cHJlc3Npb24nKVxudmFyIHRlbXBsYXRlUGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy90ZW1wbGF0ZScpXG52YXIgY29tcGlsZSA9IHJlcXVpcmUoJy4uL2NvbXBpbGVyL2NvbXBpbGUnKVxudmFyIHRyYW5zY2x1ZGUgPSByZXF1aXJlKCcuLi9jb21waWxlci90cmFuc2NsdWRlJylcbnZhciBtZXJnZU9wdGlvbnMgPSByZXF1aXJlKCcuLi91dGlsL21lcmdlLW9wdGlvbicpXG52YXIgdWlkID0gMFxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAvKipcbiAgICogU2V0dXAuXG4gICAqL1xuXG4gIGJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvLyB1aWQgYXMgYSBjYWNoZSBpZGVudGlmaWVyXG4gICAgdGhpcy5pZCA9ICdfX3ZfcmVwZWF0XycgKyAoKyt1aWQpXG4gICAgLy8gd2UgbmVlZCB0byBpbnNlcnQgdGhlIG9ialRvQXJyYXkgY29udmVydGVyXG4gICAgLy8gYXMgdGhlIGZpcnN0IHJlYWQgZmlsdGVyLCBiZWNhdXNlIGl0IGhhcyB0byBiZSBpbnZva2VkXG4gICAgLy8gYmVmb3JlIGFueSB1c2VyIGZpbHRlcnMuIChjYW4ndCBkbyBpdCBpbiBgdXBkYXRlYClcbiAgICBpZiAoIXRoaXMuZmlsdGVycykge1xuICAgICAgdGhpcy5maWx0ZXJzID0ge31cbiAgICB9XG4gICAgLy8gYWRkIHRoZSBvYmplY3QgLT4gYXJyYXkgY29udmVydCBmaWx0ZXJcbiAgICB2YXIgb2JqZWN0Q29udmVydGVyID0gXy5iaW5kKG9ialRvQXJyYXksIHRoaXMpXG4gICAgaWYgKCF0aGlzLmZpbHRlcnMucmVhZCkge1xuICAgICAgdGhpcy5maWx0ZXJzLnJlYWQgPSBbb2JqZWN0Q29udmVydGVyXVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZpbHRlcnMucmVhZC51bnNoaWZ0KG9iamVjdENvbnZlcnRlcilcbiAgICB9XG4gICAgLy8gc2V0dXAgcmVmIG5vZGVcbiAgICB0aGlzLnJlZiA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ3YtcmVwZWF0JylcbiAgICBfLnJlcGxhY2UodGhpcy5lbCwgdGhpcy5yZWYpXG4gICAgLy8gY2hlY2sgaWYgdGhpcyBpcyBhIGJsb2NrIHJlcGVhdFxuICAgIHRoaXMudGVtcGxhdGUgPSB0aGlzLmVsLnRhZ05hbWUgPT09ICdURU1QTEFURSdcbiAgICAgID8gdGVtcGxhdGVQYXJzZXIucGFyc2UodGhpcy5lbCwgdHJ1ZSlcbiAgICAgIDogdGhpcy5lbFxuICAgIC8vIGNoZWNrIG90aGVyIGRpcmVjdGl2ZXMgdGhhdCBuZWVkIHRvIGJlIGhhbmRsZWRcbiAgICAvLyBhdCB2LXJlcGVhdCBsZXZlbFxuICAgIHRoaXMuY2hlY2tJZigpXG4gICAgdGhpcy5jaGVja1JlZigpXG4gICAgdGhpcy5jaGVja0NvbXBvbmVudCgpXG4gICAgLy8gY2hlY2sgZm9yIHRyYWNrYnkgcGFyYW1cbiAgICB0aGlzLmlkS2V5ID1cbiAgICAgIHRoaXMuX2NoZWNrUGFyYW0oJ3RyYWNrLWJ5JykgfHxcbiAgICAgIHRoaXMuX2NoZWNrUGFyYW0oJ3RyYWNrYnknKSAvLyAwLjExLjAgY29tcGF0XG4gICAgLy8gY2FjaGUgZm9yIHByaW1pdGl2ZSB2YWx1ZSBpbnN0YW5jZXNcbiAgICB0aGlzLmNhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuICB9LFxuXG4gIC8qKlxuICAgKiBXYXJuIGFnYWluc3Qgdi1pZiB1c2FnZS5cbiAgICovXG5cbiAgY2hlY2tJZjogZnVuY3Rpb24gKCkge1xuICAgIGlmIChfLmF0dHIodGhpcy5lbCwgJ2lmJykgIT09IG51bGwpIHtcbiAgICAgIF8ud2FybihcbiAgICAgICAgJ0RvblxcJ3QgdXNlIHYtaWYgd2l0aCB2LXJlcGVhdC4gJyArXG4gICAgICAgICdVc2Ugdi1zaG93IG9yIHRoZSBcImZpbHRlckJ5XCIgZmlsdGVyIGluc3RlYWQuJ1xuICAgICAgKVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgaWYgdi1yZWYvIHYtZWwgaXMgYWxzbyBwcmVzZW50LlxuICAgKi9cblxuICBjaGVja1JlZjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBjaGlsZElkID0gXy5hdHRyKHRoaXMuZWwsICdyZWYnKVxuICAgIHRoaXMuY2hpbGRJZCA9IGNoaWxkSWRcbiAgICAgID8gdGhpcy52bS4kaW50ZXJwb2xhdGUoY2hpbGRJZClcbiAgICAgIDogbnVsbFxuICAgIHZhciBlbElkID0gXy5hdHRyKHRoaXMuZWwsICdlbCcpXG4gICAgdGhpcy5lbElkID0gZWxJZFxuICAgICAgPyB0aGlzLnZtLiRpbnRlcnBvbGF0ZShlbElkKVxuICAgICAgOiBudWxsXG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIHRoZSBjb21wb25lbnQgY29uc3RydWN0b3IgdG8gdXNlIGZvciByZXBlYXRlZFxuICAgKiBpbnN0YW5jZXMuIElmIHN0YXRpYyB3ZSByZXNvbHZlIGl0IG5vdywgb3RoZXJ3aXNlIGl0XG4gICAqIG5lZWRzIHRvIGJlIHJlc29sdmVkIGF0IGJ1aWxkIHRpbWUgd2l0aCBhY3R1YWwgZGF0YS5cbiAgICovXG5cbiAgY2hlY2tDb21wb25lbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWQgPSBfLmF0dHIodGhpcy5lbCwgJ2NvbXBvbmVudCcpXG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLnZtLiRvcHRpb25zXG4gICAgaWYgKCFpZCkge1xuICAgICAgdGhpcy5DdG9yID0gXy5WdWUgLy8gZGVmYXVsdCBjb25zdHJ1Y3RvclxuICAgICAgdGhpcy5pbmhlcml0ID0gdHJ1ZSAvLyBpbmxpbmUgcmVwZWF0cyBzaG91bGQgaW5oZXJpdFxuICAgICAgLy8gaW1wb3J0YW50OiB0cmFuc2NsdWRlIHdpdGggbm8gb3B0aW9ucywganVzdFxuICAgICAgLy8gdG8gZW5zdXJlIGJsb2NrIHN0YXJ0IGFuZCBibG9jayBlbmRcbiAgICAgIHRoaXMudGVtcGxhdGUgPSB0cmFuc2NsdWRlKHRoaXMudGVtcGxhdGUpXG4gICAgICB0aGlzLl9saW5rRm4gPSBjb21waWxlKHRoaXMudGVtcGxhdGUsIG9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FzQ29tcG9uZW50ID0gdHJ1ZVxuICAgICAgdmFyIHRva2VucyA9IHRleHRQYXJzZXIucGFyc2UoaWQpXG4gICAgICBpZiAoIXRva2VucykgeyAvLyBzdGF0aWMgY29tcG9uZW50XG4gICAgICAgIHZhciBDdG9yID0gdGhpcy5DdG9yID0gb3B0aW9ucy5jb21wb25lbnRzW2lkXVxuICAgICAgICBfLmFzc2VydEFzc2V0KEN0b3IsICdjb21wb25lbnQnLCBpZClcbiAgICAgICAgLy8gSWYgdGhlcmUncyBubyBwYXJlbnQgc2NvcGUgZGlyZWN0aXZlcyBhbmQgbm9cbiAgICAgICAgLy8gY29udGVudCB0byBiZSB0cmFuc2NsdWRlZCwgd2UgY2FuIG9wdGltaXplIHRoZVxuICAgICAgICAvLyByZW5kZXJpbmcgYnkgcHJlLXRyYW5zY2x1ZGluZyArIGNvbXBpbGluZyBoZXJlXG4gICAgICAgIC8vIGFuZCBwcm92aWRlIGEgbGluayBmdW5jdGlvbiB0byBldmVyeSBpbnN0YW5jZS5cbiAgICAgICAgaWYgKCF0aGlzLmVsLmhhc0NoaWxkTm9kZXMoKSAmJlxuICAgICAgICAgICAgIXRoaXMuZWwuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgICAgICAgLy8gbWVyZ2UgYW4gZW1wdHkgb2JqZWN0IHdpdGggb3duZXIgdm0gYXMgcGFyZW50XG4gICAgICAgICAgLy8gc28gY2hpbGQgdm1zIGNhbiBhY2Nlc3MgcGFyZW50IGFzc2V0cy5cbiAgICAgICAgICB2YXIgbWVyZ2VkID0gbWVyZ2VPcHRpb25zKEN0b3Iub3B0aW9ucywge30sIHtcbiAgICAgICAgICAgICRwYXJlbnQ6IHRoaXMudm1cbiAgICAgICAgICB9KVxuICAgICAgICAgIHRoaXMudGVtcGxhdGUgPSB0cmFuc2NsdWRlKHRoaXMudGVtcGxhdGUsIG1lcmdlZClcbiAgICAgICAgICB0aGlzLl9saW5rRm4gPSBjb21waWxlKHRoaXMudGVtcGxhdGUsIG1lcmdlZCwgZmFsc2UsIHRydWUpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHRvIGJlIHJlc29sdmVkIGxhdGVyXG4gICAgICAgIHZhciBjdG9yRXhwID0gdGV4dFBhcnNlci50b2tlbnNUb0V4cCh0b2tlbnMpXG4gICAgICAgIHRoaXMuY3RvckdldHRlciA9IGV4cFBhcnNlci5wYXJzZShjdG9yRXhwKS5nZXRcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFVwZGF0ZS5cbiAgICogVGhpcyBpcyBjYWxsZWQgd2hlbmV2ZXIgdGhlIEFycmF5IG11dGF0ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7QXJyYXl9IGRhdGFcbiAgICovXG5cbiAgdXBkYXRlOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGRhdGEgPSByYW5nZShkYXRhKVxuICAgIH1cbiAgICB0aGlzLnZtcyA9IHRoaXMuZGlmZihkYXRhIHx8IFtdLCB0aGlzLnZtcylcbiAgICAvLyB1cGRhdGUgdi1yZWZcbiAgICBpZiAodGhpcy5jaGlsZElkKSB7XG4gICAgICB0aGlzLnZtLiRbdGhpcy5jaGlsZElkXSA9IHRoaXMudm1zXG4gICAgfVxuICAgIGlmICh0aGlzLmVsSWQpIHtcbiAgICAgIHRoaXMudm0uJCRbdGhpcy5lbElkXSA9IHRoaXMudm1zLm1hcChmdW5jdGlvbiAodm0pIHtcbiAgICAgICAgcmV0dXJuIHZtLiRlbFxuICAgICAgfSlcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIERpZmYsIGJhc2VkIG9uIG5ldyBkYXRhIGFuZCBvbGQgZGF0YSwgZGV0ZXJtaW5lIHRoZVxuICAgKiBtaW5pbXVtIGFtb3VudCBvZiBET00gbWFuaXB1bGF0aW9ucyBuZWVkZWQgdG8gbWFrZSB0aGVcbiAgICogRE9NIHJlZmxlY3QgdGhlIG5ldyBkYXRhIEFycmF5LlxuICAgKlxuICAgKiBUaGUgYWxnb3JpdGhtIGRpZmZzIHRoZSBuZXcgZGF0YSBBcnJheSBieSBzdG9yaW5nIGFcbiAgICogaGlkZGVuIHJlZmVyZW5jZSB0byBhbiBvd25lciB2bSBpbnN0YW5jZSBvbiBwcmV2aW91c2x5XG4gICAqIHNlZW4gZGF0YS4gVGhpcyBhbGxvd3MgdXMgdG8gYWNoaWV2ZSBPKG4pIHdoaWNoIGlzXG4gICAqIGJldHRlciB0aGFuIGEgbGV2ZW5zaHRlaW4gZGlzdGFuY2UgYmFzZWQgYWxnb3JpdGhtLFxuICAgKiB3aGljaCBpcyBPKG0gKiBuKS5cbiAgICpcbiAgICogQHBhcmFtIHtBcnJheX0gZGF0YVxuICAgKiBAcGFyYW0ge0FycmF5fSBvbGRWbXNcbiAgICogQHJldHVybiB7QXJyYXl9XG4gICAqL1xuXG4gIGRpZmY6IGZ1bmN0aW9uIChkYXRhLCBvbGRWbXMpIHtcbiAgICB2YXIgaWRLZXkgPSB0aGlzLmlkS2V5XG4gICAgdmFyIGNvbnZlcnRlZCA9IHRoaXMuY29udmVydGVkXG4gICAgdmFyIHJlZiA9IHRoaXMucmVmXG4gICAgdmFyIGFsaWFzID0gdGhpcy5hcmdcbiAgICB2YXIgaW5pdCA9ICFvbGRWbXNcbiAgICB2YXIgdm1zID0gbmV3IEFycmF5KGRhdGEubGVuZ3RoKVxuICAgIHZhciBvYmosIHJhdywgdm0sIGksIGxcbiAgICAvLyBGaXJzdCBwYXNzLCBnbyB0aHJvdWdoIHRoZSBuZXcgQXJyYXkgYW5kIGZpbGwgdXBcbiAgICAvLyB0aGUgbmV3IHZtcyBhcnJheS4gSWYgYSBwaWVjZSBvZiBkYXRhIGhhcyBhIGNhY2hlZFxuICAgIC8vIGluc3RhbmNlIGZvciBpdCwgd2UgcmV1c2UgaXQuIE90aGVyd2lzZSBidWlsZCBhIG5ld1xuICAgIC8vIGluc3RhbmNlLlxuICAgIGZvciAoaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgb2JqID0gZGF0YVtpXVxuICAgICAgcmF3ID0gY29udmVydGVkID8gb2JqLnZhbHVlIDogb2JqXG4gICAgICB2bSA9ICFpbml0ICYmIHRoaXMuZ2V0Vm0ocmF3KVxuICAgICAgaWYgKHZtKSB7IC8vIHJldXNhYmxlIGluc3RhbmNlXG4gICAgICAgIHZtLl9yZXVzZWQgPSB0cnVlXG4gICAgICAgIHZtLiRpbmRleCA9IGkgLy8gdXBkYXRlICRpbmRleFxuICAgICAgICBpZiAoY29udmVydGVkKSB7XG4gICAgICAgICAgdm0uJGtleSA9IG9iai5rZXkgLy8gdXBkYXRlICRrZXlcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWRLZXkpIHsgLy8gc3dhcCB0cmFjayBieSBpZCBkYXRhXG4gICAgICAgICAgaWYgKGFsaWFzKSB7XG4gICAgICAgICAgICB2bVthbGlhc10gPSByYXdcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdm0uX3NldERhdGEocmF3KVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgLy8gbmV3IGluc3RhbmNlXG4gICAgICAgIHZtID0gdGhpcy5idWlsZChvYmosIGkpXG4gICAgICAgIHZtLl9uZXcgPSB0cnVlXG4gICAgICB9XG4gICAgICB2bXNbaV0gPSB2bVxuICAgICAgLy8gaW5zZXJ0IGlmIHRoaXMgaXMgZmlyc3QgcnVuXG4gICAgICBpZiAoaW5pdCkge1xuICAgICAgICB2bS4kYmVmb3JlKHJlZilcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgdGhpcyBpcyB0aGUgZmlyc3QgcnVuLCB3ZSdyZSBkb25lLlxuICAgIGlmIChpbml0KSB7XG4gICAgICByZXR1cm4gdm1zXG4gICAgfVxuICAgIC8vIFNlY29uZCBwYXNzLCBnbyB0aHJvdWdoIHRoZSBvbGQgdm0gaW5zdGFuY2VzIGFuZFxuICAgIC8vIGRlc3Ryb3kgdGhvc2Ugd2hvIGFyZSBub3QgcmV1c2VkIChhbmQgcmVtb3ZlIHRoZW1cbiAgICAvLyBmcm9tIGNhY2hlKVxuICAgIGZvciAoaSA9IDAsIGwgPSBvbGRWbXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2bSA9IG9sZFZtc1tpXVxuICAgICAgaWYgKCF2bS5fcmV1c2VkKSB7XG4gICAgICAgIHRoaXMudW5jYWNoZVZtKHZtKVxuICAgICAgICB2bS4kZGVzdHJveSh0cnVlKVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBmaW5hbCBwYXNzLCBtb3ZlL2luc2VydCBuZXcgaW5zdGFuY2VzIGludG8gdGhlXG4gICAgLy8gcmlnaHQgcGxhY2UuIFdlJ3JlIGdvaW5nIGluIHJldmVyc2UgaGVyZSBiZWNhdXNlXG4gICAgLy8gaW5zZXJ0QmVmb3JlIHJlbGllcyBvbiB0aGUgbmV4dCBzaWJsaW5nIHRvIGJlXG4gICAgLy8gcmVzb2x2ZWQuXG4gICAgdmFyIHRhcmdldE5leHQsIGN1cnJlbnROZXh0XG4gICAgaSA9IHZtcy5sZW5ndGhcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2bSA9IHZtc1tpXVxuICAgICAgLy8gdGhpcyBpcyB0aGUgdm0gdGhhdCB3ZSBzaG91bGQgYmUgaW4gZnJvbnQgb2ZcbiAgICAgIHRhcmdldE5leHQgPSB2bXNbaSArIDFdXG4gICAgICBpZiAoIXRhcmdldE5leHQpIHtcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgbGFzdCBpdGVtLiBJZiBpdCdzIHJldXNlZCB0aGVuXG4gICAgICAgIC8vIGV2ZXJ5dGhpbmcgZWxzZSB3aWxsIGV2ZW50dWFsbHkgYmUgaW4gdGhlIHJpZ2h0XG4gICAgICAgIC8vIHBsYWNlLCBzbyBubyBuZWVkIHRvIHRvdWNoIGl0LiBPdGhlcndpc2UsIGluc2VydFxuICAgICAgICAvLyBpdC5cbiAgICAgICAgaWYgKCF2bS5fcmV1c2VkKSB7XG4gICAgICAgICAgdm0uJGJlZm9yZShyZWYpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh2bS5fcmV1c2VkKSB7XG4gICAgICAgICAgLy8gdGhpcyBpcyB0aGUgdm0gd2UgYXJlIGFjdHVhbGx5IGluIGZyb250IG9mXG4gICAgICAgICAgY3VycmVudE5leHQgPSBmaW5kTmV4dFZtKHZtLCByZWYpXG4gICAgICAgICAgLy8gd2Ugb25seSBuZWVkIHRvIG1vdmUgaWYgd2UgYXJlIG5vdCBpbiB0aGUgcmlnaHRcbiAgICAgICAgICAvLyBwbGFjZSBhbHJlYWR5LlxuICAgICAgICAgIGlmIChjdXJyZW50TmV4dCAhPT0gdGFyZ2V0TmV4dCkge1xuICAgICAgICAgICAgdm0uJGJlZm9yZSh0YXJnZXROZXh0LiRlbCwgbnVsbCwgZmFsc2UpXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG5ldyBpbnN0YW5jZSwgaW5zZXJ0IHRvIGV4aXN0aW5nIG5leHRcbiAgICAgICAgICB2bS4kYmVmb3JlKHRhcmdldE5leHQuJGVsKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2bS5fbmV3ID0gZmFsc2VcbiAgICAgIHZtLl9yZXVzZWQgPSBmYWxzZVxuICAgIH1cbiAgICByZXR1cm4gdm1zXG4gIH0sXG5cbiAgLyoqXG4gICAqIEJ1aWxkIGEgbmV3IGluc3RhbmNlIGFuZCBjYWNoZSBpdC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGFcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4XG4gICAqL1xuXG4gIGJ1aWxkOiBmdW5jdGlvbiAoZGF0YSwgaW5kZXgpIHtcbiAgICB2YXIgb3JpZ2luYWwgPSBkYXRhXG4gICAgdmFyIG1ldGEgPSB7ICRpbmRleDogaW5kZXggfVxuICAgIGlmICh0aGlzLmNvbnZlcnRlZCkge1xuICAgICAgbWV0YS4ka2V5ID0gb3JpZ2luYWwua2V5XG4gICAgfVxuICAgIHZhciByYXcgPSB0aGlzLmNvbnZlcnRlZCA/IGRhdGEudmFsdWUgOiBkYXRhXG4gICAgdmFyIGFsaWFzID0gdGhpcy5hcmdcbiAgICB2YXIgaGFzQWxpYXMgPSAhaXNPYmplY3QocmF3KSB8fCBhbGlhc1xuICAgIC8vIHdyYXAgdGhlIHJhdyBkYXRhIHdpdGggYWxpYXNcbiAgICBkYXRhID0gaGFzQWxpYXMgPyB7fSA6IHJhd1xuICAgIGlmIChhbGlhcykge1xuICAgICAgZGF0YVthbGlhc10gPSByYXdcbiAgICB9IGVsc2UgaWYgKGhhc0FsaWFzKSB7XG4gICAgICBtZXRhLiR2YWx1ZSA9IHJhd1xuICAgIH1cbiAgICAvLyByZXNvbHZlIGNvbnN0cnVjdG9yXG4gICAgdmFyIEN0b3IgPSB0aGlzLkN0b3IgfHwgdGhpcy5yZXNvbHZlQ3RvcihkYXRhLCBtZXRhKVxuICAgIHZhciB2bSA9IHRoaXMudm0uJGFkZENoaWxkKHtcbiAgICAgIGVsOiB0ZW1wbGF0ZVBhcnNlci5jbG9uZSh0aGlzLnRlbXBsYXRlKSxcbiAgICAgIF9hc0NvbXBvbmVudDogdGhpcy5fYXNDb21wb25lbnQsXG4gICAgICBfbGlua0ZuOiB0aGlzLl9saW5rRm4sXG4gICAgICBfbWV0YTogbWV0YSxcbiAgICAgIGRhdGE6IGRhdGEsXG4gICAgICBpbmhlcml0OiB0aGlzLmluaGVyaXRcbiAgICB9LCBDdG9yKVxuICAgIC8vIGNhY2hlIGluc3RhbmNlXG4gICAgdGhpcy5jYWNoZVZtKHJhdywgdm0pXG4gICAgcmV0dXJuIHZtXG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlc29sdmUgYSBjb250cnVjdG9yIHRvIHVzZSBmb3IgYW4gaW5zdGFuY2UuXG4gICAqIFRoZSB0cmlja3kgcGFydCBoZXJlIGlzIHRoYXQgdGhlcmUgY291bGQgYmUgZHluYW1pY1xuICAgKiBjb21wb25lbnRzIGRlcGVuZGluZyBvbiBpbnN0YW5jZSBkYXRhLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YVxuICAgKiBAcGFyYW0ge09iamVjdH0gbWV0YVxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG5cbiAgcmVzb2x2ZUN0b3I6IGZ1bmN0aW9uIChkYXRhLCBtZXRhKSB7XG4gICAgLy8gY3JlYXRlIGEgdGVtcG9yYXJ5IGNvbnRleHQgb2JqZWN0IGFuZCBjb3B5IGRhdGFcbiAgICAvLyBhbmQgbWV0YSBwcm9wZXJ0aWVzIG9udG8gaXQuXG4gICAgLy8gdXNlIF8uZGVmaW5lIHRvIGF2b2lkIGFjY2lkZW50YWxseSBvdmVyd3JpdGluZyBzY29wZVxuICAgIC8vIHByb3BlcnRpZXMuXG4gICAgdmFyIGNvbnRleHQgPSBPYmplY3QuY3JlYXRlKHRoaXMudm0pXG4gICAgdmFyIGtleVxuICAgIGZvciAoa2V5IGluIGRhdGEpIHtcbiAgICAgIF8uZGVmaW5lKGNvbnRleHQsIGtleSwgZGF0YVtrZXldKVxuICAgIH1cbiAgICBmb3IgKGtleSBpbiBtZXRhKSB7XG4gICAgICBfLmRlZmluZShjb250ZXh0LCBrZXksIG1ldGFba2V5XSlcbiAgICB9XG4gICAgdmFyIGlkID0gdGhpcy5jdG9yR2V0dGVyLmNhbGwoY29udGV4dCwgY29udGV4dClcbiAgICB2YXIgQ3RvciA9IHRoaXMudm0uJG9wdGlvbnMuY29tcG9uZW50c1tpZF1cbiAgICBfLmFzc2VydEFzc2V0KEN0b3IsICdjb21wb25lbnQnLCBpZClcbiAgICByZXR1cm4gQ3RvclxuICB9LFxuXG4gIC8qKlxuICAgKiBVbmJpbmQsIHRlYXJkb3duIGV2ZXJ5dGhpbmdcbiAgICovXG5cbiAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuY2hpbGRJZCkge1xuICAgICAgZGVsZXRlIHRoaXMudm0uJFt0aGlzLmNoaWxkSWRdXG4gICAgfVxuICAgIGlmICh0aGlzLnZtcykge1xuICAgICAgdmFyIGkgPSB0aGlzLnZtcy5sZW5ndGhcbiAgICAgIHZhciB2bVxuICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICB2bSA9IHRoaXMudm1zW2ldXG4gICAgICAgIHRoaXMudW5jYWNoZVZtKHZtKVxuICAgICAgICB2bS4kZGVzdHJveSgpXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDYWNoZSBhIHZtIGluc3RhbmNlIGJhc2VkIG9uIGl0cyBkYXRhLlxuICAgKlxuICAgKiBJZiB0aGUgZGF0YSBpcyBhbiBvYmplY3QsIHdlIHNhdmUgdGhlIHZtJ3MgcmVmZXJlbmNlIG9uXG4gICAqIHRoZSBkYXRhIG9iamVjdCBhcyBhIGhpZGRlbiBwcm9wZXJ0eS4gT3RoZXJ3aXNlIHdlXG4gICAqIGNhY2hlIHRoZW0gaW4gYW4gb2JqZWN0IGFuZCBmb3IgZWFjaCBwcmltaXRpdmUgdmFsdWVcbiAgICogdGhlcmUgaXMgYW4gYXJyYXkgaW4gY2FzZSB0aGVyZSBhcmUgZHVwbGljYXRlcy5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGFcbiAgICogQHBhcmFtIHtWdWV9IHZtXG4gICAqL1xuXG4gIGNhY2hlVm06IGZ1bmN0aW9uIChkYXRhLCB2bSkge1xuICAgIHZhciBpZEtleSA9IHRoaXMuaWRLZXlcbiAgICB2YXIgY2FjaGUgPSB0aGlzLmNhY2hlXG4gICAgdmFyIGlkXG4gICAgaWYgKGlkS2V5KSB7XG4gICAgICBpZCA9IGRhdGFbaWRLZXldXG4gICAgICBpZiAoIWNhY2hlW2lkXSkge1xuICAgICAgICBjYWNoZVtpZF0gPSB2bVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgXy53YXJuKCdEdXBsaWNhdGUgSUQgaW4gdi1yZXBlYXQ6ICcgKyBpZClcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICBpZCA9IHRoaXMuaWRcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICBpZiAoZGF0YVtpZF0gPT09IG51bGwpIHtcbiAgICAgICAgICBkYXRhW2lkXSA9IHZtXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgXy53YXJuKFxuICAgICAgICAgICAgJ0R1cGxpY2F0ZSBvYmplY3RzIGFyZSBub3Qgc3VwcG9ydGVkIGluIHYtcmVwZWF0LidcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIF8uZGVmaW5lKGRhdGEsIHRoaXMuaWQsIHZtKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWNhY2hlW2RhdGFdKSB7XG4gICAgICAgIGNhY2hlW2RhdGFdID0gW3ZtXVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FjaGVbZGF0YV0ucHVzaCh2bSlcbiAgICAgIH1cbiAgICB9XG4gICAgdm0uX3JhdyA9IGRhdGFcbiAgfSxcblxuICAvKipcbiAgICogVHJ5IHRvIGdldCBhIGNhY2hlZCBpbnN0YW5jZSBmcm9tIGEgcGllY2Ugb2YgZGF0YS5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGFcbiAgICogQHJldHVybiB7VnVlfHVuZGVmaW5lZH1cbiAgICovXG5cbiAgZ2V0Vm06IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKHRoaXMuaWRLZXkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlW2RhdGFbdGhpcy5pZEtleV1dXG4gICAgfSBlbHNlIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgICAgcmV0dXJuIGRhdGFbdGhpcy5pZF1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGNhY2hlZCA9IHRoaXMuY2FjaGVbZGF0YV1cbiAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgdmFyIGkgPSAwXG4gICAgICAgIHZhciB2bSA9IGNhY2hlZFtpXVxuICAgICAgICAvLyBzaW5jZSBkdXBsaWNhdGVkIHZtIGluc3RhbmNlcyBtaWdodCBiZSBhIHJldXNlZFxuICAgICAgICAvLyBvbmUgT1IgYSBuZXdseSBjcmVhdGVkIG9uZSwgd2UgbmVlZCB0byByZXR1cm4gdGhlXG4gICAgICAgIC8vIGZpcnN0IGluc3RhbmNlIHRoYXQgaXMgbmVpdGhlciBvZiB0aGVzZS5cbiAgICAgICAgd2hpbGUgKHZtICYmICh2bS5fcmV1c2VkIHx8IHZtLl9uZXcpKSB7XG4gICAgICAgICAgdm0gPSBjYWNoZWRbKytpXVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2bVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogRGVsZXRlIGEgY2FjaGVkIHZtIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0ge1Z1ZX0gdm1cbiAgICovXG5cbiAgdW5jYWNoZVZtOiBmdW5jdGlvbiAodm0pIHtcbiAgICB2YXIgZGF0YSA9IHZtLl9yYXdcbiAgICBpZiAodGhpcy5pZEtleSkge1xuICAgICAgdGhpcy5jYWNoZVtkYXRhW3RoaXMuaWRLZXldXSA9IG51bGxcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgdm0uX3JhdyA9IG51bGxcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jYWNoZVtkYXRhXS5wb3AoKVxuICAgIH1cbiAgfVxuXG59XG5cbi8qKlxuICogSGVscGVyIHRvIGZpbmQgdGhlIG5leHQgZWxlbWVudCB0aGF0IGlzIGFuIGluc3RhbmNlXG4gKiByb290IG5vZGUuIFRoaXMgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYSBkZXN0cm95ZWQgdm0nc1xuICogZWxlbWVudCBjb3VsZCBzdGlsbCBiZSBsaW5nZXJpbmcgaW4gdGhlIERPTSBiZWZvcmUgaXRzXG4gKiBsZWF2aW5nIHRyYW5zaXRpb24gZmluaXNoZXMsIGJ1dCBpdHMgX192dWVfXyByZWZlcmVuY2VcbiAqIHNob3VsZCBoYXZlIGJlZW4gcmVtb3ZlZCBzbyB3ZSBjYW4gc2tpcCB0aGVtLlxuICpcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtDb21tZW50Tm9kZX0gcmVmXG4gKiBAcmV0dXJuIHtWdWV9XG4gKi9cblxuZnVuY3Rpb24gZmluZE5leHRWbSAodm0sIHJlZikge1xuICB2YXIgZWwgPSAodm0uX2Jsb2NrRW5kIHx8IHZtLiRlbCkubmV4dFNpYmxpbmdcbiAgd2hpbGUgKCFlbC5fX3Z1ZV9fICYmIGVsICE9PSByZWYpIHtcbiAgICBlbCA9IGVsLm5leHRTaWJsaW5nXG4gIH1cbiAgcmV0dXJuIGVsLl9fdnVlX19cbn1cblxuLyoqXG4gKiBBdHRlbXB0IHRvIGNvbnZlcnQgbm9uLUFycmF5IG9iamVjdHMgdG8gYXJyYXkuXG4gKiBUaGlzIGlzIHRoZSBkZWZhdWx0IGZpbHRlciBpbnN0YWxsZWQgdG8gZXZlcnkgdi1yZXBlYXRcbiAqIGRpcmVjdGl2ZS5cbiAqXG4gKiBJdCB3aWxsIGJlIGNhbGxlZCB3aXRoICoqdGhlIGRpcmVjdGl2ZSoqIGFzIGB0aGlzYFxuICogY29udGV4dCBzbyB0aGF0IHdlIGNhbiBtYXJrIHRoZSByZXBlYXQgYXJyYXkgYXMgY29udmVydGVkXG4gKiBmcm9tIGFuIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0geyp9IG9ialxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG9ialRvQXJyYXkgKG9iaikge1xuICBpZiAoIV8uaXNQbGFpbk9iamVjdChvYmopKSB7XG4gICAgcmV0dXJuIG9ialxuICB9XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICB2YXIgaSA9IGtleXMubGVuZ3RoXG4gIHZhciByZXMgPSBuZXcgQXJyYXkoaSlcbiAgdmFyIGtleVxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXVxuICAgIHJlc1tpXSA9IHtcbiAgICAgIGtleToga2V5LFxuICAgICAgdmFsdWU6IG9ialtrZXldXG4gICAgfVxuICB9XG4gIC8vIGB0aGlzYCBwb2ludHMgdG8gdGhlIHJlcGVhdCBkaXJlY3RpdmUgaW5zdGFuY2VcbiAgdGhpcy5jb252ZXJ0ZWQgPSB0cnVlXG4gIHJldHVybiByZXNcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSByYW5nZSBhcnJheSBmcm9tIGdpdmVuIG51bWJlci5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gblxuICogQHJldHVybiB7QXJyYXl9XG4gKi9cblxuZnVuY3Rpb24gcmFuZ2UgKG4pIHtcbiAgdmFyIGkgPSAtMVxuICB2YXIgcmV0ID0gbmV3IEFycmF5KG4pXG4gIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgcmV0W2ldID0gaVxuICB9XG4gIHJldHVybiByZXRcbn1cbn0se1wiLi4vY29tcGlsZXIvY29tcGlsZVwiOjExLFwiLi4vY29tcGlsZXIvdHJhbnNjbHVkZVwiOjEyLFwiLi4vcGFyc2Vycy9leHByZXNzaW9uXCI6NDksXCIuLi9wYXJzZXJzL3RlbXBsYXRlXCI6NTEsXCIuLi9wYXJzZXJzL3RleHRcIjo1MixcIi4uL3V0aWxcIjo2MCxcIi4uL3V0aWwvbWVyZ2Utb3B0aW9uXCI6NjJ9XSwzMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgdHJhbnNpdGlvbiA9IHJlcXVpcmUoJy4uL3RyYW5zaXRpb24nKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICB2YXIgZWwgPSB0aGlzLmVsXG4gIHRyYW5zaXRpb24uYXBwbHkoZWwsIHZhbHVlID8gMSA6IC0xLCBmdW5jdGlvbiAoKSB7XG4gICAgZWwuc3R5bGUuZGlzcGxheSA9IHZhbHVlID8gJycgOiAnbm9uZSdcbiAgfSwgdGhpcy52bSlcbn1cbn0se1wiLi4vdHJhbnNpdGlvblwiOjU0fV0sMzQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBwcmVmaXhlcyA9IFsnLXdlYmtpdC0nLCAnLW1vei0nLCAnLW1zLSddXG52YXIgY2FtZWxQcmVmaXhlcyA9IFsnV2Via2l0JywgJ01veicsICdtcyddXG52YXIgaW1wb3J0YW50UkUgPSAvIWltcG9ydGFudDs/JC9cbnZhciBjYW1lbFJFID0gLyhbYS16XSkoW0EtWl0pL2dcbnZhciB0ZXN0RWwgPSBudWxsXG52YXIgcHJvcENhY2hlID0ge31cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZGVlcDogdHJ1ZSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh0aGlzLmFyZykge1xuICAgICAgdGhpcy5zZXRQcm9wKHRoaXMuYXJnLCB2YWx1ZSlcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgLy8gY2FjaGUgb2JqZWN0IHN0eWxlcyBzbyB0aGF0IG9ubHkgY2hhbmdlZCBwcm9wc1xuICAgICAgICAvLyBhcmUgYWN0dWFsbHkgdXBkYXRlZC5cbiAgICAgICAgaWYgKCF0aGlzLmNhY2hlKSB0aGlzLmNhY2hlID0ge31cbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiB2YWx1ZSkge1xuICAgICAgICAgIHRoaXMuc2V0UHJvcChwcm9wLCB2YWx1ZVtwcm9wXSlcbiAgICAgICAgICAvKiBqc2hpbnQgZXFlcWVxOiBmYWxzZSAqL1xuICAgICAgICAgIGlmICh2YWx1ZVtwcm9wXSAhPSB0aGlzLmNhY2hlW3Byb3BdKSB7XG4gICAgICAgICAgICB0aGlzLmNhY2hlW3Byb3BdID0gdmFsdWVbcHJvcF1cbiAgICAgICAgICAgIHRoaXMuc2V0UHJvcChwcm9wLCB2YWx1ZVtwcm9wXSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWwuc3R5bGUuY3NzVGV4dCA9IHZhbHVlXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHNldFByb3A6IGZ1bmN0aW9uIChwcm9wLCB2YWx1ZSkge1xuICAgIHByb3AgPSBub3JtYWxpemUocHJvcClcbiAgICBpZiAoIXByb3ApIHJldHVybiAvLyB1bnN1cHBvcnRlZCBwcm9wXG4gICAgLy8gY2FzdCBwb3NzaWJsZSBudW1iZXJzL2Jvb2xlYW5zIGludG8gc3RyaW5nc1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB2YWx1ZSArPSAnJ1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdmFyIGlzSW1wb3J0YW50ID0gaW1wb3J0YW50UkUudGVzdCh2YWx1ZSlcbiAgICAgICAgPyAnaW1wb3J0YW50J1xuICAgICAgICA6ICcnXG4gICAgICBpZiAoaXNJbXBvcnRhbnQpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKGltcG9ydGFudFJFLCAnJykudHJpbSgpXG4gICAgICB9XG4gICAgICB0aGlzLmVsLnN0eWxlLnNldFByb3BlcnR5KHByb3AsIHZhbHVlLCBpc0ltcG9ydGFudClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wKVxuICAgIH1cbiAgfVxuXG59XG5cbi8qKlxuICogTm9ybWFsaXplIGEgQ1NTIHByb3BlcnR5IG5hbWUuXG4gKiAtIGNhY2hlIHJlc3VsdFxuICogLSBhdXRvIHByZWZpeFxuICogLSBjYW1lbENhc2UgLT4gZGFzaC1jYXNlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHByb3BcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiBub3JtYWxpemUgKHByb3ApIHtcbiAgaWYgKHByb3BDYWNoZVtwcm9wXSkge1xuICAgIHJldHVybiBwcm9wQ2FjaGVbcHJvcF1cbiAgfVxuICB2YXIgcmVzID0gcHJlZml4KHByb3ApXG4gIHByb3BDYWNoZVtwcm9wXSA9IHByb3BDYWNoZVtyZXNdID0gcmVzXG4gIHJldHVybiByZXNcbn1cblxuLyoqXG4gKiBBdXRvIGRldGVjdCB0aGUgYXBwcm9wcmlhdGUgcHJlZml4IGZvciBhIENTUyBwcm9wZXJ0eS5cbiAqIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL3BhdWxpcmlzaC81MjM2OTJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJvcFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIHByZWZpeCAocHJvcCkge1xuICBwcm9wID0gcHJvcC5yZXBsYWNlKGNhbWVsUkUsICckMS0kMicpLnRvTG93ZXJDYXNlKClcbiAgdmFyIGNhbWVsID0gXy5jYW1lbGl6ZShwcm9wKVxuICB2YXIgdXBwZXIgPSBjYW1lbC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNhbWVsLnNsaWNlKDEpXG4gIGlmICghdGVzdEVsKSB7XG4gICAgdGVzdEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgfVxuICBpZiAoY2FtZWwgaW4gdGVzdEVsLnN0eWxlKSB7XG4gICAgcmV0dXJuIHByb3BcbiAgfVxuICB2YXIgaSA9IHByZWZpeGVzLmxlbmd0aFxuICB2YXIgcHJlZml4ZWRcbiAgd2hpbGUgKGktLSkge1xuICAgIHByZWZpeGVkID0gY2FtZWxQcmVmaXhlc1tpXSArIHVwcGVyXG4gICAgaWYgKHByZWZpeGVkIGluIHRlc3RFbC5zdHlsZSkge1xuICAgICAgcmV0dXJuIHByZWZpeGVzW2ldICsgcHJvcFxuICAgIH1cbiAgfVxufVxufSx7XCIuLi91dGlsXCI6NjB9XSwzNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hdHRyID0gdGhpcy5lbC5ub2RlVHlwZSA9PT0gM1xuICAgICAgPyAnbm9kZVZhbHVlJ1xuICAgICAgOiAndGV4dENvbnRlbnQnXG4gIH0sXG5cbiAgdXBkYXRlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB0aGlzLmVsW3RoaXMuYXR0cl0gPSBfLnRvU3RyaW5nKHZhbHVlKVxuICB9XG4gIFxufVxufSx7XCIuLi91dGlsXCI6NjB9XSwzNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBwcmlvcml0eTogMTAwMCxcbiAgaXNMaXRlcmFsOiB0cnVlLFxuXG4gIGJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsLl9fdl90cmFucyA9IHtcbiAgICAgIGlkOiB0aGlzLmV4cHJlc3Npb25cbiAgICB9XG4gIH1cblxufVxufSx7fV0sMzc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBXYXRjaGVyID0gcmVxdWlyZSgnLi4vd2F0Y2hlcicpXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIHByaW9yaXR5OiA5MDAsXG5cbiAgYmluZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2bSA9IHRoaXMudm1cbiAgICBpZiAodGhpcy5lbCAhPT0gdm0uJGVsKSB7XG4gICAgICBfLndhcm4oXG4gICAgICAgICd2LXdpdGggY2FuIG9ubHkgYmUgdXNlZCBvbiBpbnN0YW5jZSByb290IGVsZW1lbnRzLidcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKCF2bS4kcGFyZW50KSB7XG4gICAgICBfLndhcm4oXG4gICAgICAgICd2LXdpdGggbXVzdCBiZSB1c2VkIG9uIGFuIGluc3RhbmNlIHdpdGggYSBwYXJlbnQuJ1xuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5ID0gdGhpcy5hcmdcbiAgICAgIHRoaXMud2F0Y2hlciA9IG5ldyBXYXRjaGVyKFxuICAgICAgICB2bS4kcGFyZW50LFxuICAgICAgICB0aGlzLmV4cHJlc3Npb24sXG4gICAgICAgIGtleVxuICAgICAgICAgID8gZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICB2bS4kc2V0KGtleSwgdmFsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICB2bS4kZGF0YSA9IHZhbFxuICAgICAgICAgICAgfVxuICAgICAgKVxuICAgICAgLy8gaW5pdGlhbCBzZXRcbiAgICAgIHZhciBpbml0aWFsVmFsID0gdGhpcy53YXRjaGVyLnZhbHVlXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZtLiRzZXQoa2V5LCBpbml0aWFsVmFsKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdm0uJGRhdGEgPSBpbml0aWFsVmFsXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHVuYmluZDogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLndhdGNoZXIpIHtcbiAgICAgIHRoaXMud2F0Y2hlci50ZWFyZG93bigpXG4gICAgfVxuICB9XG5cbn1cbn0se1wiLi4vdXRpbFwiOjYwLFwiLi4vd2F0Y2hlclwiOjY0fV0sMzg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBQYXRoID0gcmVxdWlyZSgnLi4vcGFyc2Vycy9wYXRoJylcblxuLyoqXG4gKiBGaWx0ZXIgZmlsdGVyIGZvciB2LXJlcGVhdFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWFyY2hLZXlcbiAqIEBwYXJhbSB7U3RyaW5nfSBbZGVsaW1pdGVyXVxuICogQHBhcmFtIHtTdHJpbmd9IGRhdGFLZXlcbiAqL1xuXG5leHBvcnRzLmZpbHRlckJ5ID0gZnVuY3Rpb24gKGFyciwgc2VhcmNoS2V5LCBkZWxpbWl0ZXIsIGRhdGFLZXkpIHtcbiAgLy8gYWxsb3cgb3B0aW9uYWwgYGluYCBkZWxpbWl0ZXJcbiAgLy8gYmVjYXVzZSB3aHkgbm90XG4gIGlmIChkZWxpbWl0ZXIgJiYgZGVsaW1pdGVyICE9PSAnaW4nKSB7XG4gICAgZGF0YUtleSA9IGRlbGltaXRlclxuICB9XG4gIC8vIGdldCB0aGUgc2VhcmNoIHN0cmluZ1xuICB2YXIgc2VhcmNoID1cbiAgICBfLnN0cmlwUXVvdGVzKHNlYXJjaEtleSkgfHxcbiAgICB0aGlzLiRnZXQoc2VhcmNoS2V5KVxuICBpZiAoIXNlYXJjaCkge1xuICAgIHJldHVybiBhcnJcbiAgfVxuICBzZWFyY2ggPSAoJycgKyBzZWFyY2gpLnRvTG93ZXJDYXNlKClcbiAgLy8gZ2V0IHRoZSBvcHRpb25hbCBkYXRhS2V5XG4gIGRhdGFLZXkgPVxuICAgIGRhdGFLZXkgJiZcbiAgICAoXy5zdHJpcFF1b3RlcyhkYXRhS2V5KSB8fCB0aGlzLiRnZXQoZGF0YUtleSkpXG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgcmV0dXJuIGRhdGFLZXlcbiAgICAgID8gY29udGFpbnMoUGF0aC5nZXQoaXRlbSwgZGF0YUtleSksIHNlYXJjaClcbiAgICAgIDogY29udGFpbnMoaXRlbSwgc2VhcmNoKVxuICB9KVxufVxuXG4vKipcbiAqIEZpbHRlciBmaWx0ZXIgZm9yIHYtcmVwZWF0XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNvcnRLZXlcbiAqIEBwYXJhbSB7U3RyaW5nfSByZXZlcnNlS2V5XG4gKi9cblxuZXhwb3J0cy5vcmRlckJ5ID0gZnVuY3Rpb24gKGFyciwgc29ydEtleSwgcmV2ZXJzZUtleSkge1xuICB2YXIga2V5ID1cbiAgICBfLnN0cmlwUXVvdGVzKHNvcnRLZXkpIHx8XG4gICAgdGhpcy4kZ2V0KHNvcnRLZXkpXG4gIGlmICgha2V5KSB7XG4gICAgcmV0dXJuIGFyclxuICB9XG4gIHZhciBvcmRlciA9IDFcbiAgaWYgKHJldmVyc2VLZXkpIHtcbiAgICBpZiAocmV2ZXJzZUtleSA9PT0gJy0xJykge1xuICAgICAgb3JkZXIgPSAtMVxuICAgIH0gZWxzZSBpZiAocmV2ZXJzZUtleS5jaGFyQ29kZUF0KDApID09PSAweDIxKSB7IC8vICFcbiAgICAgIHJldmVyc2VLZXkgPSByZXZlcnNlS2V5LnNsaWNlKDEpXG4gICAgICBvcmRlciA9IHRoaXMuJGdldChyZXZlcnNlS2V5KSA/IDEgOiAtMVxuICAgIH0gZWxzZSB7XG4gICAgICBvcmRlciA9IHRoaXMuJGdldChyZXZlcnNlS2V5KSA/IC0xIDogMVxuICAgIH1cbiAgfVxuICAvLyBzb3J0IG9uIGEgY29weSB0byBhdm9pZCBtdXRhdGluZyBvcmlnaW5hbCBhcnJheVxuICByZXR1cm4gYXJyLnNsaWNlKCkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIGEgPSBQYXRoLmdldChhLCBrZXkpXG4gICAgYiA9IFBhdGguZ2V0KGIsIGtleSlcbiAgICByZXR1cm4gYSA9PT0gYiA/IDAgOiBhID4gYiA/IG9yZGVyIDogLW9yZGVyXG4gIH0pXG59XG5cbi8qKlxuICogU3RyaW5nIGNvbnRhaW4gaGVscGVyXG4gKlxuICogQHBhcmFtIHsqfSB2YWxcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWFyY2hcbiAqL1xuXG5mdW5jdGlvbiBjb250YWlucyAodmFsLCBzZWFyY2gpIHtcbiAgaWYgKF8uaXNPYmplY3QodmFsKSkge1xuICAgIGZvciAodmFyIGtleSBpbiB2YWwpIHtcbiAgICAgIGlmIChjb250YWlucyh2YWxba2V5XSwgc2VhcmNoKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmICh2YWwgIT0gbnVsbCkge1xuICAgIHJldHVybiB2YWwudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoKSA+IC0xXG4gIH1cbn1cbn0se1wiLi4vcGFyc2Vycy9wYXRoXCI6NTAsXCIuLi91dGlsXCI6NjB9XSwzOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxuXG4vKipcbiAqIFN0cmluZ2lmeSB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaW5kZW50XG4gKi9cblxuZXhwb3J0cy5qc29uID0ge1xuICByZWFkOiBmdW5jdGlvbiAodmFsdWUsIGluZGVudCkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnXG4gICAgICA/IHZhbHVlXG4gICAgICA6IEpTT04uc3RyaW5naWZ5KHZhbHVlLCBudWxsLCBOdW1iZXIoaW5kZW50KSB8fCAyKVxuICB9LFxuICB3cml0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlKVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqICdhYmMnID0+ICdBYmMnXG4gKi9cblxuZXhwb3J0cy5jYXBpdGFsaXplID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHJldHVybiAnJ1xuICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKClcbiAgcmV0dXJuIHZhbHVlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdmFsdWUuc2xpY2UoMSlcbn1cblxuLyoqXG4gKiAnYWJjJyA9PiAnQUJDJ1xuICovXG5cbmV4cG9ydHMudXBwZXJjYXNlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgfHwgdmFsdWUgPT09IDApXG4gICAgPyB2YWx1ZS50b1N0cmluZygpLnRvVXBwZXJDYXNlKClcbiAgICA6ICcnXG59XG5cbi8qKlxuICogJ0FiQycgPT4gJ2FiYydcbiAqL1xuXG5leHBvcnRzLmxvd2VyY2FzZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlIHx8IHZhbHVlID09PSAwKVxuICAgID8gdmFsdWUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpXG4gICAgOiAnJ1xufVxuXG4vKipcbiAqIDEyMzQ1ID0+ICQxMiwzNDUuMDBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc2lnblxuICovXG5cbnZhciBkaWdpdHNSRSA9IC8oXFxkezN9KSg/PVxcZCkvZ1xuXG5leHBvcnRzLmN1cnJlbmN5ID0gZnVuY3Rpb24gKHZhbHVlLCBzaWduKSB7XG4gIHZhbHVlID0gcGFyc2VGbG9hdCh2YWx1ZSlcbiAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkgcmV0dXJuICcnXG4gIHNpZ24gPSBzaWduIHx8ICckJ1xuICB2YXIgcyA9IE1hdGguZmxvb3IoTWF0aC5hYnModmFsdWUpKS50b1N0cmluZygpLFxuICAgIGkgPSBzLmxlbmd0aCAlIDMsXG4gICAgaCA9IGkgPiAwXG4gICAgICA/IChzLnNsaWNlKDAsIGkpICsgKHMubGVuZ3RoID4gMyA/ICcsJyA6ICcnKSlcbiAgICAgIDogJycsXG4gICAgZiA9ICcuJyArIHZhbHVlLnRvRml4ZWQoMikuc2xpY2UoLTIpXG4gIHJldHVybiAodmFsdWUgPCAwID8gJy0nIDogJycpICtcbiAgICBzaWduICsgaCArIHMuc2xpY2UoaSkucmVwbGFjZShkaWdpdHNSRSwgJyQxLCcpICsgZlxufVxuXG4vKipcbiAqICdpdGVtJyA9PiAnaXRlbXMnXG4gKlxuICogQHBhcmFtc1xuICogIGFuIGFycmF5IG9mIHN0cmluZ3MgY29ycmVzcG9uZGluZyB0b1xuICogIHRoZSBzaW5nbGUsIGRvdWJsZSwgdHJpcGxlIC4uLiBmb3JtcyBvZiB0aGUgd29yZCB0b1xuICogIGJlIHBsdXJhbGl6ZWQuIFdoZW4gdGhlIG51bWJlciB0byBiZSBwbHVyYWxpemVkXG4gKiAgZXhjZWVkcyB0aGUgbGVuZ3RoIG9mIHRoZSBhcmdzLCBpdCB3aWxsIHVzZSB0aGUgbGFzdFxuICogIGVudHJ5IGluIHRoZSBhcnJheS5cbiAqXG4gKiAgZS5nLiBbJ3NpbmdsZScsICdkb3VibGUnLCAndHJpcGxlJywgJ211bHRpcGxlJ11cbiAqL1xuXG5leHBvcnRzLnBsdXJhbGl6ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICB2YXIgYXJncyA9IF8udG9BcnJheShhcmd1bWVudHMsIDEpXG4gIHJldHVybiBhcmdzLmxlbmd0aCA+IDFcbiAgICA/IChhcmdzW3ZhbHVlICUgMTAgLSAxXSB8fCBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0pXG4gICAgOiAoYXJnc1swXSArICh2YWx1ZSA9PT0gMSA/ICcnIDogJ3MnKSlcbn1cblxuLyoqXG4gKiBBIHNwZWNpYWwgZmlsdGVyIHRoYXQgdGFrZXMgYSBoYW5kbGVyIGZ1bmN0aW9uLFxuICogd3JhcHMgaXQgc28gaXQgb25seSBnZXRzIHRyaWdnZXJlZCBvbiBzcGVjaWZpY1xuICoga2V5cHJlc3Nlcy4gdi1vbiBvbmx5LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqL1xuXG52YXIga2V5Q29kZXMgPSB7XG4gIGVudGVyICAgIDogMTMsXG4gIHRhYiAgICAgIDogOSxcbiAgJ2RlbGV0ZScgOiA0NixcbiAgdXAgICAgICAgOiAzOCxcbiAgbGVmdCAgICAgOiAzNyxcbiAgcmlnaHQgICAgOiAzOSxcbiAgZG93biAgICAgOiA0MCxcbiAgZXNjICAgICAgOiAyN1xufVxuXG5leHBvcnRzLmtleSA9IGZ1bmN0aW9uIChoYW5kbGVyLCBrZXkpIHtcbiAgaWYgKCFoYW5kbGVyKSByZXR1cm5cbiAgdmFyIGNvZGUgPSBrZXlDb2Rlc1trZXldXG4gIGlmICghY29kZSkge1xuICAgIGNvZGUgPSBwYXJzZUludChrZXksIDEwKVxuICB9XG4gIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IGNvZGUpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLmNhbGwodGhpcywgZSlcbiAgICB9XG4gIH1cbn1cblxuLy8gZXhwb3NlIGtleWNvZGUgaGFzaFxuZXhwb3J0cy5rZXkua2V5Q29kZXMgPSBrZXlDb2Rlc1xuXG4vKipcbiAqIEluc3RhbGwgc3BlY2lhbCBhcnJheSBmaWx0ZXJzXG4gKi9cblxuXy5leHRlbmQoZXhwb3J0cywgcmVxdWlyZSgnLi9hcnJheS1maWx0ZXJzJykpXG59LHtcIi4uL3V0aWxcIjo2MCxcIi4vYXJyYXktZmlsdGVyc1wiOjM4fV0sNDA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBEaXJlY3RpdmUgPSByZXF1aXJlKCcuLi9kaXJlY3RpdmUnKVxudmFyIGNvbXBpbGUgPSByZXF1aXJlKCcuLi9jb21waWxlci9jb21waWxlJylcbnZhciB0cmFuc2NsdWRlID0gcmVxdWlyZSgnLi4vY29tcGlsZXIvdHJhbnNjbHVkZScpXG5cbi8qKlxuICogVHJhbnNjbHVkZSwgY29tcGlsZSBhbmQgbGluayBlbGVtZW50LlxuICpcbiAqIElmIGEgcHJlLWNvbXBpbGVkIGxpbmtlciBpcyBhdmFpbGFibGUsIHRoYXQgbWVhbnMgdGhlXG4gKiBwYXNzZWQgaW4gZWxlbWVudCB3aWxsIGJlIHByZS10cmFuc2NsdWRlZCBhbmQgY29tcGlsZWRcbiAqIGFzIHdlbGwgLSBhbGwgd2UgbmVlZCB0byBkbyBpcyB0byBjYWxsIHRoZSBsaW5rZXIuXG4gKlxuICogT3RoZXJ3aXNlIHdlIG5lZWQgdG8gY2FsbCB0cmFuc2NsdWRlL2NvbXBpbGUvbGluayBoZXJlLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge0VsZW1lbnR9XG4gKi9cblxuZXhwb3J0cy5fY29tcGlsZSA9IGZ1bmN0aW9uIChlbCkge1xuICB2YXIgb3B0aW9ucyA9IHRoaXMuJG9wdGlvbnNcbiAgdmFyIHBhcmVudCA9IG9wdGlvbnMuX3BhcmVudFxuICBpZiAob3B0aW9ucy5fbGlua0ZuKSB7XG4gICAgdGhpcy5faW5pdEVsZW1lbnQoZWwpXG4gICAgb3B0aW9ucy5fbGlua0ZuKHRoaXMsIGVsKVxuICB9IGVsc2Uge1xuICAgIHZhciByYXcgPSBlbFxuICAgIGlmIChvcHRpb25zLl9hc0NvbXBvbmVudCkge1xuICAgICAgLy8gc2VwYXJhdGUgY29udGFpbmVyIGVsZW1lbnQgYW5kIGNvbnRlbnRcbiAgICAgIHZhciBjb250ZW50ID0gb3B0aW9ucy5fY29udGVudCA9IF8uZXh0cmFjdENvbnRlbnQocmF3KVxuICAgICAgLy8gY3JlYXRlIHR3byBzZXBhcmF0ZSBsaW5la3JzIGZvciBjb250YWluZXIgYW5kIGNvbnRlbnRcbiAgICAgIHZhciBwYXJlbnRPcHRpb25zID0gcGFyZW50LiRvcHRpb25zXG4gICAgICBcbiAgICAgIC8vIGhhY2s6IHdlIG5lZWQgdG8gc2tpcCB0aGUgcGFyYW1BdHRyaWJ1dGVzIGZvciB0aGlzXG4gICAgICAvLyBjaGlsZCBpbnN0YW5jZSB3aGVuIGNvbXBpbGluZyBpdHMgcGFyZW50IGNvbnRhaW5lclxuICAgICAgLy8gbGlua2VyLiB0aGVyZSBjb3VsZCBiZSBhIGJldHRlciB3YXkgdG8gZG8gdGhpcy5cbiAgICAgIHBhcmVudE9wdGlvbnMuX3NraXBBdHRycyA9IG9wdGlvbnMucGFyYW1BdHRyaWJ1dGVzXG4gICAgICB2YXIgY29udGFpbmVyTGlua0ZuID1cbiAgICAgICAgY29tcGlsZShyYXcsIHBhcmVudE9wdGlvbnMsIHRydWUsIHRydWUpXG4gICAgICBwYXJlbnRPcHRpb25zLl9za2lwQXR0cnMgPSBudWxsXG5cbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIHZhciBjb250ZW50TGlua0ZuID1cbiAgICAgICAgICBjb21waWxlKGNvbnRlbnQsIHBhcmVudE9wdGlvbnMsIHRydWUpXG4gICAgICAgIC8vIGNhbGwgY29udGVudCBsaW5rZXIgbm93LCBiZWZvcmUgdHJhbnNjbHVzaW9uXG4gICAgICAgIHRoaXMuX2NvbnRlbnRVbmxpbmtGbiA9IGNvbnRlbnRMaW5rRm4ocGFyZW50LCBjb250ZW50KVxuICAgICAgfVxuICAgICAgLy8gdHJhbmNsdWRlLCB0aGlzIHBvc3NpYmx5IHJlcGxhY2VzIG9yaWdpbmFsXG4gICAgICBlbCA9IHRyYW5zY2x1ZGUoZWwsIG9wdGlvbnMpXG4gICAgICB0aGlzLl9pbml0RWxlbWVudChlbClcbiAgICAgIC8vIG5vdyBjYWxsIHRoZSBjb250YWluZXIgbGlua2VyIG9uIHRoZSByZXNvbHZlZCBlbFxuICAgICAgdGhpcy5fY29udGFpbmVyVW5saW5rRm4gPSBjb250YWluZXJMaW5rRm4ocGFyZW50LCBlbClcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc2ltcGx5IHRyYW5zY2x1ZGVcbiAgICAgIGVsID0gdHJhbnNjbHVkZShlbCwgb3B0aW9ucylcbiAgICAgIHRoaXMuX2luaXRFbGVtZW50KGVsKVxuICAgIH1cbiAgICB2YXIgbGlua0ZuID0gY29tcGlsZShlbCwgb3B0aW9ucylcbiAgICBsaW5rRm4odGhpcywgZWwpXG4gICAgaWYgKG9wdGlvbnMucmVwbGFjZSkge1xuICAgICAgXy5yZXBsYWNlKHJhdywgZWwpXG4gICAgfVxuICB9XG4gIHJldHVybiBlbFxufVxuXG4vKipcbiAqIEluaXRpYWxpemUgaW5zdGFuY2UgZWxlbWVudC4gQ2FsbGVkIGluIHRoZSBwdWJsaWNcbiAqICRtb3VudCgpIG1ldGhvZC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKi9cblxuZXhwb3J0cy5faW5pdEVsZW1lbnQgPSBmdW5jdGlvbiAoZWwpIHtcbiAgaWYgKGVsIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCkge1xuICAgIHRoaXMuX2lzQmxvY2sgPSB0cnVlXG4gICAgdGhpcy4kZWwgPSB0aGlzLl9ibG9ja1N0YXJ0ID0gZWwuZmlyc3RDaGlsZFxuICAgIHRoaXMuX2Jsb2NrRW5kID0gZWwubGFzdENoaWxkXG4gICAgdGhpcy5fYmxvY2tGcmFnbWVudCA9IGVsXG4gIH0gZWxzZSB7XG4gICAgdGhpcy4kZWwgPSBlbFxuICB9XG4gIHRoaXMuJGVsLl9fdnVlX18gPSB0aGlzXG4gIHRoaXMuX2NhbGxIb29rKCdiZWZvcmVDb21waWxlJylcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW5kIGJpbmQgYSBkaXJlY3RpdmUgdG8gYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAtIGRpcmVjdGl2ZSBuYW1lXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgICAtIHRhcmdldCBub2RlXG4gKiBAcGFyYW0ge09iamVjdH0gZGVzYyAtIHBhcnNlZCBkaXJlY3RpdmUgZGVzY3JpcHRvclxuICogQHBhcmFtIHtPYmplY3R9IGRlZiAgLSBkaXJlY3RpdmUgZGVmaW5pdGlvbiBvYmplY3RcbiAqL1xuXG5leHBvcnRzLl9iaW5kRGlyID0gZnVuY3Rpb24gKG5hbWUsIG5vZGUsIGRlc2MsIGRlZikge1xuICB0aGlzLl9kaXJlY3RpdmVzLnB1c2goXG4gICAgbmV3IERpcmVjdGl2ZShuYW1lLCBub2RlLCB0aGlzLCBkZXNjLCBkZWYpXG4gIClcbn1cblxuLyoqXG4gKiBUZWFyZG93biBhbiBpbnN0YW5jZSwgdW5vYnNlcnZlcyB0aGUgZGF0YSwgdW5iaW5kIGFsbCB0aGVcbiAqIGRpcmVjdGl2ZXMsIHR1cm4gb2ZmIGFsbCB0aGUgZXZlbnQgbGlzdGVuZXJzLCBldGMuXG4gKlxuICogQHBhcmFtIHtCb29sZWFufSByZW1vdmUgLSB3aGV0aGVyIHRvIHJlbW92ZSB0aGUgRE9NIG5vZGUuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGRlZmVyQ2xlYW51cCAtIGlmIHRydWUsIGRlZmVyIGNsZWFudXAgdG9cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmUgY2FsbGVkIGxhdGVyXG4gKi9cblxuZXhwb3J0cy5fZGVzdHJveSA9IGZ1bmN0aW9uIChyZW1vdmUsIGRlZmVyQ2xlYW51cCkge1xuICBpZiAodGhpcy5faXNCZWluZ0Rlc3Ryb3llZCkge1xuICAgIHJldHVyblxuICB9XG4gIHRoaXMuX2NhbGxIb29rKCdiZWZvcmVEZXN0cm95JylcbiAgdGhpcy5faXNCZWluZ0Rlc3Ryb3llZCA9IHRydWVcbiAgdmFyIGlcbiAgLy8gcmVtb3ZlIHNlbGYgZnJvbSBwYXJlbnQuIG9ubHkgbmVjZXNzYXJ5XG4gIC8vIGlmIHBhcmVudCBpcyBub3QgYmVpbmcgZGVzdHJveWVkIGFzIHdlbGwuXG4gIHZhciBwYXJlbnQgPSB0aGlzLiRwYXJlbnRcbiAgaWYgKHBhcmVudCAmJiAhcGFyZW50Ll9pc0JlaW5nRGVzdHJveWVkKSB7XG4gICAgaSA9IHBhcmVudC5fY2hpbGRyZW4uaW5kZXhPZih0aGlzKVxuICAgIHBhcmVudC5fY2hpbGRyZW4uc3BsaWNlKGksIDEpXG4gIH1cbiAgLy8gZGVzdHJveSBhbGwgY2hpbGRyZW4uXG4gIGlmICh0aGlzLl9jaGlsZHJlbikge1xuICAgIGkgPSB0aGlzLl9jaGlsZHJlbi5sZW5ndGhcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB0aGlzLl9jaGlsZHJlbltpXS4kZGVzdHJveSgpXG4gICAgfVxuICB9XG4gIC8vIHRlYXJkb3duIHBhcmVudCBsaW5rZXJzXG4gIGlmICh0aGlzLl9jb250YWluZXJVbmxpbmtGbikge1xuICAgIHRoaXMuX2NvbnRhaW5lclVubGlua0ZuKClcbiAgfVxuICBpZiAodGhpcy5fY29udGVudFVubGlua0ZuKSB7XG4gICAgdGhpcy5fY29udGVudFVubGlua0ZuKClcbiAgfVxuICAvLyB0ZWFyZG93biBhbGwgZGlyZWN0aXZlcy4gdGhpcyBhbHNvIHRlYXJzZG93biBhbGxcbiAgLy8gZGlyZWN0aXZlLW93bmVkIHdhdGNoZXJzLiBpbnRlbnRpb25hbGx5IGNoZWNrIGZvclxuICAvLyBkaXJlY3RpdmVzIGFycmF5IGxlbmd0aCBvbiBldmVyeSBsb29wIHNpbmNlIGRpcmVjdGl2ZXNcbiAgLy8gdGhhdCBtYW5hZ2VzIHBhcnRpYWwgY29tcGlsYXRpb24gY2FuIHNwbGljZSBvbmVzIG91dFxuICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5fZGlyZWN0aXZlcy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMuX2RpcmVjdGl2ZXNbaV0uX3RlYXJkb3duKClcbiAgfVxuICAvLyB0ZWFyZG93biBhbGwgdXNlciB3YXRjaGVycy5cbiAgZm9yIChpIGluIHRoaXMuX3VzZXJXYXRjaGVycykge1xuICAgIHRoaXMuX3VzZXJXYXRjaGVyc1tpXS50ZWFyZG93bigpXG4gIH1cbiAgLy8gcmVtb3ZlIHJlZmVyZW5jZSB0byBzZWxmIG9uICRlbFxuICBpZiAodGhpcy4kZWwpIHtcbiAgICB0aGlzLiRlbC5fX3Z1ZV9fID0gbnVsbFxuICB9XG4gIC8vIHJlbW92ZSBET00gZWxlbWVudFxuICB2YXIgc2VsZiA9IHRoaXNcbiAgaWYgKHJlbW92ZSAmJiB0aGlzLiRlbCkge1xuICAgIHRoaXMuJHJlbW92ZShmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9jbGVhbnVwKClcbiAgICB9KVxuICB9IGVsc2UgaWYgKCFkZWZlckNsZWFudXApIHtcbiAgICB0aGlzLl9jbGVhbnVwKClcbiAgfVxufVxuXG4vKipcbiAqIENsZWFuIHVwIHRvIGVuc3VyZSBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gKiBUaGlzIGlzIGNhbGxlZCBhZnRlciB0aGUgbGVhdmUgdHJhbnNpdGlvbiBpZiB0aGVyZVxuICogaXMgYW55LlxuICovXG5cbmV4cG9ydHMuX2NsZWFudXAgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIHJlbW92ZSByZWZlcmVuY2UgZnJvbSBkYXRhIG9iXG4gIHRoaXMuX2RhdGEuX19vYl9fLnJlbW92ZVZtKHRoaXMpXG4gIHRoaXMuX2RhdGEgPVxuICB0aGlzLl93YXRjaGVycyA9XG4gIHRoaXMuX3VzZXJXYXRjaGVycyA9XG4gIHRoaXMuX3dhdGNoZXJMaXN0ID1cbiAgdGhpcy4kZWwgPVxuICB0aGlzLiRwYXJlbnQgPVxuICB0aGlzLiRyb290ID1cbiAgdGhpcy5fY2hpbGRyZW4gPVxuICB0aGlzLl9kaXJlY3RpdmVzID0gbnVsbFxuICAvLyBjYWxsIHRoZSBsYXN0IGhvb2suLi5cbiAgdGhpcy5faXNEZXN0cm95ZWQgPSB0cnVlXG4gIHRoaXMuX2NhbGxIb29rKCdkZXN0cm95ZWQnKVxuICAvLyB0dXJuIG9mZiBhbGwgaW5zdGFuY2UgbGlzdGVuZXJzLlxuICB0aGlzLiRvZmYoKVxufVxufSx7XCIuLi9jb21waWxlci9jb21waWxlXCI6MTEsXCIuLi9jb21waWxlci90cmFuc2NsdWRlXCI6MTIsXCIuLi9kaXJlY3RpdmVcIjoxNCxcIi4uL3V0aWxcIjo2MH1dLDQxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBfID0gcmVxdWlyZSgnLi4vdXRpbCcpXG52YXIgaW5Eb2MgPSBfLmluRG9jXG5cbi8qKlxuICogU2V0dXAgdGhlIGluc3RhbmNlJ3Mgb3B0aW9uIGV2ZW50cyAmIHdhdGNoZXJzLlxuICogSWYgdGhlIHZhbHVlIGlzIGEgc3RyaW5nLCB3ZSBwdWxsIGl0IGZyb20gdGhlXG4gKiBpbnN0YW5jZSdzIG1ldGhvZHMgYnkgbmFtZS5cbiAqL1xuXG5leHBvcnRzLl9pbml0RXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3B0aW9ucyA9IHRoaXMuJG9wdGlvbnNcbiAgcmVnaXN0ZXJDYWxsYmFja3ModGhpcywgJyRvbicsIG9wdGlvbnMuZXZlbnRzKVxuICByZWdpc3RlckNhbGxiYWNrcyh0aGlzLCAnJHdhdGNoJywgb3B0aW9ucy53YXRjaClcbn1cblxuLyoqXG4gKiBSZWdpc3RlciBjYWxsYmFja3MgZm9yIG9wdGlvbiBldmVudHMgYW5kIHdhdGNoZXJzLlxuICpcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtTdHJpbmd9IGFjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IGhhc2hcbiAqL1xuXG5mdW5jdGlvbiByZWdpc3RlckNhbGxiYWNrcyAodm0sIGFjdGlvbiwgaGFzaCkge1xuICBpZiAoIWhhc2gpIHJldHVyblxuICB2YXIgaGFuZGxlcnMsIGtleSwgaSwgalxuICBmb3IgKGtleSBpbiBoYXNoKSB7XG4gICAgaGFuZGxlcnMgPSBoYXNoW2tleV1cbiAgICBpZiAoXy5pc0FycmF5KGhhbmRsZXJzKSkge1xuICAgICAgZm9yIChpID0gMCwgaiA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgICByZWdpc3Rlcih2bSwgYWN0aW9uLCBrZXksIGhhbmRsZXJzW2ldKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZWdpc3Rlcih2bSwgYWN0aW9uLCBrZXksIGhhbmRsZXJzKVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciB0byByZWdpc3RlciBhbiBldmVudC93YXRjaCBjYWxsYmFjay5cbiAqXG4gKiBAcGFyYW0ge1Z1ZX0gdm1cbiAqIEBwYXJhbSB7U3RyaW5nfSBhY3Rpb25cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7Kn0gaGFuZGxlclxuICovXG5cbmZ1bmN0aW9uIHJlZ2lzdGVyICh2bSwgYWN0aW9uLCBrZXksIGhhbmRsZXIpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgaGFuZGxlclxuICBpZiAodHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHZtW2FjdGlvbl0oa2V5LCBoYW5kbGVyKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIG1ldGhvZHMgPSB2bS4kb3B0aW9ucy5tZXRob2RzXG4gICAgdmFyIG1ldGhvZCA9IG1ldGhvZHMgJiYgbWV0aG9kc1toYW5kbGVyXVxuICAgIGlmIChtZXRob2QpIHtcbiAgICAgIHZtW2FjdGlvbl0oa2V5LCBtZXRob2QpXG4gICAgfSBlbHNlIHtcbiAgICAgIF8ud2FybihcbiAgICAgICAgJ1Vua25vd24gbWV0aG9kOiBcIicgKyBoYW5kbGVyICsgJ1wiIHdoZW4gJyArXG4gICAgICAgICdyZWdpc3RlcmluZyBjYWxsYmFjayBmb3IgJyArIGFjdGlvbiArXG4gICAgICAgICc6IFwiJyArIGtleSArICdcIi4nXG4gICAgICApXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2V0dXAgcmVjdXJzaXZlIGF0dGFjaGVkL2RldGFjaGVkIGNhbGxzXG4gKi9cblxuZXhwb3J0cy5faW5pdERPTUhvb2tzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLiRvbignaG9vazphdHRhY2hlZCcsIG9uQXR0YWNoZWQpXG4gIHRoaXMuJG9uKCdob29rOmRldGFjaGVkJywgb25EZXRhY2hlZClcbn1cblxuLyoqXG4gKiBDYWxsYmFjayB0byByZWN1cnNpdmVseSBjYWxsIGF0dGFjaGVkIGhvb2sgb24gY2hpbGRyZW5cbiAqL1xuXG5mdW5jdGlvbiBvbkF0dGFjaGVkICgpIHtcbiAgdGhpcy5faXNBdHRhY2hlZCA9IHRydWVcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW5cbiAgaWYgKCFjaGlsZHJlbikgcmV0dXJuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICBpZiAoIWNoaWxkLl9pc0F0dGFjaGVkICYmIGluRG9jKGNoaWxkLiRlbCkpIHtcbiAgICAgIGNoaWxkLl9jYWxsSG9vaygnYXR0YWNoZWQnKVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENhbGxiYWNrIHRvIHJlY3Vyc2l2ZWx5IGNhbGwgZGV0YWNoZWQgaG9vayBvbiBjaGlsZHJlblxuICovXG5cbmZ1bmN0aW9uIG9uRGV0YWNoZWQgKCkge1xuICB0aGlzLl9pc0F0dGFjaGVkID0gZmFsc2VcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW5cbiAgaWYgKCFjaGlsZHJlbikgcmV0dXJuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICBpZiAoY2hpbGQuX2lzQXR0YWNoZWQgJiYgIWluRG9jKGNoaWxkLiRlbCkpIHtcbiAgICAgIGNoaWxkLl9jYWxsSG9vaygnZGV0YWNoZWQnKVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFRyaWdnZXIgYWxsIGhhbmRsZXJzIGZvciBhIGhvb2tcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaG9va1xuICovXG5cbmV4cG9ydHMuX2NhbGxIb29rID0gZnVuY3Rpb24gKGhvb2spIHtcbiAgdmFyIGhhbmRsZXJzID0gdGhpcy4kb3B0aW9uc1tob29rXVxuICBpZiAoaGFuZGxlcnMpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgaiA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgaGFuZGxlcnNbaV0uY2FsbCh0aGlzKVxuICAgIH1cbiAgfVxuICB0aGlzLiRlbWl0KCdob29rOicgKyBob29rKVxufVxufSx7XCIuLi91dGlsXCI6NjB9XSw0MjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgbWVyZ2VPcHRpb25zID0gcmVxdWlyZSgnLi4vdXRpbC9tZXJnZS1vcHRpb24nKVxuXG4vKipcbiAqIFRoZSBtYWluIGluaXQgc2VxdWVuY2UuIFRoaXMgaXMgY2FsbGVkIGZvciBldmVyeVxuICogaW5zdGFuY2UsIGluY2x1ZGluZyBvbmVzIHRoYXQgYXJlIGNyZWF0ZWQgZnJvbSBleHRlbmRlZFxuICogY29uc3RydWN0b3JzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gdGhpcyBvcHRpb25zIG9iamVjdCBzaG91bGQgYmVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIHJlc3VsdCBvZiBtZXJnaW5nIGNsYXNzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgYW5kIHRoZSBvcHRpb25zIHBhc3NlZFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICBpbiB0byB0aGUgY29uc3RydWN0b3IuXG4gKi9cblxuZXhwb3J0cy5faW5pdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuICB0aGlzLiRlbCAgICAgICAgICAgPSBudWxsXG4gIHRoaXMuJHBhcmVudCAgICAgICA9IG9wdGlvbnMuX3BhcmVudFxuICB0aGlzLiRyb290ICAgICAgICAgPSBvcHRpb25zLl9yb290IHx8IHRoaXNcbiAgdGhpcy4kICAgICAgICAgICAgID0ge30gLy8gY2hpbGQgdm0gcmVmZXJlbmNlc1xuICB0aGlzLiQkICAgICAgICAgICAgPSB7fSAvLyBlbGVtZW50IHJlZmVyZW5jZXNcbiAgdGhpcy5fd2F0Y2hlckxpc3QgID0gW10gLy8gYWxsIHdhdGNoZXJzIGFzIGFuIGFycmF5XG4gIHRoaXMuX3dhdGNoZXJzICAgICA9IHt9IC8vIGludGVybmFsIHdhdGNoZXJzIGFzIGEgaGFzaFxuICB0aGlzLl91c2VyV2F0Y2hlcnMgPSB7fSAvLyB1c2VyIHdhdGNoZXJzIGFzIGEgaGFzaFxuICB0aGlzLl9kaXJlY3RpdmVzICAgPSBbXSAvLyBhbGwgZGlyZWN0aXZlc1xuXG4gIC8vIGEgZmxhZyB0byBhdm9pZCB0aGlzIGJlaW5nIG9ic2VydmVkXG4gIHRoaXMuX2lzVnVlID0gdHJ1ZVxuXG4gIC8vIGV2ZW50cyBib29ra2VlcGluZ1xuICB0aGlzLl9ldmVudHMgICAgICAgICA9IHt9ICAgIC8vIHJlZ2lzdGVyZWQgY2FsbGJhY2tzXG4gIHRoaXMuX2V2ZW50c0NvdW50ICAgID0ge30gICAgLy8gZm9yICRicm9hZGNhc3Qgb3B0aW1pemF0aW9uXG4gIHRoaXMuX2V2ZW50Q2FuY2VsbGVkID0gZmFsc2UgLy8gZm9yIGV2ZW50IGNhbmNlbGxhdGlvblxuXG4gIC8vIGJsb2NrIGluc3RhbmNlIHByb3BlcnRpZXNcbiAgdGhpcy5faXNCbG9jayAgICAgPSBmYWxzZVxuICB0aGlzLl9ibG9ja1N0YXJ0ICA9ICAgICAgICAgIC8vIEB0eXBlIHtDb21tZW50Tm9kZX1cbiAgdGhpcy5fYmxvY2tFbmQgICAgPSBudWxsICAgICAvLyBAdHlwZSB7Q29tbWVudE5vZGV9XG5cbiAgLy8gbGlmZWN5Y2xlIHN0YXRlXG4gIHRoaXMuX2lzQ29tcGlsZWQgID1cbiAgdGhpcy5faXNEZXN0cm95ZWQgPVxuICB0aGlzLl9pc1JlYWR5ICAgICA9XG4gIHRoaXMuX2lzQXR0YWNoZWQgID1cbiAgdGhpcy5faXNCZWluZ0Rlc3Ryb3llZCA9IGZhbHNlXG5cbiAgLy8gY2hpbGRyZW5cbiAgdGhpcy5fY2hpbGRyZW4gPSAgICAgICAgIC8vIEB0eXBlIHtBcnJheX1cbiAgdGhpcy5fY2hpbGRDdG9ycyA9IG51bGwgIC8vIEB0eXBlIHtPYmplY3R9IC0gaGFzaCB0byBjYWNoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hpbGQgY29uc3RydWN0b3JzXG5cbiAgLy8gbWVyZ2Ugb3B0aW9ucy5cbiAgb3B0aW9ucyA9IHRoaXMuJG9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoXG4gICAgdGhpcy5jb25zdHJ1Y3Rvci5vcHRpb25zLFxuICAgIG9wdGlvbnMsXG4gICAgdGhpc1xuICApXG5cbiAgLy8gc2V0IGRhdGEgYWZ0ZXIgbWVyZ2UuXG4gIHRoaXMuX2RhdGEgPSBvcHRpb25zLmRhdGEgfHwge31cblxuICAvLyBpbml0aWFsaXplIGRhdGEgb2JzZXJ2YXRpb24gYW5kIHNjb3BlIGluaGVyaXRhbmNlLlxuICB0aGlzLl9pbml0U2NvcGUoKVxuXG4gIC8vIHNldHVwIGV2ZW50IHN5c3RlbSBhbmQgb3B0aW9uIGV2ZW50cy5cbiAgdGhpcy5faW5pdEV2ZW50cygpXG5cbiAgLy8gY2FsbCBjcmVhdGVkIGhvb2tcbiAgdGhpcy5fY2FsbEhvb2soJ2NyZWF0ZWQnKVxuXG4gIC8vIGlmIGBlbGAgb3B0aW9uIGlzIHBhc3NlZCwgc3RhcnQgY29tcGlsYXRpb24uXG4gIGlmIChvcHRpb25zLmVsKSB7XG4gICAgdGhpcy4kbW91bnQob3B0aW9ucy5lbClcbiAgfVxufVxufSx7XCIuLi91dGlsL21lcmdlLW9wdGlvblwiOjYyfV0sNDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBPYnNlcnZlciA9IHJlcXVpcmUoJy4uL29ic2VydmVyJylcbnZhciBEZXAgPSByZXF1aXJlKCcuLi9vYnNlcnZlci9kZXAnKVxuXG4vKipcbiAqIFNldHVwIHRoZSBzY29wZSBvZiBhbiBpbnN0YW5jZSwgd2hpY2ggY29udGFpbnM6XG4gKiAtIG9ic2VydmVkIGRhdGFcbiAqIC0gY29tcHV0ZWQgcHJvcGVydGllc1xuICogLSB1c2VyIG1ldGhvZHNcbiAqIC0gbWV0YSBwcm9wZXJ0aWVzXG4gKi9cblxuZXhwb3J0cy5faW5pdFNjb3BlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9pbml0RGF0YSgpXG4gIHRoaXMuX2luaXRDb21wdXRlZCgpXG4gIHRoaXMuX2luaXRNZXRob2RzKClcbiAgdGhpcy5faW5pdE1ldGEoKVxufVxuXG4vKipcbiAqIEluaXRpYWxpemUgdGhlIGRhdGEuIFxuICovXG5cbmV4cG9ydHMuX2luaXREYXRhID0gZnVuY3Rpb24gKCkge1xuICAvLyBwcm94eSBkYXRhIG9uIGluc3RhbmNlXG4gIHZhciBkYXRhID0gdGhpcy5fZGF0YVxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpXG4gIHZhciBpID0ga2V5cy5sZW5ndGhcbiAgdmFyIGtleVxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXVxuICAgIGlmICghXy5pc1Jlc2VydmVkKGtleSkpIHtcbiAgICAgIHRoaXMuX3Byb3h5KGtleSlcbiAgICB9XG4gIH1cbiAgLy8gb2JzZXJ2ZSBkYXRhXG4gIE9ic2VydmVyLmNyZWF0ZShkYXRhKS5hZGRWbSh0aGlzKVxufVxuXG4vKipcbiAqIFN3YXAgdGhlIGlzbnRhbmNlJ3MgJGRhdGEuIENhbGxlZCBpbiAkZGF0YSdzIHNldHRlci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbmV3RGF0YVxuICovXG5cbmV4cG9ydHMuX3NldERhdGEgPSBmdW5jdGlvbiAobmV3RGF0YSkge1xuICBuZXdEYXRhID0gbmV3RGF0YSB8fCB7fVxuICB2YXIgb2xkRGF0YSA9IHRoaXMuX2RhdGFcbiAgdGhpcy5fZGF0YSA9IG5ld0RhdGFcbiAgdmFyIGtleXMsIGtleSwgaVxuICAvLyB1bnByb3h5IGtleXMgbm90IHByZXNlbnQgaW4gbmV3IGRhdGFcbiAga2V5cyA9IE9iamVjdC5rZXlzKG9sZERhdGEpXG4gIGkgPSBrZXlzLmxlbmd0aFxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXVxuICAgIGlmICghXy5pc1Jlc2VydmVkKGtleSkgJiYgIShrZXkgaW4gbmV3RGF0YSkpIHtcbiAgICAgIHRoaXMuX3VucHJveHkoa2V5KVxuICAgIH1cbiAgfVxuICAvLyBwcm94eSBrZXlzIG5vdCBhbHJlYWR5IHByb3hpZWQsXG4gIC8vIGFuZCB0cmlnZ2VyIGNoYW5nZSBmb3IgY2hhbmdlZCB2YWx1ZXNcbiAga2V5cyA9IE9iamVjdC5rZXlzKG5ld0RhdGEpXG4gIGkgPSBrZXlzLmxlbmd0aFxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXVxuICAgIGlmICghdGhpcy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmICFfLmlzUmVzZXJ2ZWQoa2V5KSkge1xuICAgICAgLy8gbmV3IHByb3BlcnR5XG4gICAgICB0aGlzLl9wcm94eShrZXkpXG4gICAgfVxuICB9XG4gIG9sZERhdGEuX19vYl9fLnJlbW92ZVZtKHRoaXMpXG4gIE9ic2VydmVyLmNyZWF0ZShuZXdEYXRhKS5hZGRWbSh0aGlzKVxuICB0aGlzLl9kaWdlc3QoKVxufVxuXG4vKipcbiAqIFByb3h5IGEgcHJvcGVydHksIHNvIHRoYXRcbiAqIHZtLnByb3AgPT09IHZtLl9kYXRhLnByb3BcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKi9cblxuZXhwb3J0cy5fcHJveHkgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIC8vIG5lZWQgdG8gc3RvcmUgcmVmIHRvIHNlbGYgaGVyZVxuICAvLyBiZWNhdXNlIHRoZXNlIGdldHRlci9zZXR0ZXJzIG1pZ2h0XG4gIC8vIGJlIGNhbGxlZCBieSBjaGlsZCBpbnN0YW5jZXMhXG4gIHZhciBzZWxmID0gdGhpc1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoc2VsZiwga2V5LCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbiBwcm94eUdldHRlciAoKSB7XG4gICAgICByZXR1cm4gc2VsZi5fZGF0YVtrZXldXG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uIHByb3h5U2V0dGVyICh2YWwpIHtcbiAgICAgIHNlbGYuX2RhdGFba2V5XSA9IHZhbFxuICAgIH1cbiAgfSlcbn1cblxuLyoqXG4gKiBVbnByb3h5IGEgcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICovXG5cbmV4cG9ydHMuX3VucHJveHkgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIGRlbGV0ZSB0aGlzW2tleV1cbn1cblxuLyoqXG4gKiBGb3JjZSB1cGRhdGUgb24gZXZlcnkgd2F0Y2hlciBpbiBzY29wZS5cbiAqL1xuXG5leHBvcnRzLl9kaWdlc3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBpID0gdGhpcy5fd2F0Y2hlckxpc3QubGVuZ3RoXG4gIHdoaWxlIChpLS0pIHtcbiAgICB0aGlzLl93YXRjaGVyTGlzdFtpXS51cGRhdGUoKVxuICB9XG4gIHZhciBjaGlsZHJlbiA9IHRoaXMuX2NoaWxkcmVuXG4gIHZhciBjaGlsZFxuICBpZiAoY2hpbGRyZW4pIHtcbiAgICBpID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgaWYgKGNoaWxkLiRvcHRpb25zLmluaGVyaXQpIHtcbiAgICAgICAgY2hpbGQuX2RpZ2VzdCgpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2V0dXAgY29tcHV0ZWQgcHJvcGVydGllcy4gVGhleSBhcmUgZXNzZW50aWFsbHlcbiAqIHNwZWNpYWwgZ2V0dGVyL3NldHRlcnNcbiAqL1xuXG5mdW5jdGlvbiBub29wICgpIHt9XG5leHBvcnRzLl9pbml0Q29tcHV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBjb21wdXRlZCA9IHRoaXMuJG9wdGlvbnMuY29tcHV0ZWRcbiAgaWYgKGNvbXB1dGVkKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGNvbXB1dGVkKSB7XG4gICAgICB2YXIgdXNlckRlZiA9IGNvbXB1dGVkW2tleV1cbiAgICAgIHZhciBkZWYgPSB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB1c2VyRGVmID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlZi5nZXQgPSBfLmJpbmQodXNlckRlZiwgdGhpcylcbiAgICAgICAgZGVmLnNldCA9IG5vb3BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlZi5nZXQgPSB1c2VyRGVmLmdldFxuICAgICAgICAgID8gXy5iaW5kKHVzZXJEZWYuZ2V0LCB0aGlzKVxuICAgICAgICAgIDogbm9vcFxuICAgICAgICBkZWYuc2V0ID0gdXNlckRlZi5zZXRcbiAgICAgICAgICA/IF8uYmluZCh1c2VyRGVmLnNldCwgdGhpcylcbiAgICAgICAgICA6IG5vb3BcbiAgICAgIH1cbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBrZXksIGRlZilcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBTZXR1cCBpbnN0YW5jZSBtZXRob2RzLiBNZXRob2RzIG11c3QgYmUgYm91bmQgdG8gdGhlXG4gKiBpbnN0YW5jZSBzaW5jZSB0aGV5IG1pZ2h0IGJlIGNhbGxlZCBieSBjaGlsZHJlblxuICogaW5oZXJpdGluZyB0aGVtLlxuICovXG5cbmV4cG9ydHMuX2luaXRNZXRob2RzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWV0aG9kcyA9IHRoaXMuJG9wdGlvbnMubWV0aG9kc1xuICBpZiAobWV0aG9kcykge1xuICAgIGZvciAodmFyIGtleSBpbiBtZXRob2RzKSB7XG4gICAgICB0aGlzW2tleV0gPSBfLmJpbmQobWV0aG9kc1trZXldLCB0aGlzKVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEluaXRpYWxpemUgbWV0YSBpbmZvcm1hdGlvbiBsaWtlICRpbmRleCwgJGtleSAmICR2YWx1ZS5cbiAqL1xuXG5leHBvcnRzLl9pbml0TWV0YSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1ldGFzID0gdGhpcy4kb3B0aW9ucy5fbWV0YVxuICBpZiAobWV0YXMpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gbWV0YXMpIHtcbiAgICAgIHRoaXMuX2RlZmluZU1ldGEoa2V5LCBtZXRhc1trZXldKVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIERlZmluZSBhIG1ldGEgcHJvcGVydHksIGUuZyAkaW5kZXgsICRrZXksICR2YWx1ZVxuICogd2hpY2ggb25seSBleGlzdHMgb24gdGhlIHZtIGluc3RhbmNlIGJ1dCBub3QgaW4gJGRhdGEuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICovXG5cbmV4cG9ydHMuX2RlZmluZU1ldGEgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICB2YXIgZGVwID0gbmV3IERlcCgpXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBrZXksIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uIG1ldGFHZXR0ZXIgKCkge1xuICAgICAgaWYgKE9ic2VydmVyLnRhcmdldCkge1xuICAgICAgICBPYnNlcnZlci50YXJnZXQuYWRkRGVwKGRlcClcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbiBtZXRhU2V0dGVyICh2YWwpIHtcbiAgICAgIGlmICh2YWwgIT09IHZhbHVlKSB7XG4gICAgICAgIHZhbHVlID0gdmFsXG4gICAgICAgIGRlcC5ub3RpZnkoKVxuICAgICAgfVxuICAgIH1cbiAgfSlcbn1cbn0se1wiLi4vb2JzZXJ2ZXJcIjo0NixcIi4uL29ic2VydmVyL2RlcFwiOjQ1LFwiLi4vdXRpbFwiOjYwfV0sNDQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBhcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlXG52YXIgYXJyYXlNZXRob2RzID0gT2JqZWN0LmNyZWF0ZShhcnJheVByb3RvKVxuXG4vKipcbiAqIEludGVyY2VwdCBtdXRhdGluZyBtZXRob2RzIGFuZCBlbWl0IGV2ZW50c1xuICovXG5cbjtbXG4gICdwdXNoJyxcbiAgJ3BvcCcsXG4gICdzaGlmdCcsXG4gICd1bnNoaWZ0JyxcbiAgJ3NwbGljZScsXG4gICdzb3J0JyxcbiAgJ3JldmVyc2UnXG5dXG4uZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gIC8vIGNhY2hlIG9yaWdpbmFsIG1ldGhvZFxuICB2YXIgb3JpZ2luYWwgPSBhcnJheVByb3RvW21ldGhvZF1cbiAgXy5kZWZpbmUoYXJyYXlNZXRob2RzLCBtZXRob2QsIGZ1bmN0aW9uIG11dGF0b3IgKCkge1xuICAgIC8vIGF2b2lkIGxlYWtpbmcgYXJndW1lbnRzOlxuICAgIC8vIGh0dHA6Ly9qc3BlcmYuY29tL2Nsb3N1cmUtd2l0aC1hcmd1bWVudHNcbiAgICB2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShpKVxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV1cbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IG9yaWdpbmFsLmFwcGx5KHRoaXMsIGFyZ3MpXG4gICAgdmFyIG9iID0gdGhpcy5fX29iX19cbiAgICB2YXIgaW5zZXJ0ZWRcbiAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgY2FzZSAncHVzaCc6XG4gICAgICAgIGluc2VydGVkID0gYXJnc1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAndW5zaGlmdCc6XG4gICAgICAgIGluc2VydGVkID0gYXJnc1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnc3BsaWNlJzpcbiAgICAgICAgaW5zZXJ0ZWQgPSBhcmdzLnNsaWNlKDIpXG4gICAgICAgIGJyZWFrXG4gICAgfVxuICAgIGlmIChpbnNlcnRlZCkgb2Iub2JzZXJ2ZUFycmF5KGluc2VydGVkKVxuICAgIC8vIG5vdGlmeSBjaGFuZ2VcbiAgICBvYi5ub3RpZnkoKVxuICAgIHJldHVybiByZXN1bHRcbiAgfSlcbn0pXG5cbi8qKlxuICogU3dhcCB0aGUgZWxlbWVudCBhdCB0aGUgZ2l2ZW4gaW5kZXggd2l0aCBhIG5ldyB2YWx1ZVxuICogYW5kIGVtaXRzIGNvcnJlc3BvbmRpbmcgZXZlbnQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4XG4gKiBAcGFyYW0geyp9IHZhbFxuICogQHJldHVybiB7Kn0gLSByZXBsYWNlZCBlbGVtZW50XG4gKi9cblxuXy5kZWZpbmUoXG4gIGFycmF5UHJvdG8sXG4gICckc2V0JyxcbiAgZnVuY3Rpb24gJHNldCAoaW5kZXgsIHZhbCkge1xuICAgIGlmIChpbmRleCA+PSB0aGlzLmxlbmd0aCkge1xuICAgICAgdGhpcy5sZW5ndGggPSBpbmRleCArIDFcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3BsaWNlKGluZGV4LCAxLCB2YWwpWzBdXG4gIH1cbilcblxuLyoqXG4gKiBDb252ZW5pZW5jZSBtZXRob2QgdG8gcmVtb3ZlIHRoZSBlbGVtZW50IGF0IGdpdmVuIGluZGV4LlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleFxuICogQHBhcmFtIHsqfSB2YWxcbiAqL1xuXG5fLmRlZmluZShcbiAgYXJyYXlQcm90byxcbiAgJyRyZW1vdmUnLFxuICBmdW5jdGlvbiAkcmVtb3ZlIChpbmRleCkge1xuICAgIGlmICh0eXBlb2YgaW5kZXggIT09ICdudW1iZXInKSB7XG4gICAgICBpbmRleCA9IHRoaXMuaW5kZXhPZihpbmRleClcbiAgICB9XG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgIHJldHVybiB0aGlzLnNwbGljZShpbmRleCwgMSlbMF1cbiAgICB9XG4gIH1cbilcblxubW9kdWxlLmV4cG9ydHMgPSBhcnJheU1ldGhvZHNcbn0se1wiLi4vdXRpbFwiOjYwfV0sNDU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIHVpZCA9IDBcblxuLyoqXG4gKiBBIGRlcCBpcyBhbiBvYnNlcnZhYmxlIHRoYXQgY2FuIGhhdmUgbXVsdGlwbGVcbiAqIGRpcmVjdGl2ZXMgc3Vic2NyaWJpbmcgdG8gaXQuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuZnVuY3Rpb24gRGVwICgpIHtcbiAgdGhpcy5pZCA9ICsrdWlkXG4gIHRoaXMuc3VicyA9IFtdXG59XG5cbnZhciBwID0gRGVwLnByb3RvdHlwZVxuXG4vKipcbiAqIEFkZCBhIGRpcmVjdGl2ZSBzdWJzY3JpYmVyLlxuICpcbiAqIEBwYXJhbSB7RGlyZWN0aXZlfSBzdWJcbiAqL1xuXG5wLmFkZFN1YiA9IGZ1bmN0aW9uIChzdWIpIHtcbiAgdGhpcy5zdWJzLnB1c2goc3ViKVxufVxuXG4vKipcbiAqIFJlbW92ZSBhIGRpcmVjdGl2ZSBzdWJzY3JpYmVyLlxuICpcbiAqIEBwYXJhbSB7RGlyZWN0aXZlfSBzdWJcbiAqL1xuXG5wLnJlbW92ZVN1YiA9IGZ1bmN0aW9uIChzdWIpIHtcbiAgaWYgKHRoaXMuc3Vicy5sZW5ndGgpIHtcbiAgICB2YXIgaSA9IHRoaXMuc3Vicy5pbmRleE9mKHN1YilcbiAgICBpZiAoaSA+IC0xKSB0aGlzLnN1YnMuc3BsaWNlKGksIDEpXG4gIH1cbn1cblxuLyoqXG4gKiBOb3RpZnkgYWxsIHN1YnNjcmliZXJzIG9mIGEgbmV3IHZhbHVlLlxuICovXG5cbnAubm90aWZ5ID0gZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuc3Vicy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB0aGlzLnN1YnNbaV0udXBkYXRlKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERlcFxufSx7fV0sNDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxudmFyIERlcCA9IHJlcXVpcmUoJy4vZGVwJylcbnZhciBhcnJheU1ldGhvZHMgPSByZXF1aXJlKCcuL2FycmF5JylcbnZhciBhcnJheUtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhhcnJheU1ldGhvZHMpXG5yZXF1aXJlKCcuL29iamVjdCcpXG5cbnZhciB1aWQgPSAwXG5cbi8qKlxuICogVHlwZSBlbnVtc1xuICovXG5cbnZhciBBUlJBWSAgPSAwXG52YXIgT0JKRUNUID0gMVxuXG4vKipcbiAqIEF1Z21lbnQgYW4gdGFyZ2V0IE9iamVjdCBvciBBcnJheSBieSBpbnRlcmNlcHRpbmdcbiAqIHRoZSBwcm90b3R5cGUgY2hhaW4gdXNpbmcgX19wcm90b19fXG4gKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IHRhcmdldFxuICogQHBhcmFtIHtPYmplY3R9IHByb3RvXG4gKi9cblxuZnVuY3Rpb24gcHJvdG9BdWdtZW50ICh0YXJnZXQsIHNyYykge1xuICB0YXJnZXQuX19wcm90b19fID0gc3JjXG59XG5cbi8qKlxuICogQXVnbWVudCBhbiB0YXJnZXQgT2JqZWN0IG9yIEFycmF5IGJ5IGRlZmluaW5nXG4gKiBoaWRkZW4gcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gdGFyZ2V0XG4gKiBAcGFyYW0ge09iamVjdH0gcHJvdG9cbiAqL1xuXG5mdW5jdGlvbiBjb3B5QXVnbWVudCAodGFyZ2V0LCBzcmMsIGtleXMpIHtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aFxuICB2YXIga2V5XG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldXG4gICAgXy5kZWZpbmUodGFyZ2V0LCBrZXksIHNyY1trZXldKVxuICB9XG59XG5cbi8qKlxuICogT2JzZXJ2ZXIgY2xhc3MgdGhhdCBhcmUgYXR0YWNoZWQgdG8gZWFjaCBvYnNlcnZlZFxuICogb2JqZWN0LiBPbmNlIGF0dGFjaGVkLCB0aGUgb2JzZXJ2ZXIgY29udmVydHMgdGFyZ2V0XG4gKiBvYmplY3QncyBwcm9wZXJ0eSBrZXlzIGludG8gZ2V0dGVyL3NldHRlcnMgdGhhdFxuICogY29sbGVjdCBkZXBlbmRlbmNpZXMgYW5kIGRpc3BhdGNoZXMgdXBkYXRlcy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7TnVtYmVyfSB0eXBlXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG5mdW5jdGlvbiBPYnNlcnZlciAodmFsdWUsIHR5cGUpIHtcbiAgdGhpcy5pZCA9ICsrdWlkXG4gIHRoaXMudmFsdWUgPSB2YWx1ZVxuICB0aGlzLmFjdGl2ZSA9IHRydWVcbiAgdGhpcy5kZXBzID0gW11cbiAgXy5kZWZpbmUodmFsdWUsICdfX29iX18nLCB0aGlzKVxuICBpZiAodHlwZSA9PT0gQVJSQVkpIHtcbiAgICB2YXIgYXVnbWVudCA9IGNvbmZpZy5wcm90byAmJiBfLmhhc1Byb3RvXG4gICAgICA/IHByb3RvQXVnbWVudFxuICAgICAgOiBjb3B5QXVnbWVudFxuICAgIGF1Z21lbnQodmFsdWUsIGFycmF5TWV0aG9kcywgYXJyYXlLZXlzKVxuICAgIHRoaXMub2JzZXJ2ZUFycmF5KHZhbHVlKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09IE9CSkVDVCkge1xuICAgIHRoaXMud2Fsayh2YWx1ZSlcbiAgfVxufVxuXG5PYnNlcnZlci50YXJnZXQgPSBudWxsXG5cbnZhciBwID0gT2JzZXJ2ZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXR0ZW1wdCB0byBjcmVhdGUgYW4gb2JzZXJ2ZXIgaW5zdGFuY2UgZm9yIGEgdmFsdWUsXG4gKiByZXR1cm5zIHRoZSBuZXcgb2JzZXJ2ZXIgaWYgc3VjY2Vzc2Z1bGx5IG9ic2VydmVkLFxuICogb3IgdGhlIGV4aXN0aW5nIG9ic2VydmVyIGlmIHRoZSB2YWx1ZSBhbHJlYWR5IGhhcyBvbmUuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybiB7T2JzZXJ2ZXJ8dW5kZWZpbmVkfVxuICogQHN0YXRpY1xuICovXG5cbk9ic2VydmVyLmNyZWF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAoXG4gICAgdmFsdWUgJiZcbiAgICB2YWx1ZS5oYXNPd25Qcm9wZXJ0eSgnX19vYl9fJykgJiZcbiAgICB2YWx1ZS5fX29iX18gaW5zdGFuY2VvZiBPYnNlcnZlclxuICApIHtcbiAgICByZXR1cm4gdmFsdWUuX19vYl9fXG4gIH0gZWxzZSBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2ZXIodmFsdWUsIEFSUkFZKVxuICB9IGVsc2UgaWYgKFxuICAgIF8uaXNQbGFpbk9iamVjdCh2YWx1ZSkgJiZcbiAgICAhdmFsdWUuX2lzVnVlIC8vIGF2b2lkIFZ1ZSBpbnN0YW5jZVxuICApIHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmVyKHZhbHVlLCBPQkpFQ1QpXG4gIH1cbn1cblxuLyoqXG4gKiBXYWxrIHRocm91Z2ggZWFjaCBwcm9wZXJ0eSBhbmQgY29udmVydCB0aGVtIGludG9cbiAqIGdldHRlci9zZXR0ZXJzLiBUaGlzIG1ldGhvZCBzaG91bGQgb25seSBiZSBjYWxsZWQgd2hlblxuICogdmFsdWUgdHlwZSBpcyBPYmplY3QuIFByb3BlcnRpZXMgcHJlZml4ZWQgd2l0aCBgJGAgb3IgYF9gXG4gKiBhbmQgYWNjZXNzb3IgcHJvcGVydGllcyBhcmUgaWdub3JlZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxucC53YWxrID0gZnVuY3Rpb24gKG9iaikge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iailcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aFxuICB2YXIga2V5LCBwcmVmaXhcbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV1cbiAgICBwcmVmaXggPSBrZXkuY2hhckNvZGVBdCgwKVxuICAgIGlmIChwcmVmaXggIT09IDB4MjQgJiYgcHJlZml4ICE9PSAweDVGKSB7IC8vIHNraXAgJCBvciBfXG4gICAgICB0aGlzLmNvbnZlcnQoa2V5LCBvYmpba2V5XSlcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBUcnkgdG8gY2FyZXRlIGFuIG9ic2VydmVyIGZvciBhIGNoaWxkIHZhbHVlLFxuICogYW5kIGlmIHZhbHVlIGlzIGFycmF5LCBsaW5rIGRlcCB0byB0aGUgYXJyYXkuXG4gKlxuICogQHBhcmFtIHsqfSB2YWxcbiAqIEByZXR1cm4ge0RlcHx1bmRlZmluZWR9XG4gKi9cblxucC5vYnNlcnZlID0gZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gT2JzZXJ2ZXIuY3JlYXRlKHZhbClcbn1cblxuLyoqXG4gKiBPYnNlcnZlIGEgbGlzdCBvZiBBcnJheSBpdGVtcy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtc1xuICovXG5cbnAub2JzZXJ2ZUFycmF5ID0gZnVuY3Rpb24gKGl0ZW1zKSB7XG4gIHZhciBpID0gaXRlbXMubGVuZ3RoXG4gIHdoaWxlIChpLS0pIHtcbiAgICB0aGlzLm9ic2VydmUoaXRlbXNbaV0pXG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcHJvcGVydHkgaW50byBnZXR0ZXIvc2V0dGVyIHNvIHdlIGNhbiBlbWl0XG4gKiB0aGUgZXZlbnRzIHdoZW4gdGhlIHByb3BlcnR5IGlzIGFjY2Vzc2VkL2NoYW5nZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHsqfSB2YWxcbiAqL1xuXG5wLmNvbnZlcnQgPSBmdW5jdGlvbiAoa2V5LCB2YWwpIHtcbiAgdmFyIG9iID0gdGhpc1xuICB2YXIgY2hpbGRPYiA9IG9iLm9ic2VydmUodmFsKVxuICB2YXIgZGVwID0gbmV3IERlcCgpXG4gIGlmIChjaGlsZE9iKSB7XG4gICAgY2hpbGRPYi5kZXBzLnB1c2goZGVwKVxuICB9XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYi52YWx1ZSwga2V5LCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBPYnNlcnZlci50YXJnZXQgaXMgYSB3YXRjaGVyIHdob3NlIGdldHRlciBpc1xuICAgICAgLy8gY3VycmVudGx5IGJlaW5nIGV2YWx1YXRlZC5cbiAgICAgIGlmIChvYi5hY3RpdmUgJiYgT2JzZXJ2ZXIudGFyZ2V0KSB7XG4gICAgICAgIE9ic2VydmVyLnRhcmdldC5hZGREZXAoZGVwKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbFxuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbiAobmV3VmFsKSB7XG4gICAgICBpZiAobmV3VmFsID09PSB2YWwpIHJldHVyblxuICAgICAgLy8gcmVtb3ZlIGRlcCBmcm9tIG9sZCB2YWx1ZVxuICAgICAgdmFyIG9sZENoaWxkT2IgPSB2YWwgJiYgdmFsLl9fb2JfX1xuICAgICAgaWYgKG9sZENoaWxkT2IpIHtcbiAgICAgICAgdmFyIG9sZERlcHMgPSBvbGRDaGlsZE9iLmRlcHNcbiAgICAgICAgb2xkRGVwcy5zcGxpY2Uob2xkRGVwcy5pbmRleE9mKGRlcCksIDEpXG4gICAgICB9XG4gICAgICB2YWwgPSBuZXdWYWxcbiAgICAgIC8vIGFkZCBkZXAgdG8gbmV3IHZhbHVlXG4gICAgICB2YXIgbmV3Q2hpbGRPYiA9IG9iLm9ic2VydmUobmV3VmFsKVxuICAgICAgaWYgKG5ld0NoaWxkT2IpIHtcbiAgICAgICAgbmV3Q2hpbGRPYi5kZXBzLnB1c2goZGVwKVxuICAgICAgfVxuICAgICAgZGVwLm5vdGlmeSgpXG4gICAgfVxuICB9KVxufVxuXG4vKipcbiAqIE5vdGlmeSBjaGFuZ2Ugb24gYWxsIHNlbGYgZGVwcyBvbiBhbiBvYnNlcnZlci5cbiAqIFRoaXMgaXMgY2FsbGVkIHdoZW4gYSBtdXRhYmxlIHZhbHVlIG11dGF0ZXMuIGUuZy5cbiAqIHdoZW4gYW4gQXJyYXkncyBtdXRhdGluZyBtZXRob2RzIGFyZSBjYWxsZWQsIG9yIGFuXG4gKiBPYmplY3QncyAkYWRkLyRkZWxldGUgYXJlIGNhbGxlZC5cbiAqL1xuXG5wLm5vdGlmeSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGRlcHMgPSB0aGlzLmRlcHNcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBkZXBzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGRlcHNbaV0ubm90aWZ5KClcbiAgfVxufVxuXG4vKipcbiAqIEFkZCBhbiBvd25lciB2bSwgc28gdGhhdCB3aGVuICRhZGQvJGRlbGV0ZSBtdXRhdGlvbnNcbiAqIGhhcHBlbiB3ZSBjYW4gbm90aWZ5IG93bmVyIHZtcyB0byBwcm94eSB0aGUga2V5cyBhbmRcbiAqIGRpZ2VzdCB0aGUgd2F0Y2hlcnMuIFRoaXMgaXMgb25seSBjYWxsZWQgd2hlbiB0aGUgb2JqZWN0XG4gKiBpcyBvYnNlcnZlZCBhcyBhbiBpbnN0YW5jZSdzIHJvb3QgJGRhdGEuXG4gKlxuICogQHBhcmFtIHtWdWV9IHZtXG4gKi9cblxucC5hZGRWbSA9IGZ1bmN0aW9uICh2bSkge1xuICAodGhpcy52bXMgPSB0aGlzLnZtcyB8fCBbXSkucHVzaCh2bSlcbn1cblxuLyoqXG4gKiBSZW1vdmUgYW4gb3duZXIgdm0uIFRoaXMgaXMgY2FsbGVkIHdoZW4gdGhlIG9iamVjdCBpc1xuICogc3dhcHBlZCBvdXQgYXMgYW4gaW5zdGFuY2UncyAkZGF0YSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtWdWV9IHZtXG4gKi9cblxucC5yZW1vdmVWbSA9IGZ1bmN0aW9uICh2bSkge1xuICB0aGlzLnZtcy5zcGxpY2UodGhpcy52bXMuaW5kZXhPZih2bSksIDEpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gT2JzZXJ2ZXJcblxufSx7XCIuLi9jb25maWdcIjoxMyxcIi4uL3V0aWxcIjo2MCxcIi4vYXJyYXlcIjo0NCxcIi4vZGVwXCI6NDUsXCIuL29iamVjdFwiOjQ3fV0sNDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBvYmpQcm90byA9IE9iamVjdC5wcm90b3R5cGVcblxuLyoqXG4gKiBBZGQgYSBuZXcgcHJvcGVydHkgdG8gYW4gb2JzZXJ2ZWQgb2JqZWN0XG4gKiBhbmQgZW1pdHMgY29ycmVzcG9uZGluZyBldmVudFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7Kn0gdmFsXG4gKiBAcHVibGljXG4gKi9cblxuXy5kZWZpbmUoXG4gIG9ialByb3RvLFxuICAnJGFkZCcsXG4gIGZ1bmN0aW9uICRhZGQgKGtleSwgdmFsKSB7XG4gICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkoa2V5KSkgcmV0dXJuXG4gICAgdmFyIG9iID0gdGhpcy5fX29iX19cbiAgICBpZiAoIW9iIHx8IF8uaXNSZXNlcnZlZChrZXkpKSB7XG4gICAgICB0aGlzW2tleV0gPSB2YWxcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBvYi5jb252ZXJ0KGtleSwgdmFsKVxuICAgIGlmIChvYi52bXMpIHtcbiAgICAgIHZhciBpID0gb2Iudm1zLmxlbmd0aFxuICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICB2YXIgdm0gPSBvYi52bXNbaV1cbiAgICAgICAgdm0uX3Byb3h5KGtleSlcbiAgICAgICAgdm0uX2RpZ2VzdCgpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iLm5vdGlmeSgpXG4gICAgfVxuICB9XG4pXG5cbi8qKlxuICogRGVsZXRlcyBhIHByb3BlcnR5IGZyb20gYW4gb2JzZXJ2ZWQgb2JqZWN0XG4gKiBhbmQgZW1pdHMgY29ycmVzcG9uZGluZyBldmVudFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwdWJsaWNcbiAqL1xuXG5fLmRlZmluZShcbiAgb2JqUHJvdG8sXG4gICckZGVsZXRlJyxcbiAgZnVuY3Rpb24gJGRlbGV0ZSAoa2V5KSB7XG4gICAgaWYgKCF0aGlzLmhhc093blByb3BlcnR5KGtleSkpIHJldHVyblxuICAgIGRlbGV0ZSB0aGlzW2tleV1cbiAgICB2YXIgb2IgPSB0aGlzLl9fb2JfX1xuICAgIGlmICghb2IgfHwgXy5pc1Jlc2VydmVkKGtleSkpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAob2Iudm1zKSB7XG4gICAgICB2YXIgaSA9IG9iLnZtcy5sZW5ndGhcbiAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgdmFyIHZtID0gb2Iudm1zW2ldXG4gICAgICAgIHZtLl91bnByb3h5KGtleSlcbiAgICAgICAgdm0uX2RpZ2VzdCgpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iLm5vdGlmeSgpXG4gICAgfVxuICB9XG4pXG59LHtcIi4uL3V0aWxcIjo2MH1dLDQ4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBfID0gcmVxdWlyZSgnLi4vdXRpbCcpXG52YXIgQ2FjaGUgPSByZXF1aXJlKCcuLi9jYWNoZScpXG52YXIgY2FjaGUgPSBuZXcgQ2FjaGUoMTAwMClcbnZhciBhcmdSRSA9IC9eW15cXHtcXD9dKyR8XidbXiddKickfF5cIlteXCJdKlwiJC9cbnZhciBmaWx0ZXJUb2tlblJFID0gL1teXFxzJ1wiXSt8J1teJ10rJ3xcIlteXCJdK1wiL2dcblxuLyoqXG4gKiBQYXJzZXIgc3RhdGVcbiAqL1xuXG52YXIgc3RyXG52YXIgYywgaSwgbFxudmFyIGluU2luZ2xlXG52YXIgaW5Eb3VibGVcbnZhciBjdXJseVxudmFyIHNxdWFyZVxudmFyIHBhcmVuXG52YXIgYmVnaW5cbnZhciBhcmdJbmRleFxudmFyIGRpcnNcbnZhciBkaXJcbnZhciBsYXN0RmlsdGVySW5kZXhcbnZhciBhcmdcblxuLyoqXG4gKiBQdXNoIGEgZGlyZWN0aXZlIG9iamVjdCBpbnRvIHRoZSByZXN1bHQgQXJyYXlcbiAqL1xuXG5mdW5jdGlvbiBwdXNoRGlyICgpIHtcbiAgZGlyLnJhdyA9IHN0ci5zbGljZShiZWdpbiwgaSkudHJpbSgpXG4gIGlmIChkaXIuZXhwcmVzc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZGlyLmV4cHJlc3Npb24gPSBzdHIuc2xpY2UoYXJnSW5kZXgsIGkpLnRyaW0oKVxuICB9IGVsc2UgaWYgKGxhc3RGaWx0ZXJJbmRleCAhPT0gYmVnaW4pIHtcbiAgICBwdXNoRmlsdGVyKClcbiAgfVxuICBpZiAoaSA9PT0gMCB8fCBkaXIuZXhwcmVzc2lvbikge1xuICAgIGRpcnMucHVzaChkaXIpXG4gIH1cbn1cblxuLyoqXG4gKiBQdXNoIGEgZmlsdGVyIHRvIHRoZSBjdXJyZW50IGRpcmVjdGl2ZSBvYmplY3RcbiAqL1xuXG5mdW5jdGlvbiBwdXNoRmlsdGVyICgpIHtcbiAgdmFyIGV4cCA9IHN0ci5zbGljZShsYXN0RmlsdGVySW5kZXgsIGkpLnRyaW0oKVxuICB2YXIgZmlsdGVyXG4gIGlmIChleHApIHtcbiAgICBmaWx0ZXIgPSB7fVxuICAgIHZhciB0b2tlbnMgPSBleHAubWF0Y2goZmlsdGVyVG9rZW5SRSlcbiAgICBmaWx0ZXIubmFtZSA9IHRva2Vuc1swXVxuICAgIGZpbHRlci5hcmdzID0gdG9rZW5zLmxlbmd0aCA+IDEgPyB0b2tlbnMuc2xpY2UoMSkgOiBudWxsXG4gIH1cbiAgaWYgKGZpbHRlcikge1xuICAgIChkaXIuZmlsdGVycyA9IGRpci5maWx0ZXJzIHx8IFtdKS5wdXNoKGZpbHRlcilcbiAgfVxuICBsYXN0RmlsdGVySW5kZXggPSBpICsgMVxufVxuXG4vKipcbiAqIFBhcnNlIGEgZGlyZWN0aXZlIHN0cmluZyBpbnRvIGFuIEFycmF5IG9mIEFTVC1saWtlXG4gKiBvYmplY3RzIHJlcHJlc2VudGluZyBkaXJlY3RpdmVzLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogXCJjbGljazogYSA9IGEgKyAxIHwgdXBwZXJjYXNlXCIgd2lsbCB5aWVsZDpcbiAqIHtcbiAqICAgYXJnOiAnY2xpY2snLFxuICogICBleHByZXNzaW9uOiAnYSA9IGEgKyAxJyxcbiAqICAgZmlsdGVyczogW1xuICogICAgIHsgbmFtZTogJ3VwcGVyY2FzZScsIGFyZ3M6IG51bGwgfVxuICogICBdXG4gKiB9XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7QXJyYXk8T2JqZWN0Pn1cbiAqL1xuXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKHMpIHtcblxuICB2YXIgaGl0ID0gY2FjaGUuZ2V0KHMpXG4gIGlmIChoaXQpIHtcbiAgICByZXR1cm4gaGl0XG4gIH1cblxuICAvLyByZXNldCBwYXJzZXIgc3RhdGVcbiAgc3RyID0gc1xuICBpblNpbmdsZSA9IGluRG91YmxlID0gZmFsc2VcbiAgY3VybHkgPSBzcXVhcmUgPSBwYXJlbiA9IGJlZ2luID0gYXJnSW5kZXggPSAwXG4gIGxhc3RGaWx0ZXJJbmRleCA9IDBcbiAgZGlycyA9IFtdXG4gIGRpciA9IHt9XG4gIGFyZyA9IG51bGxcblxuICBmb3IgKGkgPSAwLCBsID0gc3RyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGlmIChpblNpbmdsZSkge1xuICAgICAgLy8gY2hlY2sgc2luZ2xlIHF1b3RlXG4gICAgICBpZiAoYyA9PT0gMHgyNykgaW5TaW5nbGUgPSAhaW5TaW5nbGVcbiAgICB9IGVsc2UgaWYgKGluRG91YmxlKSB7XG4gICAgICAvLyBjaGVjayBkb3VibGUgcXVvdGVcbiAgICAgIGlmIChjID09PSAweDIyKSBpbkRvdWJsZSA9ICFpbkRvdWJsZVxuICAgIH0gZWxzZSBpZiAoXG4gICAgICBjID09PSAweDJDICYmIC8vIGNvbW1hXG4gICAgICAhcGFyZW4gJiYgIWN1cmx5ICYmICFzcXVhcmVcbiAgICApIHtcbiAgICAgIC8vIHJlYWNoZWQgdGhlIGVuZCBvZiBhIGRpcmVjdGl2ZVxuICAgICAgcHVzaERpcigpXG4gICAgICAvLyByZXNldCAmIHNraXAgdGhlIGNvbW1hXG4gICAgICBkaXIgPSB7fVxuICAgICAgYmVnaW4gPSBhcmdJbmRleCA9IGxhc3RGaWx0ZXJJbmRleCA9IGkgKyAxXG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGMgPT09IDB4M0EgJiYgLy8gY29sb25cbiAgICAgICFkaXIuZXhwcmVzc2lvbiAmJlxuICAgICAgIWRpci5hcmdcbiAgICApIHtcbiAgICAgIC8vIGFyZ3VtZW50XG4gICAgICBhcmcgPSBzdHIuc2xpY2UoYmVnaW4sIGkpLnRyaW0oKVxuICAgICAgLy8gdGVzdCBmb3IgdmFsaWQgYXJndW1lbnQgaGVyZVxuICAgICAgLy8gc2luY2Ugd2UgbWF5IGhhdmUgY2F1Z2h0IHN0dWZmIGxpa2UgZmlyc3QgaGFsZiBvZlxuICAgICAgLy8gYW4gb2JqZWN0IGxpdGVyYWwgb3IgYSB0ZXJuYXJ5IGV4cHJlc3Npb24uXG4gICAgICBpZiAoYXJnUkUudGVzdChhcmcpKSB7XG4gICAgICAgIGFyZ0luZGV4ID0gaSArIDFcbiAgICAgICAgZGlyLmFyZyA9IF8uc3RyaXBRdW90ZXMoYXJnKSB8fCBhcmdcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgYyA9PT0gMHg3QyAmJiAvLyBwaXBlXG4gICAgICBzdHIuY2hhckNvZGVBdChpICsgMSkgIT09IDB4N0MgJiZcbiAgICAgIHN0ci5jaGFyQ29kZUF0KGkgLSAxKSAhPT0gMHg3Q1xuICAgICkge1xuICAgICAgaWYgKGRpci5leHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gZmlyc3QgZmlsdGVyLCBlbmQgb2YgZXhwcmVzc2lvblxuICAgICAgICBsYXN0RmlsdGVySW5kZXggPSBpICsgMVxuICAgICAgICBkaXIuZXhwcmVzc2lvbiA9IHN0ci5zbGljZShhcmdJbmRleCwgaSkudHJpbSgpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBhbHJlYWR5IGhhcyBmaWx0ZXJcbiAgICAgICAgcHVzaEZpbHRlcigpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICBjYXNlIDB4MjI6IGluRG91YmxlID0gdHJ1ZTsgYnJlYWsgLy8gXCJcbiAgICAgICAgY2FzZSAweDI3OiBpblNpbmdsZSA9IHRydWU7IGJyZWFrIC8vICdcbiAgICAgICAgY2FzZSAweDI4OiBwYXJlbisrOyBicmVhayAgICAgICAgIC8vIChcbiAgICAgICAgY2FzZSAweDI5OiBwYXJlbi0tOyBicmVhayAgICAgICAgIC8vIClcbiAgICAgICAgY2FzZSAweDVCOiBzcXVhcmUrKzsgYnJlYWsgICAgICAgIC8vIFtcbiAgICAgICAgY2FzZSAweDVEOiBzcXVhcmUtLTsgYnJlYWsgICAgICAgIC8vIF1cbiAgICAgICAgY2FzZSAweDdCOiBjdXJseSsrOyBicmVhayAgICAgICAgIC8vIHtcbiAgICAgICAgY2FzZSAweDdEOiBjdXJseS0tOyBicmVhayAgICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoaSA9PT0gMCB8fCBiZWdpbiAhPT0gaSkge1xuICAgIHB1c2hEaXIoKVxuICB9XG5cbiAgY2FjaGUucHV0KHMsIGRpcnMpXG4gIHJldHVybiBkaXJzXG59XG59LHtcIi4uL2NhY2hlXCI6MTAsXCIuLi91dGlsXCI6NjB9XSw0OTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIFBhdGggPSByZXF1aXJlKCcuL3BhdGgnKVxudmFyIENhY2hlID0gcmVxdWlyZSgnLi4vY2FjaGUnKVxudmFyIGV4cHJlc3Npb25DYWNoZSA9IG5ldyBDYWNoZSgxMDAwKVxuXG52YXIga2V5d29yZHMgPVxuICAnTWF0aCxicmVhayxjYXNlLGNhdGNoLGNvbnRpbnVlLGRlYnVnZ2VyLGRlZmF1bHQsJyArXG4gICdkZWxldGUsZG8sZWxzZSxmYWxzZSxmaW5hbGx5LGZvcixmdW5jdGlvbixpZixpbiwnICtcbiAgJ2luc3RhbmNlb2YsbmV3LG51bGwscmV0dXJuLHN3aXRjaCx0aGlzLHRocm93LHRydWUsdHJ5LCcgK1xuICAndHlwZW9mLHZhcix2b2lkLHdoaWxlLHdpdGgsdW5kZWZpbmVkLGFic3RyYWN0LGJvb2xlYW4sJyArXG4gICdieXRlLGNoYXIsY2xhc3MsY29uc3QsZG91YmxlLGVudW0sZXhwb3J0LGV4dGVuZHMsJyArXG4gICdmaW5hbCxmbG9hdCxnb3RvLGltcGxlbWVudHMsaW1wb3J0LGludCxpbnRlcmZhY2UsbG9uZywnICtcbiAgJ25hdGl2ZSxwYWNrYWdlLHByaXZhdGUscHJvdGVjdGVkLHB1YmxpYyxzaG9ydCxzdGF0aWMsJyArXG4gICdzdXBlcixzeW5jaHJvbml6ZWQsdGhyb3dzLHRyYW5zaWVudCx2b2xhdGlsZSwnICtcbiAgJ2FyZ3VtZW50cyxsZXQseWllbGQnXG5cbnZhciB3c1JFID0gL1xccy9nXG52YXIgbmV3bGluZVJFID0gL1xcbi9nXG52YXIgc2F2ZVJFID0gL1tcXHssXVxccypbXFx3XFwkX10rXFxzKjp8J1teJ10qJ3xcIlteXCJdKlwiL2dcbnZhciByZXN0b3JlUkUgPSAvXCIoXFxkKylcIi9nXG52YXIgcGF0aFRlc3RSRSA9IC9eW0EtWmEtel8kXVtcXHckXSooXFwuW0EtWmEtel8kXVtcXHckXSp8XFxbJy4qPydcXF18XFxbXCIuKj9cIlxcXXxcXFtcXGQrXFxdKSokL1xudmFyIHBhdGhSZXBsYWNlUkUgPSAvW15cXHckXFwuXShbQS1aYS16XyRdW1xcdyRdKihcXC5bQS1aYS16XyRdW1xcdyRdKnxcXFsnLio/J1xcXXxcXFtcIi4qP1wiXFxdKSopL2dcbnZhciBrZXl3b3Jkc1JFID0gbmV3IFJlZ0V4cCgnXignICsga2V5d29yZHMucmVwbGFjZSgvLC9nLCAnXFxcXGJ8JykgKyAnXFxcXGIpJylcblxuLyoqXG4gKiBTYXZlIC8gUmV3cml0ZSAvIFJlc3RvcmVcbiAqXG4gKiBXaGVuIHJld3JpdGluZyBwYXRocyBmb3VuZCBpbiBhbiBleHByZXNzaW9uLCBpdCBpc1xuICogcG9zc2libGUgZm9yIHRoZSBzYW1lIGxldHRlciBzZXF1ZW5jZXMgdG8gYmUgZm91bmQgaW5cbiAqIHN0cmluZ3MgYW5kIE9iamVjdCBsaXRlcmFsIHByb3BlcnR5IGtleXMuIFRoZXJlZm9yZSB3ZVxuICogcmVtb3ZlIGFuZCBzdG9yZSB0aGVzZSBwYXJ0cyBpbiBhIHRlbXBvcmFyeSBhcnJheSwgYW5kXG4gKiByZXN0b3JlIHRoZW0gYWZ0ZXIgdGhlIHBhdGggcmV3cml0ZS5cbiAqL1xuXG52YXIgc2F2ZWQgPSBbXVxuXG4vKipcbiAqIFNhdmUgcmVwbGFjZXJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtTdHJpbmd9IC0gcGxhY2Vob2xkZXIgd2l0aCBpbmRleFxuICovXG5cbmZ1bmN0aW9uIHNhdmUgKHN0cikge1xuICB2YXIgaSA9IHNhdmVkLmxlbmd0aFxuICBzYXZlZFtpXSA9IHN0ci5yZXBsYWNlKG5ld2xpbmVSRSwgJ1xcXFxuJylcbiAgcmV0dXJuICdcIicgKyBpICsgJ1wiJ1xufVxuXG4vKipcbiAqIFBhdGggcmV3cml0ZSByZXBsYWNlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSByYXdcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiByZXdyaXRlIChyYXcpIHtcbiAgdmFyIGMgPSByYXcuY2hhckF0KDApXG4gIHZhciBwYXRoID0gcmF3LnNsaWNlKDEpXG4gIGlmIChrZXl3b3Jkc1JFLnRlc3QocGF0aCkpIHtcbiAgICByZXR1cm4gcmF3XG4gIH0gZWxzZSB7XG4gICAgcGF0aCA9IHBhdGguaW5kZXhPZignXCInKSA+IC0xXG4gICAgICA/IHBhdGgucmVwbGFjZShyZXN0b3JlUkUsIHJlc3RvcmUpXG4gICAgICA6IHBhdGhcbiAgICByZXR1cm4gYyArICdzY29wZS4nICsgcGF0aFxuICB9XG59XG5cbi8qKlxuICogUmVzdG9yZSByZXBsYWNlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBpIC0gbWF0Y2hlZCBzYXZlIGluZGV4XG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gcmVzdG9yZSAoc3RyLCBpKSB7XG4gIHJldHVybiBzYXZlZFtpXVxufVxuXG4vKipcbiAqIFJld3JpdGUgYW4gZXhwcmVzc2lvbiwgcHJlZml4aW5nIGFsbCBwYXRoIGFjY2Vzc29ycyB3aXRoXG4gKiBgc2NvcGUuYCBhbmQgZ2VuZXJhdGUgZ2V0dGVyL3NldHRlciBmdW5jdGlvbnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV4cFxuICogQHBhcmFtIHtCb29sZWFufSBuZWVkU2V0XG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuXG5mdW5jdGlvbiBjb21waWxlRXhwRm5zIChleHAsIG5lZWRTZXQpIHtcbiAgLy8gcmVzZXQgc3RhdGVcbiAgc2F2ZWQubGVuZ3RoID0gMFxuICAvLyBzYXZlIHN0cmluZ3MgYW5kIG9iamVjdCBsaXRlcmFsIGtleXNcbiAgdmFyIGJvZHkgPSBleHBcbiAgICAucmVwbGFjZShzYXZlUkUsIHNhdmUpXG4gICAgLnJlcGxhY2Uod3NSRSwgJycpXG4gIC8vIHJld3JpdGUgYWxsIHBhdGhzXG4gIC8vIHBhZCAxIHNwYWNlIGhlcmUgYmVjYXVlIHRoZSByZWdleCBtYXRjaGVzIDEgZXh0cmEgY2hhclxuICBib2R5ID0gKCcgJyArIGJvZHkpXG4gICAgLnJlcGxhY2UocGF0aFJlcGxhY2VSRSwgcmV3cml0ZSlcbiAgICAucmVwbGFjZShyZXN0b3JlUkUsIHJlc3RvcmUpXG4gIHZhciBnZXR0ZXIgPSBtYWtlR2V0dGVyKGJvZHkpXG4gIGlmIChnZXR0ZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ2V0OiBnZXR0ZXIsXG4gICAgICBib2R5OiBib2R5LFxuICAgICAgc2V0OiBuZWVkU2V0XG4gICAgICAgID8gbWFrZVNldHRlcihib2R5KVxuICAgICAgICA6IG51bGxcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDb21waWxlIGdldHRlciBzZXR0ZXJzIGZvciBhIHNpbXBsZSBwYXRoLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBleHBcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5cbmZ1bmN0aW9uIGNvbXBpbGVQYXRoRm5zIChleHApIHtcbiAgdmFyIGdldHRlciwgcGF0aFxuICBpZiAoZXhwLmluZGV4T2YoJ1snKSA8IDApIHtcbiAgICAvLyByZWFsbHkgc2ltcGxlIHBhdGhcbiAgICBwYXRoID0gZXhwLnNwbGl0KCcuJylcbiAgICBnZXR0ZXIgPSBQYXRoLmNvbXBpbGVHZXR0ZXIocGF0aClcbiAgfSBlbHNlIHtcbiAgICAvLyBkbyB0aGUgcmVhbCBwYXJzaW5nXG4gICAgcGF0aCA9IFBhdGgucGFyc2UoZXhwKVxuICAgIGdldHRlciA9IHBhdGguZ2V0XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBnZXQ6IGdldHRlcixcbiAgICAvLyBhbHdheXMgZ2VuZXJhdGUgc2V0dGVyIGZvciBzaW1wbGUgcGF0aHNcbiAgICBzZXQ6IGZ1bmN0aW9uIChvYmosIHZhbCkge1xuICAgICAgUGF0aC5zZXQob2JqLCBwYXRoLCB2YWwpXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQnVpbGQgYSBnZXR0ZXIgZnVuY3Rpb24uIFJlcXVpcmVzIGV2YWwuXG4gKlxuICogV2UgaXNvbGF0ZSB0aGUgdHJ5L2NhdGNoIHNvIGl0IGRvZXNuJ3QgYWZmZWN0IHRoZVxuICogb3B0aW1pemF0aW9uIG9mIHRoZSBwYXJzZSBmdW5jdGlvbiB3aGVuIGl0IGlzIG5vdCBjYWxsZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGJvZHlcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufHVuZGVmaW5lZH1cbiAqL1xuXG5mdW5jdGlvbiBtYWtlR2V0dGVyIChib2R5KSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG5ldyBGdW5jdGlvbignc2NvcGUnLCAncmV0dXJuICcgKyBib2R5ICsgJzsnKVxuICB9IGNhdGNoIChlKSB7XG4gICAgXy53YXJuKFxuICAgICAgJ0ludmFsaWQgZXhwcmVzc2lvbi4gJyArXG4gICAgICAnR2VuZXJhdGVkIGZ1bmN0aW9uIGJvZHk6ICcgKyBib2R5XG4gICAgKVxuICB9XG59XG5cbi8qKlxuICogQnVpbGQgYSBzZXR0ZXIgZnVuY3Rpb24uXG4gKlxuICogVGhpcyBpcyBvbmx5IG5lZWRlZCBpbiByYXJlIHNpdHVhdGlvbnMgbGlrZSBcImFbYl1cIiB3aGVyZVxuICogYSBzZXR0YWJsZSBwYXRoIHJlcXVpcmVzIGR5bmFtaWMgZXZhbHVhdGlvbi5cbiAqXG4gKiBUaGlzIHNldHRlciBmdW5jdGlvbiBtYXkgdGhyb3cgZXJyb3Igd2hlbiBjYWxsZWQgaWYgdGhlXG4gKiBleHByZXNzaW9uIGJvZHkgaXMgbm90IGEgdmFsaWQgbGVmdC1oYW5kIGV4cHJlc3Npb24gaW5cbiAqIGFzc2lnbm1lbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGJvZHlcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufHVuZGVmaW5lZH1cbiAqL1xuXG5mdW5jdGlvbiBtYWtlU2V0dGVyIChib2R5KSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG5ldyBGdW5jdGlvbignc2NvcGUnLCAndmFsdWUnLCBib2R5ICsgJz12YWx1ZTsnKVxuICB9IGNhdGNoIChlKSB7XG4gICAgXy53YXJuKCdJbnZhbGlkIHNldHRlciBmdW5jdGlvbiBib2R5OiAnICsgYm9keSlcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrIGZvciBzZXR0ZXIgZXhpc3RlbmNlIG9uIGEgY2FjaGUgaGl0LlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhpdFxuICovXG5cbmZ1bmN0aW9uIGNoZWNrU2V0dGVyIChoaXQpIHtcbiAgaWYgKCFoaXQuc2V0KSB7XG4gICAgaGl0LnNldCA9IG1ha2VTZXR0ZXIoaGl0LmJvZHkpXG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhbiBleHByZXNzaW9uIGludG8gcmUtd3JpdHRlbiBnZXR0ZXIvc2V0dGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXhwXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG5lZWRTZXRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoZXhwLCBuZWVkU2V0KSB7XG4gIGV4cCA9IGV4cC50cmltKClcbiAgLy8gdHJ5IGNhY2hlXG4gIHZhciBoaXQgPSBleHByZXNzaW9uQ2FjaGUuZ2V0KGV4cClcbiAgaWYgKGhpdCkge1xuICAgIGlmIChuZWVkU2V0KSB7XG4gICAgICBjaGVja1NldHRlcihoaXQpXG4gICAgfVxuICAgIHJldHVybiBoaXRcbiAgfVxuICAvLyB3ZSBkbyBhIHNpbXBsZSBwYXRoIGNoZWNrIHRvIG9wdGltaXplIGZvciB0aGVtLlxuICAvLyB0aGUgY2hlY2sgZmFpbHMgdmFsaWQgcGF0aHMgd2l0aCB1bnVzYWwgd2hpdGVzcGFjZXMsXG4gIC8vIGJ1dCB0aGF0J3MgdG9vIHJhcmUgYW5kIHdlIGRvbid0IGNhcmUuXG4gIHZhciByZXMgPSBwYXRoVGVzdFJFLnRlc3QoZXhwKVxuICAgID8gY29tcGlsZVBhdGhGbnMoZXhwKVxuICAgIDogY29tcGlsZUV4cEZucyhleHAsIG5lZWRTZXQpXG4gIGV4cHJlc3Npb25DYWNoZS5wdXQoZXhwLCByZXMpXG4gIHJldHVybiByZXNcbn1cblxuLy8gRXhwb3J0IHRoZSBwYXRoUmVnZXggZm9yIGV4dGVybmFsIHVzZVxuZXhwb3J0cy5wYXRoVGVzdFJFID0gcGF0aFRlc3RSRVxufSx7XCIuLi9jYWNoZVwiOjEwLFwiLi4vdXRpbFwiOjYwLFwiLi9wYXRoXCI6NTB9XSw1MDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIENhY2hlID0gcmVxdWlyZSgnLi4vY2FjaGUnKVxudmFyIHBhdGhDYWNoZSA9IG5ldyBDYWNoZSgxMDAwKVxudmFyIGlkZW50UkUgPSAvXlskX2EtekEtWl0rW1xcdyRdKiQvXG5cbi8qKlxuICogUGF0aC1wYXJzaW5nIGFsZ29yaXRobSBzY29vcGVkIGZyb20gUG9seW1lci9vYnNlcnZlLWpzXG4gKi9cblxudmFyIHBhdGhTdGF0ZU1hY2hpbmUgPSB7XG4gICdiZWZvcmVQYXRoJzoge1xuICAgICd3cyc6IFsnYmVmb3JlUGF0aCddLFxuICAgICdpZGVudCc6IFsnaW5JZGVudCcsICdhcHBlbmQnXSxcbiAgICAnWyc6IFsnYmVmb3JlRWxlbWVudCddLFxuICAgICdlb2YnOiBbJ2FmdGVyUGF0aCddXG4gIH0sXG5cbiAgJ2luUGF0aCc6IHtcbiAgICAnd3MnOiBbJ2luUGF0aCddLFxuICAgICcuJzogWydiZWZvcmVJZGVudCddLFxuICAgICdbJzogWydiZWZvcmVFbGVtZW50J10sXG4gICAgJ2VvZic6IFsnYWZ0ZXJQYXRoJ11cbiAgfSxcblxuICAnYmVmb3JlSWRlbnQnOiB7XG4gICAgJ3dzJzogWydiZWZvcmVJZGVudCddLFxuICAgICdpZGVudCc6IFsnaW5JZGVudCcsICdhcHBlbmQnXVxuICB9LFxuXG4gICdpbklkZW50Jzoge1xuICAgICdpZGVudCc6IFsnaW5JZGVudCcsICdhcHBlbmQnXSxcbiAgICAnMCc6IFsnaW5JZGVudCcsICdhcHBlbmQnXSxcbiAgICAnbnVtYmVyJzogWydpbklkZW50JywgJ2FwcGVuZCddLFxuICAgICd3cyc6IFsnaW5QYXRoJywgJ3B1c2gnXSxcbiAgICAnLic6IFsnYmVmb3JlSWRlbnQnLCAncHVzaCddLFxuICAgICdbJzogWydiZWZvcmVFbGVtZW50JywgJ3B1c2gnXSxcbiAgICAnZW9mJzogWydhZnRlclBhdGgnLCAncHVzaCddXG4gIH0sXG5cbiAgJ2JlZm9yZUVsZW1lbnQnOiB7XG4gICAgJ3dzJzogWydiZWZvcmVFbGVtZW50J10sXG4gICAgJzAnOiBbJ2FmdGVyWmVybycsICdhcHBlbmQnXSxcbiAgICAnbnVtYmVyJzogWydpbkluZGV4JywgJ2FwcGVuZCddLFxuICAgIFwiJ1wiOiBbJ2luU2luZ2xlUXVvdGUnLCAnYXBwZW5kJywgJyddLFxuICAgICdcIic6IFsnaW5Eb3VibGVRdW90ZScsICdhcHBlbmQnLCAnJ11cbiAgfSxcblxuICAnYWZ0ZXJaZXJvJzoge1xuICAgICd3cyc6IFsnYWZ0ZXJFbGVtZW50JywgJ3B1c2gnXSxcbiAgICAnXSc6IFsnaW5QYXRoJywgJ3B1c2gnXVxuICB9LFxuXG4gICdpbkluZGV4Jzoge1xuICAgICcwJzogWydpbkluZGV4JywgJ2FwcGVuZCddLFxuICAgICdudW1iZXInOiBbJ2luSW5kZXgnLCAnYXBwZW5kJ10sXG4gICAgJ3dzJzogWydhZnRlckVsZW1lbnQnXSxcbiAgICAnXSc6IFsnaW5QYXRoJywgJ3B1c2gnXVxuICB9LFxuXG4gICdpblNpbmdsZVF1b3RlJzoge1xuICAgIFwiJ1wiOiBbJ2FmdGVyRWxlbWVudCddLFxuICAgICdlb2YnOiAnZXJyb3InLFxuICAgICdlbHNlJzogWydpblNpbmdsZVF1b3RlJywgJ2FwcGVuZCddXG4gIH0sXG5cbiAgJ2luRG91YmxlUXVvdGUnOiB7XG4gICAgJ1wiJzogWydhZnRlckVsZW1lbnQnXSxcbiAgICAnZW9mJzogJ2Vycm9yJyxcbiAgICAnZWxzZSc6IFsnaW5Eb3VibGVRdW90ZScsICdhcHBlbmQnXVxuICB9LFxuXG4gICdhZnRlckVsZW1lbnQnOiB7XG4gICAgJ3dzJzogWydhZnRlckVsZW1lbnQnXSxcbiAgICAnXSc6IFsnaW5QYXRoJywgJ3B1c2gnXVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vb3AgKCkge31cblxuLyoqXG4gKiBEZXRlcm1pbmUgdGhlIHR5cGUgb2YgYSBjaGFyYWN0ZXIgaW4gYSBrZXlwYXRoLlxuICpcbiAqIEBwYXJhbSB7Q2hhcn0gY2hhclxuICogQHJldHVybiB7U3RyaW5nfSB0eXBlXG4gKi9cblxuZnVuY3Rpb24gZ2V0UGF0aENoYXJUeXBlIChjaGFyKSB7XG4gIGlmIChjaGFyID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gJ2VvZidcbiAgfVxuXG4gIHZhciBjb2RlID0gY2hhci5jaGFyQ29kZUF0KDApXG5cbiAgc3dpdGNoKGNvZGUpIHtcbiAgICBjYXNlIDB4NUI6IC8vIFtcbiAgICBjYXNlIDB4NUQ6IC8vIF1cbiAgICBjYXNlIDB4MkU6IC8vIC5cbiAgICBjYXNlIDB4MjI6IC8vIFwiXG4gICAgY2FzZSAweDI3OiAvLyAnXG4gICAgY2FzZSAweDMwOiAvLyAwXG4gICAgICByZXR1cm4gY2hhclxuXG4gICAgY2FzZSAweDVGOiAvLyBfXG4gICAgY2FzZSAweDI0OiAvLyAkXG4gICAgICByZXR1cm4gJ2lkZW50J1xuXG4gICAgY2FzZSAweDIwOiAvLyBTcGFjZVxuICAgIGNhc2UgMHgwOTogLy8gVGFiXG4gICAgY2FzZSAweDBBOiAvLyBOZXdsaW5lXG4gICAgY2FzZSAweDBEOiAvLyBSZXR1cm5cbiAgICBjYXNlIDB4QTA6ICAvLyBOby1icmVhayBzcGFjZVxuICAgIGNhc2UgMHhGRUZGOiAgLy8gQnl0ZSBPcmRlciBNYXJrXG4gICAgY2FzZSAweDIwMjg6ICAvLyBMaW5lIFNlcGFyYXRvclxuICAgIGNhc2UgMHgyMDI5OiAgLy8gUGFyYWdyYXBoIFNlcGFyYXRvclxuICAgICAgcmV0dXJuICd3cydcbiAgfVxuXG4gIC8vIGEteiwgQS1aXG4gIGlmICgoMHg2MSA8PSBjb2RlICYmIGNvZGUgPD0gMHg3QSkgfHxcbiAgICAgICgweDQxIDw9IGNvZGUgJiYgY29kZSA8PSAweDVBKSkge1xuICAgIHJldHVybiAnaWRlbnQnXG4gIH1cblxuICAvLyAxLTlcbiAgaWYgKDB4MzEgPD0gY29kZSAmJiBjb2RlIDw9IDB4MzkpIHtcbiAgICByZXR1cm4gJ251bWJlcidcbiAgfVxuXG4gIHJldHVybiAnZWxzZSdcbn1cblxuLyoqXG4gKiBQYXJzZSBhIHN0cmluZyBwYXRoIGludG8gYW4gYXJyYXkgb2Ygc2VnbWVudHNcbiAqIFRvZG8gaW1wbGVtZW50IGNhY2hlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0FycmF5fHVuZGVmaW5lZH1cbiAqL1xuXG5mdW5jdGlvbiBwYXJzZVBhdGggKHBhdGgpIHtcbiAgdmFyIGtleXMgPSBbXVxuICB2YXIgaW5kZXggPSAtMVxuICB2YXIgbW9kZSA9ICdiZWZvcmVQYXRoJ1xuICB2YXIgYywgbmV3Q2hhciwga2V5LCB0eXBlLCB0cmFuc2l0aW9uLCBhY3Rpb24sIHR5cGVNYXBcblxuICB2YXIgYWN0aW9ucyA9IHtcbiAgICBwdXNoOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGtleXMucHVzaChrZXkpXG4gICAgICBrZXkgPSB1bmRlZmluZWRcbiAgICB9LFxuICAgIGFwcGVuZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAga2V5ID0gbmV3Q2hhclxuICAgICAgfSBlbHNlIHtcbiAgICAgICAga2V5ICs9IG5ld0NoYXJcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtYXliZVVuZXNjYXBlUXVvdGUgKCkge1xuICAgIHZhciBuZXh0Q2hhciA9IHBhdGhbaW5kZXggKyAxXVxuICAgIGlmICgobW9kZSA9PT0gJ2luU2luZ2xlUXVvdGUnICYmIG5leHRDaGFyID09PSBcIidcIikgfHxcbiAgICAgICAgKG1vZGUgPT09ICdpbkRvdWJsZVF1b3RlJyAmJiBuZXh0Q2hhciA9PT0gJ1wiJykpIHtcbiAgICAgIGluZGV4KytcbiAgICAgIG5ld0NoYXIgPSBuZXh0Q2hhclxuICAgICAgYWN0aW9ucy5hcHBlbmQoKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cblxuICB3aGlsZSAobW9kZSkge1xuICAgIGluZGV4KytcbiAgICBjID0gcGF0aFtpbmRleF1cblxuICAgIGlmIChjID09PSAnXFxcXCcgJiYgbWF5YmVVbmVzY2FwZVF1b3RlKCkpIHtcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgdHlwZSA9IGdldFBhdGhDaGFyVHlwZShjKVxuICAgIHR5cGVNYXAgPSBwYXRoU3RhdGVNYWNoaW5lW21vZGVdXG4gICAgdHJhbnNpdGlvbiA9IHR5cGVNYXBbdHlwZV0gfHwgdHlwZU1hcFsnZWxzZSddIHx8ICdlcnJvcidcblxuICAgIGlmICh0cmFuc2l0aW9uID09PSAnZXJyb3InKSB7XG4gICAgICByZXR1cm4gLy8gcGFyc2UgZXJyb3JcbiAgICB9XG5cbiAgICBtb2RlID0gdHJhbnNpdGlvblswXVxuICAgIGFjdGlvbiA9IGFjdGlvbnNbdHJhbnNpdGlvblsxXV0gfHwgbm9vcFxuICAgIG5ld0NoYXIgPSB0cmFuc2l0aW9uWzJdID09PSB1bmRlZmluZWRcbiAgICAgID8gY1xuICAgICAgOiB0cmFuc2l0aW9uWzJdXG4gICAgYWN0aW9uKClcblxuICAgIGlmIChtb2RlID09PSAnYWZ0ZXJQYXRoJykge1xuICAgICAgcmV0dXJuIGtleXNcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBGb3JtYXQgYSBhY2Nlc3NvciBzZWdtZW50IGJhc2VkIG9uIGl0cyB0eXBlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0QWNjZXNzb3Ioa2V5KSB7XG4gIGlmIChpZGVudFJFLnRlc3Qoa2V5KSkgeyAvLyBpZGVudGlmaWVyXG4gICAgcmV0dXJuICcuJyArIGtleVxuICB9IGVsc2UgaWYgKCtrZXkgPT09IGtleSA+Pj4gMCkgeyAvLyBicmFja2V0IGluZGV4XG4gICAgcmV0dXJuICdbJyArIGtleSArICddJ1xuICB9IGVsc2UgeyAvLyBicmFja2V0IHN0cmluZ1xuICAgIHJldHVybiAnW1wiJyArIGtleS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgKyAnXCJdJ1xuICB9XG59XG5cbi8qKlxuICogQ29tcGlsZXMgYSBnZXR0ZXIgZnVuY3Rpb24gd2l0aCBhIGZpeGVkIHBhdGguXG4gKlxuICogQHBhcmFtIHtBcnJheX0gcGF0aFxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblxuZXhwb3J0cy5jb21waWxlR2V0dGVyID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdmFyIGJvZHkgPVxuICAgICd0cnl7cmV0dXJuIG8nICtcbiAgICBwYXRoLm1hcChmb3JtYXRBY2Nlc3Nvcikuam9pbignJykgK1xuICAgICd9Y2F0Y2goZSl7fTsnXG4gIHJldHVybiBuZXcgRnVuY3Rpb24oJ28nLCBib2R5KVxufVxuXG4vKipcbiAqIEV4dGVybmFsIHBhcnNlIHRoYXQgY2hlY2sgZm9yIGEgY2FjaGUgaGl0IGZpcnN0XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0FycmF5fHVuZGVmaW5lZH1cbiAqL1xuXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdmFyIGhpdCA9IHBhdGhDYWNoZS5nZXQocGF0aClcbiAgaWYgKCFoaXQpIHtcbiAgICBoaXQgPSBwYXJzZVBhdGgocGF0aClcbiAgICBpZiAoaGl0KSB7XG4gICAgICBoaXQuZ2V0ID0gZXhwb3J0cy5jb21waWxlR2V0dGVyKGhpdClcbiAgICAgIHBhdGhDYWNoZS5wdXQocGF0aCwgaGl0KVxuICAgIH1cbiAgfVxuICByZXR1cm4gaGl0XG59XG5cbi8qKlxuICogR2V0IGZyb20gYW4gb2JqZWN0IGZyb20gYSBwYXRoIHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKi9cblxuZXhwb3J0cy5nZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoKSB7XG4gIHBhdGggPSBleHBvcnRzLnBhcnNlKHBhdGgpXG4gIGlmIChwYXRoKSB7XG4gICAgcmV0dXJuIHBhdGguZ2V0KG9iailcbiAgfVxufVxuXG4vKipcbiAqIFNldCBvbiBhbiBvYmplY3QgZnJvbSBhIHBhdGhcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge1N0cmluZyB8IEFycmF5fSBwYXRoXG4gKiBAcGFyYW0geyp9IHZhbFxuICovXG5cbmV4cG9ydHMuc2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsKSB7XG4gIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICBwYXRoID0gZXhwb3J0cy5wYXJzZShwYXRoKVxuICB9XG4gIGlmICghcGF0aCB8fCAhXy5pc09iamVjdChvYmopKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgdmFyIGxhc3QsIGtleVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhdGgubGVuZ3RoIC0gMTsgaSA8IGw7IGkrKykge1xuICAgIGxhc3QgPSBvYmpcbiAgICBrZXkgPSBwYXRoW2ldXG4gICAgb2JqID0gb2JqW2tleV1cbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkge1xuICAgICAgb2JqID0ge31cbiAgICAgIGxhc3QuJGFkZChrZXksIG9iailcbiAgICB9XG4gIH1cbiAga2V5ID0gcGF0aFtpXVxuICBpZiAoa2V5IGluIG9iaikge1xuICAgIG9ialtrZXldID0gdmFsXG4gIH0gZWxzZSB7XG4gICAgb2JqLiRhZGQoa2V5LCB2YWwpXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cbn0se1wiLi4vY2FjaGVcIjoxMCxcIi4uL3V0aWxcIjo2MH1dLDUxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBfID0gcmVxdWlyZSgnLi4vdXRpbCcpXG52YXIgQ2FjaGUgPSByZXF1aXJlKCcuLi9jYWNoZScpXG52YXIgdGVtcGxhdGVDYWNoZSA9IG5ldyBDYWNoZSgxMDAwKVxudmFyIGlkU2VsZWN0b3JDYWNoZSA9IG5ldyBDYWNoZSgxMDAwKVxuXG52YXIgbWFwID0ge1xuICBfZGVmYXVsdCA6IFswLCAnJywgJyddLFxuICBsZWdlbmQgICA6IFsxLCAnPGZpZWxkc2V0PicsICc8L2ZpZWxkc2V0PiddLFxuICB0ciAgICAgICA6IFsyLCAnPHRhYmxlPjx0Ym9keT4nLCAnPC90Ym9keT48L3RhYmxlPiddLFxuICBjb2wgICAgICA6IFtcbiAgICAyLFxuICAgICc8dGFibGU+PHRib2R5PjwvdGJvZHk+PGNvbGdyb3VwPicsXG4gICAgJzwvY29sZ3JvdXA+PC90YWJsZT4nXG4gIF1cbn1cblxubWFwLnRkID1cbm1hcC50aCA9IFtcbiAgMyxcbiAgJzx0YWJsZT48dGJvZHk+PHRyPicsXG4gICc8L3RyPjwvdGJvZHk+PC90YWJsZT4nXG5dXG5cbm1hcC5vcHRpb24gPVxubWFwLm9wdGdyb3VwID0gW1xuICAxLFxuICAnPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+JyxcbiAgJzwvc2VsZWN0Pidcbl1cblxubWFwLnRoZWFkID1cbm1hcC50Ym9keSA9XG5tYXAuY29sZ3JvdXAgPVxubWFwLmNhcHRpb24gPVxubWFwLnRmb290ID0gWzEsICc8dGFibGU+JywgJzwvdGFibGU+J11cblxubWFwLmcgPVxubWFwLmRlZnMgPVxubWFwLnN5bWJvbCA9XG5tYXAudXNlID1cbm1hcC5pbWFnZSA9XG5tYXAudGV4dCA9XG5tYXAuY2lyY2xlID1cbm1hcC5lbGxpcHNlID1cbm1hcC5saW5lID1cbm1hcC5wYXRoID1cbm1hcC5wb2x5Z29uID1cbm1hcC5wb2x5bGluZSA9XG5tYXAucmVjdCA9IFtcbiAgMSxcbiAgJzxzdmcgJyArXG4gICAgJ3htbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiAnICtcbiAgICAneG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgJyArXG4gICAgJ3htbG5zOmV2PVwiaHR0cDovL3d3dy53My5vcmcvMjAwMS94bWwtZXZlbnRzXCInICtcbiAgICAndmVyc2lvbj1cIjEuMVwiPicsXG4gICc8L3N2Zz4nXG5dXG5cbnZhciB0YWdSRSA9IC88KFtcXHc6XSspL1xudmFyIGVudGl0eVJFID0gLyZcXHcrOy9cblxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRlbXBsYXRlIHRvIGEgRG9jdW1lbnRGcmFnbWVudC5cbiAqIERldGVybWluZXMgY29ycmVjdCB3cmFwcGluZyBieSB0YWcgdHlwZXMuIFdyYXBwaW5nXG4gKiBzdHJhdGVneSBmb3VuZCBpbiBqUXVlcnkgJiBjb21wb25lbnQvZG9taWZ5LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZW1wbGF0ZVN0cmluZ1xuICogQHJldHVybiB7RG9jdW1lbnRGcmFnbWVudH1cbiAqL1xuXG5mdW5jdGlvbiBzdHJpbmdUb0ZyYWdtZW50ICh0ZW1wbGF0ZVN0cmluZykge1xuICAvLyB0cnkgYSBjYWNoZSBoaXQgZmlyc3RcbiAgdmFyIGhpdCA9IHRlbXBsYXRlQ2FjaGUuZ2V0KHRlbXBsYXRlU3RyaW5nKVxuICBpZiAoaGl0KSB7XG4gICAgcmV0dXJuIGhpdFxuICB9XG5cbiAgdmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcbiAgdmFyIHRhZ01hdGNoID0gdGVtcGxhdGVTdHJpbmcubWF0Y2godGFnUkUpXG4gIHZhciBlbnRpdHlNYXRjaCA9IGVudGl0eVJFLnRlc3QodGVtcGxhdGVTdHJpbmcpXG5cbiAgaWYgKCF0YWdNYXRjaCAmJiAhZW50aXR5TWF0Y2gpIHtcbiAgICAvLyB0ZXh0IG9ubHksIHJldHVybiBhIHNpbmdsZSB0ZXh0IG5vZGUuXG4gICAgZnJhZy5hcHBlbmRDaGlsZChcbiAgICAgIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRlbXBsYXRlU3RyaW5nKVxuICAgIClcbiAgfSBlbHNlIHtcblxuICAgIHZhciB0YWcgICAgPSB0YWdNYXRjaCAmJiB0YWdNYXRjaFsxXVxuICAgIHZhciB3cmFwICAgPSBtYXBbdGFnXSB8fCBtYXAuX2RlZmF1bHRcbiAgICB2YXIgZGVwdGggID0gd3JhcFswXVxuICAgIHZhciBwcmVmaXggPSB3cmFwWzFdXG4gICAgdmFyIHN1ZmZpeCA9IHdyYXBbMl1cbiAgICB2YXIgbm9kZSAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIG5vZGUuaW5uZXJIVE1MID0gcHJlZml4ICsgdGVtcGxhdGVTdHJpbmcudHJpbSgpICsgc3VmZml4XG4gICAgd2hpbGUgKGRlcHRoLS0pIHtcbiAgICAgIG5vZGUgPSBub2RlLmxhc3RDaGlsZFxuICAgIH1cblxuICAgIHZhciBjaGlsZFxuICAgIC8qIGpzaGludCBib3NzOnRydWUgKi9cbiAgICB3aGlsZSAoY2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoY2hpbGQpXG4gICAgfVxuICB9XG5cbiAgdGVtcGxhdGVDYWNoZS5wdXQodGVtcGxhdGVTdHJpbmcsIGZyYWcpXG4gIHJldHVybiBmcmFnXG59XG5cbi8qKlxuICogQ29udmVydCBhIHRlbXBsYXRlIG5vZGUgdG8gYSBEb2N1bWVudEZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7RG9jdW1lbnRGcmFnbWVudH1cbiAqL1xuXG5mdW5jdGlvbiBub2RlVG9GcmFnbWVudCAobm9kZSkge1xuICB2YXIgdGFnID0gbm9kZS50YWdOYW1lXG4gIC8vIGlmIGl0cyBhIHRlbXBsYXRlIHRhZyBhbmQgdGhlIGJyb3dzZXIgc3VwcG9ydHMgaXQsXG4gIC8vIGl0cyBjb250ZW50IGlzIGFscmVhZHkgYSBkb2N1bWVudCBmcmFnbWVudC5cbiAgaWYgKFxuICAgIHRhZyA9PT0gJ1RFTVBMQVRFJyAmJlxuICAgIG5vZGUuY29udGVudCBpbnN0YW5jZW9mIERvY3VtZW50RnJhZ21lbnRcbiAgKSB7XG4gICAgcmV0dXJuIG5vZGUuY29udGVudFxuICB9XG4gIHJldHVybiB0YWcgPT09ICdTQ1JJUFQnXG4gICAgPyBzdHJpbmdUb0ZyYWdtZW50KG5vZGUudGV4dENvbnRlbnQpXG4gICAgOiBzdHJpbmdUb0ZyYWdtZW50KG5vZGUuaW5uZXJIVE1MKVxufVxuXG4vLyBUZXN0IGZvciB0aGUgcHJlc2VuY2Ugb2YgdGhlIFNhZmFyaSB0ZW1wbGF0ZSBjbG9uaW5nIGJ1Z1xuLy8gaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTEzNzc1NVxudmFyIGhhc0Jyb2tlblRlbXBsYXRlID0gXy5pbkJyb3dzZXJcbiAgPyAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgYS5pbm5lckhUTUwgPSAnPHRlbXBsYXRlPjE8L3RlbXBsYXRlPidcbiAgICAgIHJldHVybiAhYS5jbG9uZU5vZGUodHJ1ZSkuZmlyc3RDaGlsZC5pbm5lckhUTUxcbiAgICB9KSgpXG4gIDogZmFsc2VcblxuLy8gVGVzdCBmb3IgSUUxMC8xMSB0ZXh0YXJlYSBwbGFjZWhvbGRlciBjbG9uZSBidWdcbnZhciBoYXNUZXh0YXJlYUNsb25lQnVnID0gXy5pbkJyb3dzZXJcbiAgPyAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpXG4gICAgICB0LnBsYWNlaG9sZGVyID0gJ3QnXG4gICAgICByZXR1cm4gdC5jbG9uZU5vZGUodHJ1ZSkudmFsdWUgPT09ICd0J1xuICAgIH0pKClcbiAgOiBmYWxzZVxuXG4vKipcbiAqIDEuIERlYWwgd2l0aCBTYWZhcmkgY2xvbmluZyBuZXN0ZWQgPHRlbXBsYXRlPiBidWcgYnlcbiAqICAgIG1hbnVhbGx5IGNsb25pbmcgYWxsIHRlbXBsYXRlIGluc3RhbmNlcy5cbiAqIDIuIERlYWwgd2l0aCBJRTEwLzExIHRleHRhcmVhIHBsYWNlaG9sZGVyIGJ1ZyBieSBzZXR0aW5nXG4gKiAgICB0aGUgY29ycmVjdCB2YWx1ZSBhZnRlciBjbG9uaW5nLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBub2RlXG4gKiBAcmV0dXJuIHtFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9XG4gKi9cblxuZXhwb3J0cy5jbG9uZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHZhciByZXMgPSBub2RlLmNsb25lTm9kZSh0cnVlKVxuICB2YXIgaSwgb3JpZ2luYWwsIGNsb25lZFxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKGhhc0Jyb2tlblRlbXBsYXRlKSB7XG4gICAgb3JpZ2luYWwgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ3RlbXBsYXRlJylcbiAgICBpZiAob3JpZ2luYWwubGVuZ3RoKSB7XG4gICAgICBjbG9uZWQgPSByZXMucXVlcnlTZWxlY3RvckFsbCgndGVtcGxhdGUnKVxuICAgICAgaSA9IGNsb25lZC5sZW5ndGhcbiAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgY2xvbmVkW2ldLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKFxuICAgICAgICAgIG9yaWdpbmFsW2ldLmNsb25lTm9kZSh0cnVlKSxcbiAgICAgICAgICBjbG9uZWRbaV1cbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKGhhc1RleHRhcmVhQ2xvbmVCdWcpIHtcbiAgICBpZiAobm9kZS50YWdOYW1lID09PSAnVEVYVEFSRUEnKSB7XG4gICAgICByZXMudmFsdWUgPSBub2RlLnZhbHVlXG4gICAgfSBlbHNlIHtcbiAgICAgIG9yaWdpbmFsID0gbm9kZS5xdWVyeVNlbGVjdG9yQWxsKCd0ZXh0YXJlYScpXG4gICAgICBpZiAob3JpZ2luYWwubGVuZ3RoKSB7XG4gICAgICAgIGNsb25lZCA9IHJlcy5xdWVyeVNlbGVjdG9yQWxsKCd0ZXh0YXJlYScpXG4gICAgICAgIGkgPSBjbG9uZWQubGVuZ3RoXG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICBjbG9uZWRbaV0udmFsdWUgPSBvcmlnaW5hbFtpXS52YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuLyoqXG4gKiBQcm9jZXNzIHRoZSB0ZW1wbGF0ZSBvcHRpb24gYW5kIG5vcm1hbGl6ZXMgaXQgaW50byBhXG4gKiBhIERvY3VtZW50RnJhZ21lbnQgdGhhdCBjYW4gYmUgdXNlZCBhcyBhIHBhcnRpYWwgb3IgYVxuICogaW5zdGFuY2UgdGVtcGxhdGUuXG4gKlxuICogQHBhcmFtIHsqfSB0ZW1wbGF0ZVxuICogICAgUG9zc2libGUgdmFsdWVzIGluY2x1ZGU6XG4gKiAgICAtIERvY3VtZW50RnJhZ21lbnQgb2JqZWN0XG4gKiAgICAtIE5vZGUgb2JqZWN0IG9mIHR5cGUgVGVtcGxhdGVcbiAqICAgIC0gaWQgc2VsZWN0b3I6ICcjc29tZS10ZW1wbGF0ZS1pZCdcbiAqICAgIC0gdGVtcGxhdGUgc3RyaW5nOiAnPGRpdj48c3Bhbj57e21zZ319PC9zcGFuPjwvZGl2PidcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gY2xvbmVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbm9TZWxlY3RvclxuICogQHJldHVybiB7RG9jdW1lbnRGcmFnbWVudHx1bmRlZmluZWR9XG4gKi9cblxuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uICh0ZW1wbGF0ZSwgY2xvbmUsIG5vU2VsZWN0b3IpIHtcbiAgdmFyIG5vZGUsIGZyYWdcblxuICAvLyBpZiB0aGUgdGVtcGxhdGUgaXMgYWxyZWFkeSBhIGRvY3VtZW50IGZyYWdtZW50LFxuICAvLyBkbyBub3RoaW5nXG4gIGlmICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIERvY3VtZW50RnJhZ21lbnQpIHtcbiAgICByZXR1cm4gY2xvbmVcbiAgICAgID8gdGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpXG4gICAgICA6IHRlbXBsYXRlXG4gIH1cblxuICBpZiAodHlwZW9mIHRlbXBsYXRlID09PSAnc3RyaW5nJykge1xuICAgIC8vIGlkIHNlbGVjdG9yXG4gICAgaWYgKCFub1NlbGVjdG9yICYmIHRlbXBsYXRlLmNoYXJBdCgwKSA9PT0gJyMnKSB7XG4gICAgICAvLyBpZCBzZWxlY3RvciBjYW4gYmUgY2FjaGVkIHRvb1xuICAgICAgZnJhZyA9IGlkU2VsZWN0b3JDYWNoZS5nZXQodGVtcGxhdGUpXG4gICAgICBpZiAoIWZyYWcpIHtcbiAgICAgICAgbm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRlbXBsYXRlLnNsaWNlKDEpKVxuICAgICAgICBpZiAobm9kZSkge1xuICAgICAgICAgIGZyYWcgPSBub2RlVG9GcmFnbWVudChub2RlKVxuICAgICAgICAgIC8vIHNhdmUgc2VsZWN0b3IgdG8gY2FjaGVcbiAgICAgICAgICBpZFNlbGVjdG9yQ2FjaGUucHV0KHRlbXBsYXRlLCBmcmFnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vcm1hbCBzdHJpbmcgdGVtcGxhdGVcbiAgICAgIGZyYWcgPSBzdHJpbmdUb0ZyYWdtZW50KHRlbXBsYXRlKVxuICAgIH1cbiAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5ub2RlVHlwZSkge1xuICAgIC8vIGEgZGlyZWN0IG5vZGVcbiAgICBmcmFnID0gbm9kZVRvRnJhZ21lbnQodGVtcGxhdGUpXG4gIH1cblxuICByZXR1cm4gZnJhZyAmJiBjbG9uZVxuICAgID8gZXhwb3J0cy5jbG9uZShmcmFnKVxuICAgIDogZnJhZ1xufVxufSx7XCIuLi9jYWNoZVwiOjEwLFwiLi4vdXRpbFwiOjYwfV0sNTI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIENhY2hlID0gcmVxdWlyZSgnLi4vY2FjaGUnKVxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG52YXIgZGlyUGFyc2VyID0gcmVxdWlyZSgnLi9kaXJlY3RpdmUnKVxudmFyIHJlZ2V4RXNjYXBlUkUgPSAvWy0uKis/XiR7fSgpfFtcXF1cXC9cXFxcXS9nXG52YXIgY2FjaGUsIHRhZ1JFLCBodG1sUkUsIGZpcnN0Q2hhciwgbGFzdENoYXJcblxuLyoqXG4gKiBFc2NhcGUgYSBzdHJpbmcgc28gaXQgY2FuIGJlIHVzZWQgaW4gYSBSZWdFeHBcbiAqIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqL1xuXG5mdW5jdGlvbiBlc2NhcGVSZWdleCAoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZShyZWdleEVzY2FwZVJFLCAnXFxcXCQmJylcbn1cblxuLyoqXG4gKiBDb21waWxlIHRoZSBpbnRlcnBvbGF0aW9uIHRhZyByZWdleC5cbiAqXG4gKiBAcmV0dXJuIHtSZWdFeHB9XG4gKi9cblxuZnVuY3Rpb24gY29tcGlsZVJlZ2V4ICgpIHtcbiAgY29uZmlnLl9kZWxpbWl0ZXJzQ2hhbmdlZCA9IGZhbHNlXG4gIHZhciBvcGVuID0gY29uZmlnLmRlbGltaXRlcnNbMF1cbiAgdmFyIGNsb3NlID0gY29uZmlnLmRlbGltaXRlcnNbMV1cbiAgZmlyc3RDaGFyID0gb3Blbi5jaGFyQXQoMClcbiAgbGFzdENoYXIgPSBjbG9zZS5jaGFyQXQoY2xvc2UubGVuZ3RoIC0gMSlcbiAgdmFyIGZpcnN0Q2hhclJFID0gZXNjYXBlUmVnZXgoZmlyc3RDaGFyKVxuICB2YXIgbGFzdENoYXJSRSA9IGVzY2FwZVJlZ2V4KGxhc3RDaGFyKVxuICB2YXIgb3BlblJFID0gZXNjYXBlUmVnZXgob3BlbilcbiAgdmFyIGNsb3NlUkUgPSBlc2NhcGVSZWdleChjbG9zZSlcbiAgdGFnUkUgPSBuZXcgUmVnRXhwKFxuICAgIGZpcnN0Q2hhclJFICsgJz8nICsgb3BlblJFICtcbiAgICAnKC4rPyknICtcbiAgICBjbG9zZVJFICsgbGFzdENoYXJSRSArICc/JyxcbiAgICAnZydcbiAgKVxuICBodG1sUkUgPSBuZXcgUmVnRXhwKFxuICAgICdeJyArIGZpcnN0Q2hhclJFICsgb3BlblJFICtcbiAgICAnLionICtcbiAgICBjbG9zZVJFICsgbGFzdENoYXJSRSArICckJ1xuICApXG4gIC8vIHJlc2V0IGNhY2hlXG4gIGNhY2hlID0gbmV3IENhY2hlKDEwMDApXG59XG5cbi8qKlxuICogUGFyc2UgYSB0ZW1wbGF0ZSB0ZXh0IHN0cmluZyBpbnRvIGFuIGFycmF5IG9mIHRva2Vucy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdGV4dFxuICogQHJldHVybiB7QXJyYXk8T2JqZWN0PiB8IG51bGx9XG4gKiAgICAgICAgICAgICAgIC0ge1N0cmluZ30gdHlwZVxuICogICAgICAgICAgICAgICAtIHtTdHJpbmd9IHZhbHVlXG4gKiAgICAgICAgICAgICAgIC0ge0Jvb2xlYW59IFtodG1sXVxuICogICAgICAgICAgICAgICAtIHtCb29sZWFufSBbb25lVGltZV1cbiAqL1xuXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKHRleHQpIHtcbiAgaWYgKGNvbmZpZy5fZGVsaW1pdGVyc0NoYW5nZWQpIHtcbiAgICBjb21waWxlUmVnZXgoKVxuICB9XG4gIHZhciBoaXQgPSBjYWNoZS5nZXQodGV4dClcbiAgaWYgKGhpdCkge1xuICAgIHJldHVybiBoaXRcbiAgfVxuICBpZiAoIXRhZ1JFLnRlc3QodGV4dCkpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIHZhciB0b2tlbnMgPSBbXVxuICB2YXIgbGFzdEluZGV4ID0gdGFnUkUubGFzdEluZGV4ID0gMFxuICB2YXIgbWF0Y2gsIGluZGV4LCB2YWx1ZSwgZmlyc3QsIG9uZVRpbWUsIHBhcnRpYWxcbiAgLyoganNoaW50IGJvc3M6dHJ1ZSAqL1xuICB3aGlsZSAobWF0Y2ggPSB0YWdSRS5leGVjKHRleHQpKSB7XG4gICAgaW5kZXggPSBtYXRjaC5pbmRleFxuICAgIC8vIHB1c2ggdGV4dCB0b2tlblxuICAgIGlmIChpbmRleCA+IGxhc3RJbmRleCkge1xuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICB2YWx1ZTogdGV4dC5zbGljZShsYXN0SW5kZXgsIGluZGV4KVxuICAgICAgfSlcbiAgICB9XG4gICAgLy8gdGFnIHRva2VuXG4gICAgZmlyc3QgPSBtYXRjaFsxXS5jaGFyQ29kZUF0KDApXG4gICAgb25lVGltZSA9IGZpcnN0ID09PSAweDJBIC8vICpcbiAgICBwYXJ0aWFsID0gZmlyc3QgPT09IDB4M0UgLy8gPlxuICAgIHZhbHVlID0gKG9uZVRpbWUgfHwgcGFydGlhbClcbiAgICAgID8gbWF0Y2hbMV0uc2xpY2UoMSlcbiAgICAgIDogbWF0Y2hbMV1cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICB0YWc6IHRydWUsXG4gICAgICB2YWx1ZTogdmFsdWUudHJpbSgpLFxuICAgICAgaHRtbDogaHRtbFJFLnRlc3QobWF0Y2hbMF0pLFxuICAgICAgb25lVGltZTogb25lVGltZSxcbiAgICAgIHBhcnRpYWw6IHBhcnRpYWxcbiAgICB9KVxuICAgIGxhc3RJbmRleCA9IGluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoXG4gIH1cbiAgaWYgKGxhc3RJbmRleCA8IHRleHQubGVuZ3RoKSB7XG4gICAgdG9rZW5zLnB1c2goe1xuICAgICAgdmFsdWU6IHRleHQuc2xpY2UobGFzdEluZGV4KVxuICAgIH0pXG4gIH1cbiAgY2FjaGUucHV0KHRleHQsIHRva2VucylcbiAgcmV0dXJuIHRva2Vuc1xufVxuXG4vKipcbiAqIEZvcm1hdCBhIGxpc3Qgb2YgdG9rZW5zIGludG8gYW4gZXhwcmVzc2lvbi5cbiAqIGUuZy4gdG9rZW5zIHBhcnNlZCBmcm9tICdhIHt7Yn19IGMnIGNhbiBiZSBzZXJpYWxpemVkXG4gKiBpbnRvIG9uZSBzaW5nbGUgZXhwcmVzc2lvbiBhcyAnXCJhIFwiICsgYiArIFwiIGNcIicuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdG9rZW5zXG4gKiBAcGFyYW0ge1Z1ZX0gW3ZtXVxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmV4cG9ydHMudG9rZW5zVG9FeHAgPSBmdW5jdGlvbiAodG9rZW5zLCB2bSkge1xuICByZXR1cm4gdG9rZW5zLmxlbmd0aCA+IDFcbiAgICA/IHRva2Vucy5tYXAoZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgICAgIHJldHVybiBmb3JtYXRUb2tlbih0b2tlbiwgdm0pXG4gICAgICB9KS5qb2luKCcrJylcbiAgICA6IGZvcm1hdFRva2VuKHRva2Vuc1swXSwgdm0sIHRydWUpXG59XG5cbi8qKlxuICogRm9ybWF0IGEgc2luZ2xlIHRva2VuLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0b2tlblxuICogQHBhcmFtIHtWdWV9IFt2bV1cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gc2luZ2xlXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0VG9rZW4gKHRva2VuLCB2bSwgc2luZ2xlKSB7XG4gIHJldHVybiB0b2tlbi50YWdcbiAgICA/IHZtICYmIHRva2VuLm9uZVRpbWVcbiAgICAgID8gJ1wiJyArIHZtLiRldmFsKHRva2VuLnZhbHVlKSArICdcIidcbiAgICAgIDogc2luZ2xlXG4gICAgICAgID8gdG9rZW4udmFsdWVcbiAgICAgICAgOiBpbmxpbmVGaWx0ZXJzKHRva2VuLnZhbHVlKVxuICAgIDogJ1wiJyArIHRva2VuLnZhbHVlICsgJ1wiJ1xufVxuXG4vKipcbiAqIEZvciBhbiBhdHRyaWJ1dGUgd2l0aCBtdWx0aXBsZSBpbnRlcnBvbGF0aW9uIHRhZ3MsXG4gKiBlLmcuIGF0dHI9XCJzb21lLXt7dGhpbmcgfCBmaWx0ZXJ9fVwiLCBpbiBvcmRlciB0byBjb21iaW5lXG4gKiB0aGUgd2hvbGUgdGhpbmcgaW50byBhIHNpbmdsZSB3YXRjaGFibGUgZXhwcmVzc2lvbiwgd2VcbiAqIGhhdmUgdG8gaW5saW5lIHRob3NlIGZpbHRlcnMuIFRoaXMgZnVuY3Rpb24gZG9lcyBleGFjdGx5XG4gKiB0aGF0LiBUaGlzIGlzIGEgYml0IGhhY2t5IGJ1dCBpdCBhdm9pZHMgaGVhdnkgY2hhbmdlc1xuICogdG8gZGlyZWN0aXZlIHBhcnNlciBhbmQgd2F0Y2hlciBtZWNoYW5pc20uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV4cFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbnZhciBmaWx0ZXJSRSA9IC9bXnxdXFx8W158XS9cbmZ1bmN0aW9uIGlubGluZUZpbHRlcnMgKGV4cCkge1xuICBpZiAoIWZpbHRlclJFLnRlc3QoZXhwKSkge1xuICAgIHJldHVybiAnKCcgKyBleHAgKyAnKSdcbiAgfSBlbHNlIHtcbiAgICB2YXIgZGlyID0gZGlyUGFyc2VyLnBhcnNlKGV4cClbMF1cbiAgICBpZiAoIWRpci5maWx0ZXJzKSB7XG4gICAgICByZXR1cm4gJygnICsgZXhwICsgJyknXG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cCA9IGRpci5leHByZXNzaW9uXG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGRpci5maWx0ZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgZmlsdGVyID0gZGlyLmZpbHRlcnNbaV1cbiAgICAgICAgdmFyIGFyZ3MgPSBmaWx0ZXIuYXJnc1xuICAgICAgICAgID8gJyxcIicgKyBmaWx0ZXIuYXJncy5qb2luKCdcIixcIicpICsgJ1wiJ1xuICAgICAgICAgIDogJydcbiAgICAgICAgZXhwID0gJ3RoaXMuJG9wdGlvbnMuZmlsdGVyc1tcIicgKyBmaWx0ZXIubmFtZSArICdcIl0nICtcbiAgICAgICAgICAnLmFwcGx5KHRoaXMsWycgKyBleHAgKyBhcmdzICsgJ10pJ1xuICAgICAgfVxuICAgICAgcmV0dXJuIGV4cFxuICAgIH1cbiAgfVxufVxufSx7XCIuLi9jYWNoZVwiOjEwLFwiLi4vY29uZmlnXCI6MTMsXCIuL2RpcmVjdGl2ZVwiOjQ4fV0sNTM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuLi91dGlsJylcbnZhciBhZGRDbGFzcyA9IF8uYWRkQ2xhc3NcbnZhciByZW1vdmVDbGFzcyA9IF8ucmVtb3ZlQ2xhc3NcbnZhciB0cmFuc0R1cmF0aW9uUHJvcCA9IF8udHJhbnNpdGlvblByb3AgKyAnRHVyYXRpb24nXG52YXIgYW5pbUR1cmF0aW9uUHJvcCA9IF8uYW5pbWF0aW9uUHJvcCArICdEdXJhdGlvbidcblxudmFyIHF1ZXVlID0gW11cbnZhciBxdWV1ZWQgPSBmYWxzZVxuXG4vKipcbiAqIFB1c2ggYSBqb2IgaW50byB0aGUgdHJhbnNpdGlvbiBxdWV1ZSwgd2hpY2ggaXMgdG8gYmVcbiAqIGV4ZWN1dGVkIG9uIG5leHQgZnJhbWUuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbCAgICAtIHRhcmdldCBlbGVtZW50XG4gKiBAcGFyYW0ge051bWJlcn0gZGlyICAgIC0gMTogZW50ZXIsIC0xOiBsZWF2ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3AgICAtIHRoZSBhY3R1YWwgZG9tIG9wZXJhdGlvblxuICogQHBhcmFtIHtTdHJpbmd9IGNscyAgICAtIHRoZSBjbGFzc05hbWUgdG8gcmVtb3ZlIHdoZW4gdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbiBpcyBkb25lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXSAtIHVzZXIgc3VwcGxpZWQgY2FsbGJhY2suXG4gKi9cblxuZnVuY3Rpb24gcHVzaCAoZWwsIGRpciwgb3AsIGNscywgY2IpIHtcbiAgcXVldWUucHVzaCh7XG4gICAgZWwgIDogZWwsXG4gICAgZGlyIDogZGlyLFxuICAgIGNiICA6IGNiLFxuICAgIGNscyA6IGNscyxcbiAgICBvcCAgOiBvcFxuICB9KVxuICBpZiAoIXF1ZXVlZCkge1xuICAgIHF1ZXVlZCA9IHRydWVcbiAgICBfLm5leHRUaWNrKGZsdXNoKVxuICB9XG59XG5cbi8qKlxuICogRmx1c2ggdGhlIHF1ZXVlLCBhbmQgZG8gb25lIGZvcmNlZCByZWZsb3cgYmVmb3JlXG4gKiB0cmlnZ2VyaW5nIHRyYW5zaXRpb25zLlxuICovXG5cbmZ1bmN0aW9uIGZsdXNoICgpIHtcbiAgLyoganNoaW50IHVudXNlZDogZmFsc2UgKi9cbiAgdmFyIGYgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQub2Zmc2V0SGVpZ2h0XG4gIHF1ZXVlLmZvckVhY2gocnVuKVxuICBxdWV1ZSA9IFtdXG4gIHF1ZXVlZCA9IGZhbHNlXG59XG5cbi8qKlxuICogUnVuIGEgdHJhbnNpdGlvbiBqb2IuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGpvYlxuICovXG5cbmZ1bmN0aW9uIHJ1biAoam9iKSB7XG5cbiAgdmFyIGVsID0gam9iLmVsXG4gIHZhciBkYXRhID0gZWwuX192X3RyYW5zXG4gIHZhciBjbHMgPSBqb2IuY2xzXG4gIHZhciBjYiA9IGpvYi5jYlxuICB2YXIgb3AgPSBqb2Iub3BcbiAgdmFyIHRyYW5zaXRpb25UeXBlID0gZ2V0VHJhbnNpdGlvblR5cGUoZWwsIGRhdGEsIGNscylcblxuICBpZiAoam9iLmRpciA+IDApIHsgLy8gRU5URVJcbiAgICBpZiAodHJhbnNpdGlvblR5cGUgPT09IDEpIHtcbiAgICAgIC8vIHRyaWdnZXIgdHJhbnNpdGlvbiBieSByZW1vdmluZyBlbnRlciBjbGFzc1xuICAgICAgcmVtb3ZlQ2xhc3MoZWwsIGNscylcbiAgICAgIC8vIG9ubHkgbmVlZCB0byBsaXN0ZW4gZm9yIHRyYW5zaXRpb25lbmQgaWYgdGhlcmUnc1xuICAgICAgLy8gYSB1c2VyIGNhbGxiYWNrXG4gICAgICBpZiAoY2IpIHNldHVwVHJhbnNpdGlvbkNiKF8udHJhbnNpdGlvbkVuZEV2ZW50KVxuICAgIH0gZWxzZSBpZiAodHJhbnNpdGlvblR5cGUgPT09IDIpIHtcbiAgICAgIC8vIGFuaW1hdGlvbnMgYXJlIHRyaWdnZXJlZCB3aGVuIGNsYXNzIGlzIGFkZGVkXG4gICAgICAvLyBzbyB3ZSBqdXN0IGxpc3RlbiBmb3IgYW5pbWF0aW9uZW5kIHRvIHJlbW92ZSBpdC5cbiAgICAgIHNldHVwVHJhbnNpdGlvbkNiKF8uYW5pbWF0aW9uRW5kRXZlbnQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVtb3ZlQ2xhc3MoZWwsIGNscylcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vIHRyYW5zaXRpb24gYXBwbGljYWJsZVxuICAgICAgcmVtb3ZlQ2xhc3MoZWwsIGNscylcbiAgICAgIGlmIChjYikgY2IoKVxuICAgIH1cbiAgfSBlbHNlIHsgLy8gTEVBVkVcbiAgICBpZiAodHJhbnNpdGlvblR5cGUpIHtcbiAgICAgIC8vIGxlYXZlIHRyYW5zaXRpb25zL2FuaW1hdGlvbnMgYXJlIGJvdGggdHJpZ2dlcmVkXG4gICAgICAvLyBieSBhZGRpbmcgdGhlIGNsYXNzLCBqdXN0IHJlbW92ZSBpdCBvbiBlbmQgZXZlbnQuXG4gICAgICB2YXIgZXZlbnQgPSB0cmFuc2l0aW9uVHlwZSA9PT0gMVxuICAgICAgICA/IF8udHJhbnNpdGlvbkVuZEV2ZW50XG4gICAgICAgIDogXy5hbmltYXRpb25FbmRFdmVudFxuICAgICAgc2V0dXBUcmFuc2l0aW9uQ2IoZXZlbnQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb3AoKVxuICAgICAgICByZW1vdmVDbGFzcyhlbCwgY2xzKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgb3AoKVxuICAgICAgcmVtb3ZlQ2xhc3MoZWwsIGNscylcbiAgICAgIGlmIChjYikgY2IoKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgYSB0cmFuc2l0aW9uIGVuZCBjYWxsYmFjaywgc3RvcmUgdGhlIGNhbGxiYWNrXG4gICAqIG9uIHRoZSBlbGVtZW50J3MgX192X3RyYW5zIGRhdGEgb2JqZWN0LCBzbyB3ZSBjYW5cbiAgICogY2xlYW4gaXQgdXAgaWYgYW5vdGhlciB0cmFuc2l0aW9uIGlzIHRyaWdnZXJlZCBiZWZvcmVcbiAgICogdGhlIGNhbGxiYWNrIGlzIGZpcmVkLlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NsZWFudXBGbl1cbiAgICovXG5cbiAgZnVuY3Rpb24gc2V0dXBUcmFuc2l0aW9uQ2IgKGV2ZW50LCBjbGVhbnVwRm4pIHtcbiAgICBkYXRhLmV2ZW50ID0gZXZlbnRcbiAgICB2YXIgb25FbmQgPSBkYXRhLmNhbGxiYWNrID0gZnVuY3Rpb24gdHJhbnNpdGlvbkNiIChlKSB7XG4gICAgICBpZiAoZS50YXJnZXQgPT09IGVsKSB7XG4gICAgICAgIF8ub2ZmKGVsLCBldmVudCwgb25FbmQpXG4gICAgICAgIGRhdGEuZXZlbnQgPSBkYXRhLmNhbGxiYWNrID0gbnVsbFxuICAgICAgICBpZiAoY2xlYW51cEZuKSBjbGVhbnVwRm4oKVxuICAgICAgICBpZiAoY2IpIGNiKClcbiAgICAgIH1cbiAgICB9XG4gICAgXy5vbihlbCwgZXZlbnQsIG9uRW5kKVxuICB9XG59XG5cbi8qKlxuICogR2V0IGFuIGVsZW1lbnQncyB0cmFuc2l0aW9uIHR5cGUgYmFzZWQgb24gdGhlXG4gKiBjYWxjdWxhdGVkIHN0eWxlc1xuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhXG4gKiBAcGFyYW0ge1N0cmluZ30gY2xhc3NOYW1lXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiAgICAgICAgIDEgLSB0cmFuc2l0aW9uXG4gKiAgICAgICAgIDIgLSBhbmltYXRpb25cbiAqL1xuXG5mdW5jdGlvbiBnZXRUcmFuc2l0aW9uVHlwZSAoZWwsIGRhdGEsIGNsYXNzTmFtZSkge1xuICB2YXIgdHlwZSA9IGRhdGEuY2FjaGUgJiYgZGF0YS5jYWNoZVtjbGFzc05hbWVdXG4gIGlmICh0eXBlKSByZXR1cm4gdHlwZVxuICB2YXIgaW5saW5lU3R5bGVzID0gZWwuc3R5bGVcbiAgdmFyIGNvbXB1dGVkU3R5bGVzID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwpXG4gIHZhciB0cmFuc0R1cmF0aW9uID1cbiAgICBpbmxpbmVTdHlsZXNbdHJhbnNEdXJhdGlvblByb3BdIHx8XG4gICAgY29tcHV0ZWRTdHlsZXNbdHJhbnNEdXJhdGlvblByb3BdXG4gIGlmICh0cmFuc0R1cmF0aW9uICYmIHRyYW5zRHVyYXRpb24gIT09ICcwcycpIHtcbiAgICB0eXBlID0gMVxuICB9IGVsc2Uge1xuICAgIHZhciBhbmltRHVyYXRpb24gPVxuICAgICAgaW5saW5lU3R5bGVzW2FuaW1EdXJhdGlvblByb3BdIHx8XG4gICAgICBjb21wdXRlZFN0eWxlc1thbmltRHVyYXRpb25Qcm9wXVxuICAgIGlmIChhbmltRHVyYXRpb24gJiYgYW5pbUR1cmF0aW9uICE9PSAnMHMnKSB7XG4gICAgICB0eXBlID0gMlxuICAgIH1cbiAgfVxuICBpZiAodHlwZSkge1xuICAgIGlmICghZGF0YS5jYWNoZSkgZGF0YS5jYWNoZSA9IHt9XG4gICAgZGF0YS5jYWNoZVtjbGFzc05hbWVdID0gdHlwZVxuICB9XG4gIHJldHVybiB0eXBlXG59XG5cbi8qKlxuICogQXBwbHkgQ1NTIHRyYW5zaXRpb24gdG8gYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge051bWJlcn0gZGlyZWN0aW9uIC0gMTogZW50ZXIsIC0xOiBsZWF2ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3AgLSB0aGUgYWN0dWFsIERPTSBvcGVyYXRpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gdGFyZ2V0IGVsZW1lbnQncyB0cmFuc2l0aW9uIGRhdGFcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChlbCwgZGlyZWN0aW9uLCBvcCwgZGF0YSwgY2IpIHtcbiAgdmFyIHByZWZpeCA9IGRhdGEuaWQgfHwgJ3YnXG4gIHZhciBlbnRlckNsYXNzID0gcHJlZml4ICsgJy1lbnRlcidcbiAgdmFyIGxlYXZlQ2xhc3MgPSBwcmVmaXggKyAnLWxlYXZlJ1xuICAvLyBjbGVhbiB1cCBwb3RlbnRpYWwgcHJldmlvdXMgdW5maW5pc2hlZCB0cmFuc2l0aW9uXG4gIGlmIChkYXRhLmNhbGxiYWNrKSB7XG4gICAgXy5vZmYoZWwsIGRhdGEuZXZlbnQsIGRhdGEuY2FsbGJhY2spXG4gICAgcmVtb3ZlQ2xhc3MoZWwsIGVudGVyQ2xhc3MpXG4gICAgcmVtb3ZlQ2xhc3MoZWwsIGxlYXZlQ2xhc3MpXG4gICAgZGF0YS5ldmVudCA9IGRhdGEuY2FsbGJhY2sgPSBudWxsXG4gIH1cbiAgaWYgKGRpcmVjdGlvbiA+IDApIHsgLy8gZW50ZXJcbiAgICBhZGRDbGFzcyhlbCwgZW50ZXJDbGFzcylcbiAgICBvcCgpXG4gICAgcHVzaChlbCwgZGlyZWN0aW9uLCBudWxsLCBlbnRlckNsYXNzLCBjYilcbiAgfSBlbHNlIHsgLy8gbGVhdmVcbiAgICBhZGRDbGFzcyhlbCwgbGVhdmVDbGFzcylcbiAgICBwdXNoKGVsLCBkaXJlY3Rpb24sIG9wLCBsZWF2ZUNsYXNzLCBjYilcbiAgfVxufVxufSx7XCIuLi91dGlsXCI6NjB9XSw1NDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwnKVxudmFyIGFwcGx5Q1NTVHJhbnNpdGlvbiA9IHJlcXVpcmUoJy4vY3NzJylcbnZhciBhcHBseUpTVHJhbnNpdGlvbiA9IHJlcXVpcmUoJy4vanMnKVxuXG4vKipcbiAqIEFwcGVuZCB3aXRoIHRyYW5zaXRpb24uXG4gKlxuICogQG9hcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtFbGVtZW50fSB0YXJnZXRcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICovXG5cbmV4cG9ydHMuYXBwZW5kID0gZnVuY3Rpb24gKGVsLCB0YXJnZXQsIHZtLCBjYikge1xuICBhcHBseShlbCwgMSwgZnVuY3Rpb24gKCkge1xuICAgIHRhcmdldC5hcHBlbmRDaGlsZChlbClcbiAgfSwgdm0sIGNiKVxufVxuXG4vKipcbiAqIEluc2VydEJlZm9yZSB3aXRoIHRyYW5zaXRpb24uXG4gKlxuICogQG9hcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtFbGVtZW50fSB0YXJnZXRcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICovXG5cbmV4cG9ydHMuYmVmb3JlID0gZnVuY3Rpb24gKGVsLCB0YXJnZXQsIHZtLCBjYikge1xuICBhcHBseShlbCwgMSwgZnVuY3Rpb24gKCkge1xuICAgIF8uYmVmb3JlKGVsLCB0YXJnZXQpXG4gIH0sIHZtLCBjYilcbn1cblxuLyoqXG4gKiBSZW1vdmUgd2l0aCB0cmFuc2l0aW9uLlxuICpcbiAqIEBvYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICovXG5cbmV4cG9ydHMucmVtb3ZlID0gZnVuY3Rpb24gKGVsLCB2bSwgY2IpIHtcbiAgYXBwbHkoZWwsIC0xLCBmdW5jdGlvbiAoKSB7XG4gICAgXy5yZW1vdmUoZWwpXG4gIH0sIHZtLCBjYilcbn1cblxuLyoqXG4gKiBSZW1vdmUgYnkgYXBwZW5kaW5nIHRvIGFub3RoZXIgcGFyZW50IHdpdGggdHJhbnNpdGlvbi5cbiAqIFRoaXMgaXMgb25seSB1c2VkIGluIGJsb2NrIG9wZXJhdGlvbnMuXG4gKlxuICogQG9hcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtFbGVtZW50fSB0YXJnZXRcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICovXG5cbmV4cG9ydHMucmVtb3ZlVGhlbkFwcGVuZCA9IGZ1bmN0aW9uIChlbCwgdGFyZ2V0LCB2bSwgY2IpIHtcbiAgYXBwbHkoZWwsIC0xLCBmdW5jdGlvbiAoKSB7XG4gICAgdGFyZ2V0LmFwcGVuZENoaWxkKGVsKVxuICB9LCB2bSwgY2IpXG59XG5cbi8qKlxuICogQXBwZW5kIHRoZSBjaGlsZE5vZGVzIG9mIGEgZnJhZ21lbnQgdG8gdGFyZ2V0LlxuICpcbiAqIEBwYXJhbSB7RG9jdW1lbnRGcmFnbWVudH0gYmxvY2tcbiAqIEBwYXJhbSB7Tm9kZX0gdGFyZ2V0XG4gKiBAcGFyYW0ge1Z1ZX0gdm1cbiAqL1xuXG5leHBvcnRzLmJsb2NrQXBwZW5kID0gZnVuY3Rpb24gKGJsb2NrLCB0YXJnZXQsIHZtKSB7XG4gIHZhciBub2RlcyA9IF8udG9BcnJheShibG9jay5jaGlsZE5vZGVzKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGV4cG9ydHMuYmVmb3JlKG5vZGVzW2ldLCB0YXJnZXQsIHZtKVxuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlIGEgYmxvY2sgb2Ygbm9kZXMgYmV0d2VlbiB0d28gZWRnZSBub2Rlcy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IHN0YXJ0XG4gKiBAcGFyYW0ge05vZGV9IGVuZFxuICogQHBhcmFtIHtWdWV9IHZtXG4gKi9cblxuZXhwb3J0cy5ibG9ja1JlbW92ZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kLCB2bSkge1xuICB2YXIgbm9kZSA9IHN0YXJ0Lm5leHRTaWJsaW5nXG4gIHZhciBuZXh0XG4gIHdoaWxlIChub2RlICE9PSBlbmQpIHtcbiAgICBuZXh0ID0gbm9kZS5uZXh0U2libGluZ1xuICAgIGV4cG9ydHMucmVtb3ZlKG5vZGUsIHZtKVxuICAgIG5vZGUgPSBuZXh0XG4gIH1cbn1cblxuLyoqXG4gKiBBcHBseSB0cmFuc2l0aW9ucyB3aXRoIGFuIG9wZXJhdGlvbiBjYWxsYmFjay5cbiAqXG4gKiBAb2FyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge051bWJlcn0gZGlyZWN0aW9uXG4gKiAgICAgICAgICAgICAgICAgIDE6IGVudGVyXG4gKiAgICAgICAgICAgICAgICAgLTE6IGxlYXZlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcCAtIHRoZSBhY3R1YWwgRE9NIG9wZXJhdGlvblxuICogQHBhcmFtIHtWdWV9IHZtXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gKi9cblxudmFyIGFwcGx5ID0gZXhwb3J0cy5hcHBseSA9IGZ1bmN0aW9uIChlbCwgZGlyZWN0aW9uLCBvcCwgdm0sIGNiKSB7XG4gIHZhciB0cmFuc0RhdGEgPSBlbC5fX3ZfdHJhbnNcbiAgaWYgKFxuICAgICF0cmFuc0RhdGEgfHxcbiAgICAhdm0uX2lzQ29tcGlsZWQgfHxcbiAgICAvLyBpZiB0aGUgdm0gaXMgYmVpbmcgbWFuaXB1bGF0ZWQgYnkgYSBwYXJlbnQgZGlyZWN0aXZlXG4gICAgLy8gZHVyaW5nIHRoZSBwYXJlbnQncyBjb21waWxhdGlvbiBwaGFzZSwgc2tpcCB0aGVcbiAgICAvLyBhbmltYXRpb24uXG4gICAgKHZtLiRwYXJlbnQgJiYgIXZtLiRwYXJlbnQuX2lzQ29tcGlsZWQpXG4gICkge1xuICAgIG9wKClcbiAgICBpZiAoY2IpIGNiKClcbiAgICByZXR1cm5cbiAgfVxuICAvLyBkZXRlcm1pbmUgdGhlIHRyYW5zaXRpb24gdHlwZSBvbiB0aGUgZWxlbWVudFxuICB2YXIganNUcmFuc2l0aW9uID0gdm0uJG9wdGlvbnMudHJhbnNpdGlvbnNbdHJhbnNEYXRhLmlkXVxuICBpZiAoanNUcmFuc2l0aW9uKSB7XG4gICAgLy8ganNcbiAgICBhcHBseUpTVHJhbnNpdGlvbihcbiAgICAgIGVsLFxuICAgICAgZGlyZWN0aW9uLFxuICAgICAgb3AsXG4gICAgICB0cmFuc0RhdGEsXG4gICAgICBqc1RyYW5zaXRpb24sXG4gICAgICB2bSxcbiAgICAgIGNiXG4gICAgKVxuICB9IGVsc2UgaWYgKF8udHJhbnNpdGlvbkVuZEV2ZW50KSB7XG4gICAgLy8gY3NzXG4gICAgYXBwbHlDU1NUcmFuc2l0aW9uKFxuICAgICAgZWwsXG4gICAgICBkaXJlY3Rpb24sXG4gICAgICBvcCxcbiAgICAgIHRyYW5zRGF0YSxcbiAgICAgIGNiXG4gICAgKVxuICB9IGVsc2Uge1xuICAgIC8vIG5vdCBhcHBsaWNhYmxlXG4gICAgb3AoKVxuICAgIGlmIChjYikgY2IoKVxuICB9XG59XG59LHtcIi4uL3V0aWxcIjo2MCxcIi4vY3NzXCI6NTMsXCIuL2pzXCI6NTV9XSw1NTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vKipcbiAqIEFwcGx5IEphdmFTY3JpcHQgZW50ZXIvbGVhdmUgZnVuY3Rpb25zLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBkaXJlY3Rpb24gLSAxOiBlbnRlciwgLTE6IGxlYXZlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcCAtIHRoZSBhY3R1YWwgRE9NIG9wZXJhdGlvblxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSB0YXJnZXQgZWxlbWVudCdzIHRyYW5zaXRpb24gZGF0YVxuICogQHBhcmFtIHtPYmplY3R9IGRlZiAtIHRyYW5zaXRpb24gZGVmaW5pdGlvbiBvYmplY3RcbiAqIEBwYXJhbSB7VnVlfSB2bSAtIHRoZSBvd25lciB2bSBvZiB0aGUgZWxlbWVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGVsLCBkaXJlY3Rpb24sIG9wLCBkYXRhLCBkZWYsIHZtLCBjYikge1xuICBpZiAoZGF0YS5jYW5jZWwpIHtcbiAgICBkYXRhLmNhbmNlbCgpXG4gICAgZGF0YS5jYW5jZWwgPSBudWxsXG4gIH1cbiAgaWYgKGRpcmVjdGlvbiA+IDApIHsgLy8gZW50ZXJcbiAgICBpZiAoZGVmLmJlZm9yZUVudGVyKSB7XG4gICAgICBkZWYuYmVmb3JlRW50ZXIuY2FsbCh2bSwgZWwpXG4gICAgfVxuICAgIG9wKClcbiAgICBpZiAoZGVmLmVudGVyKSB7XG4gICAgICBkYXRhLmNhbmNlbCA9IGRlZi5lbnRlci5jYWxsKHZtLCBlbCwgZnVuY3Rpb24gKCkge1xuICAgICAgICBkYXRhLmNhbmNlbCA9IG51bGxcbiAgICAgICAgaWYgKGNiKSBjYigpXG4gICAgICB9KVxuICAgIH0gZWxzZSBpZiAoY2IpIHtcbiAgICAgIGNiKClcbiAgICB9XG4gIH0gZWxzZSB7IC8vIGxlYXZlXG4gICAgaWYgKGRlZi5sZWF2ZSkge1xuICAgICAgZGF0YS5jYW5jZWwgPSBkZWYubGVhdmUuY2FsbCh2bSwgZWwsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZGF0YS5jYW5jZWwgPSBudWxsXG4gICAgICAgIG9wKClcbiAgICAgICAgaWYgKGNiKSBjYigpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBvcCgpXG4gICAgICBpZiAoY2IpIGNiKClcbiAgICB9XG4gIH1cbn1cbn0se31dLDU2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxuXG4vKipcbiAqIEVuYWJsZSBkZWJ1ZyB1dGlsaXRpZXMuIFRoZSBlbmFibGVEZWJ1ZygpIGZ1bmN0aW9uIGFuZFxuICogYWxsIF8ubG9nKCkgJiBfLndhcm4oKSBjYWxscyB3aWxsIGJlIGRyb3BwZWQgaW4gdGhlXG4gKiBtaW5pZmllZCBwcm9kdWN0aW9uIGJ1aWxkLlxuICovXG5cbmVuYWJsZURlYnVnKClcblxuZnVuY3Rpb24gZW5hYmxlRGVidWcgKCkge1xuICB2YXIgaGFzQ29uc29sZSA9IHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJ1xuICBcbiAgLyoqXG4gICAqIExvZyBhIG1lc3NhZ2UuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtc2dcbiAgICovXG5cbiAgZXhwb3J0cy5sb2cgPSBmdW5jdGlvbiAobXNnKSB7XG4gICAgaWYgKGhhc0NvbnNvbGUgJiYgY29uZmlnLmRlYnVnKSB7XG4gICAgICBjb25zb2xlLmxvZygnW1Z1ZSBpbmZvXTogJyArIG1zZylcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogV2UndmUgZ290IGEgcHJvYmxlbSBoZXJlLlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbXNnXG4gICAqL1xuXG4gIGV4cG9ydHMud2FybiA9IGZ1bmN0aW9uIChtc2cpIHtcbiAgICBpZiAoaGFzQ29uc29sZSAmJiAhY29uZmlnLnNpbGVudCkge1xuICAgICAgY29uc29sZS53YXJuKCdbVnVlIHdhcm5dOiAnICsgbXNnKVxuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoY29uZmlnLmRlYnVnKSB7XG4gICAgICAgIC8qIGpzaGludCBkZWJ1ZzogdHJ1ZSAqL1xuICAgICAgICBkZWJ1Z2dlclxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgJ1NldCBgVnVlLmNvbmZpZy5kZWJ1ZyA9IHRydWVgIHRvIGVuYWJsZSBkZWJ1ZyBtb2RlLidcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NlcnQgYXNzZXQgZXhpc3RzXG4gICAqL1xuXG4gIGV4cG9ydHMuYXNzZXJ0QXNzZXQgPSBmdW5jdGlvbiAodmFsLCB0eXBlLCBpZCkge1xuICAgIGlmICghdmFsKSB7XG4gICAgICBleHBvcnRzLndhcm4oJ0ZhaWxlZCB0byByZXNvbHZlICcgKyB0eXBlICsgJzogJyArIGlkKVxuICAgIH1cbiAgfVxufVxufSx7XCIuLi9jb25maWdcIjoxM31dLDU3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxuXG4vKipcbiAqIENoZWNrIGlmIGEgbm9kZSBpcyBpbiB0aGUgZG9jdW1lbnQuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbnZhciBkb2MgPVxuICB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmXG4gIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuXG5leHBvcnRzLmluRG9jID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgcmV0dXJuIGRvYyAmJiBkb2MuY29udGFpbnMobm9kZSlcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGFuIGF0dHJpYnV0ZSBmcm9tIGEgbm9kZS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBhdHRyXG4gKi9cblxuZXhwb3J0cy5hdHRyID0gZnVuY3Rpb24gKG5vZGUsIGF0dHIpIHtcbiAgYXR0ciA9IGNvbmZpZy5wcmVmaXggKyBhdHRyXG4gIHZhciB2YWwgPSBub2RlLmdldEF0dHJpYnV0ZShhdHRyKVxuICBpZiAodmFsICE9PSBudWxsKSB7XG4gICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cilcbiAgfVxuICByZXR1cm4gdmFsXG59XG5cbi8qKlxuICogSW5zZXJ0IGVsIGJlZm9yZSB0YXJnZXRcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldCBcbiAqL1xuXG5leHBvcnRzLmJlZm9yZSA9IGZ1bmN0aW9uIChlbCwgdGFyZ2V0KSB7XG4gIHRhcmdldC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShlbCwgdGFyZ2V0KVxufVxuXG4vKipcbiAqIEluc2VydCBlbCBhZnRlciB0YXJnZXRcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldCBcbiAqL1xuXG5leHBvcnRzLmFmdGVyID0gZnVuY3Rpb24gKGVsLCB0YXJnZXQpIHtcbiAgaWYgKHRhcmdldC5uZXh0U2libGluZykge1xuICAgIGV4cG9ydHMuYmVmb3JlKGVsLCB0YXJnZXQubmV4dFNpYmxpbmcpXG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0LnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoZWwpXG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmUgZWwgZnJvbSBET01cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKi9cblxuZXhwb3J0cy5yZW1vdmUgPSBmdW5jdGlvbiAoZWwpIHtcbiAgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbClcbn1cblxuLyoqXG4gKiBQcmVwZW5kIGVsIHRvIHRhcmdldFxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7RWxlbWVudH0gdGFyZ2V0IFxuICovXG5cbmV4cG9ydHMucHJlcGVuZCA9IGZ1bmN0aW9uIChlbCwgdGFyZ2V0KSB7XG4gIGlmICh0YXJnZXQuZmlyc3RDaGlsZCkge1xuICAgIGV4cG9ydHMuYmVmb3JlKGVsLCB0YXJnZXQuZmlyc3RDaGlsZClcbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoZWwpXG4gIH1cbn1cblxuLyoqXG4gKiBSZXBsYWNlIHRhcmdldCB3aXRoIGVsXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSB0YXJnZXRcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqL1xuXG5leHBvcnRzLnJlcGxhY2UgPSBmdW5jdGlvbiAodGFyZ2V0LCBlbCkge1xuICB2YXIgcGFyZW50ID0gdGFyZ2V0LnBhcmVudE5vZGVcbiAgaWYgKHBhcmVudCkge1xuICAgIHBhcmVudC5yZXBsYWNlQ2hpbGQoZWwsIHRhcmdldClcbiAgfVxufVxuXG4vKipcbiAqIENvcHkgYXR0cmlidXRlcyBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBmcm9tXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHRvXG4gKi9cblxuZXhwb3J0cy5jb3B5QXR0cmlidXRlcyA9IGZ1bmN0aW9uIChmcm9tLCB0bykge1xuICBpZiAoZnJvbS5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICB2YXIgYXR0cnMgPSBmcm9tLmF0dHJpYnV0ZXNcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGF0dHJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBhdHRyc1tpXVxuICAgICAgdG8uc2V0QXR0cmlidXRlKGF0dHIubmFtZSwgYXR0ci52YWx1ZSlcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBZGQgZXZlbnQgbGlzdGVuZXIgc2hvcnRoYW5kLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2JcbiAqL1xuXG5leHBvcnRzLm9uID0gZnVuY3Rpb24gKGVsLCBldmVudCwgY2IpIHtcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgY2IpXG59XG5cbi8qKlxuICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVyIHNob3J0aGFuZC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKi9cblxuZXhwb3J0cy5vZmYgPSBmdW5jdGlvbiAoZWwsIGV2ZW50LCBjYikge1xuICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBjYilcbn1cblxuLyoqXG4gKiBBZGQgY2xhc3Mgd2l0aCBjb21wYXRpYmlsaXR5IGZvciBJRSAmIFNWR1xuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7U3Ryb25nfSBjbHNcbiAqL1xuXG5leHBvcnRzLmFkZENsYXNzID0gZnVuY3Rpb24gKGVsLCBjbHMpIHtcbiAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgIGVsLmNsYXNzTGlzdC5hZGQoY2xzKVxuICB9IGVsc2Uge1xuICAgIHZhciBjdXIgPSAnICcgKyAoZWwuZ2V0QXR0cmlidXRlKCdjbGFzcycpIHx8ICcnKSArICcgJ1xuICAgIGlmIChjdXIuaW5kZXhPZignICcgKyBjbHMgKyAnICcpIDwgMCkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsIChjdXIgKyBjbHMpLnRyaW0oKSlcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmUgY2xhc3Mgd2l0aCBjb21wYXRpYmlsaXR5IGZvciBJRSAmIFNWR1xuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7U3Ryb25nfSBjbHNcbiAqL1xuXG5leHBvcnRzLnJlbW92ZUNsYXNzID0gZnVuY3Rpb24gKGVsLCBjbHMpIHtcbiAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoY2xzKVxuICB9IGVsc2Uge1xuICAgIHZhciBjdXIgPSAnICcgKyAoZWwuZ2V0QXR0cmlidXRlKCdjbGFzcycpIHx8ICcnKSArICcgJ1xuICAgIHZhciB0YXIgPSAnICcgKyBjbHMgKyAnICdcbiAgICB3aGlsZSAoY3VyLmluZGV4T2YodGFyKSA+PSAwKSB7XG4gICAgICBjdXIgPSBjdXIucmVwbGFjZSh0YXIsICcgJylcbiAgICB9XG4gICAgZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsIGN1ci50cmltKCkpXG4gIH1cbn1cblxuLyoqXG4gKiBFeHRyYWN0IHJhdyBjb250ZW50IGluc2lkZSBhbiBlbGVtZW50IGludG8gYSB0ZW1wb3JhcnlcbiAqIGNvbnRhaW5lciBkaXZcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtFbGVtZW50fVxuICovXG5cbmV4cG9ydHMuZXh0cmFjdENvbnRlbnQgPSBmdW5jdGlvbiAoZWwpIHtcbiAgdmFyIGNoaWxkXG4gIHZhciByYXdDb250ZW50XG4gIGlmIChlbC5oYXNDaGlsZE5vZGVzKCkpIHtcbiAgICByYXdDb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAvKiBqc2hpbnQgYm9zczp0cnVlICovXG4gICAgd2hpbGUgKGNoaWxkID0gZWwuZmlyc3RDaGlsZCkge1xuICAgICAgcmF3Q29udGVudC5hcHBlbmRDaGlsZChjaGlsZClcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJhd0NvbnRlbnRcbn1cbn0se1wiLi4vY29uZmlnXCI6MTN9XSw1ODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vKipcbiAqIENhbiB3ZSB1c2UgX19wcm90b19fP1xuICpcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG5cbmV4cG9ydHMuaGFzUHJvdG8gPSAnX19wcm90b19fJyBpbiB7fVxuXG4vKipcbiAqIEluZGljYXRlcyB3ZSBoYXZlIGEgd2luZG93XG4gKlxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xudmFyIGluQnJvd3NlciA9IGV4cG9ydHMuaW5Ccm93c2VyID1cbiAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgdG9TdHJpbmcuY2FsbCh3aW5kb3cpICE9PSAnW29iamVjdCBPYmplY3RdJ1xuXG4vKipcbiAqIERlZmVyIGEgdGFzayB0byB0aGUgc3RhcnQgb2YgdGhlIG5leHQgZXZlbnQgbG9vcFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKiBAcGFyYW0ge09iamVjdH0gY3R4XG4gKi9cblxudmFyIGRlZmVyID0gaW5Ccm93c2VyXG4gID8gKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgc2V0VGltZW91dClcbiAgOiBzZXRUaW1lb3V0XG5cbmV4cG9ydHMubmV4dFRpY2sgPSBmdW5jdGlvbiAoY2IsIGN0eCkge1xuICBpZiAoY3R4KSB7XG4gICAgZGVmZXIoZnVuY3Rpb24gKCkgeyBjYi5jYWxsKGN0eCkgfSwgMClcbiAgfSBlbHNlIHtcbiAgICBkZWZlcihjYiwgMClcbiAgfVxufVxuXG4vKipcbiAqIERldGVjdCBpZiB3ZSBhcmUgaW4gSUU5Li4uXG4gKlxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cblxuZXhwb3J0cy5pc0lFOSA9XG4gIGluQnJvd3NlciAmJlxuICBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ01TSUUgOS4wJykgPiAwXG5cbi8qKlxuICogU25pZmYgdHJhbnNpdGlvbi9hbmltYXRpb24gZXZlbnRzXG4gKi9cblxuaWYgKGluQnJvd3NlciAmJiAhZXhwb3J0cy5pc0lFOSkge1xuICB2YXIgaXNXZWJraXRUcmFucyA9XG4gICAgd2luZG93Lm9udHJhbnNpdGlvbmVuZCA9PT0gdW5kZWZpbmVkICYmXG4gICAgd2luZG93Lm9ud2Via2l0dHJhbnNpdGlvbmVuZCAhPT0gdW5kZWZpbmVkXG4gIHZhciBpc1dlYmtpdEFuaW0gPVxuICAgIHdpbmRvdy5vbmFuaW1hdGlvbmVuZCA9PT0gdW5kZWZpbmVkICYmXG4gICAgd2luZG93Lm9ud2Via2l0YW5pbWF0aW9uZW5kICE9PSB1bmRlZmluZWRcbiAgZXhwb3J0cy50cmFuc2l0aW9uUHJvcCA9IGlzV2Via2l0VHJhbnNcbiAgICA/ICdXZWJraXRUcmFuc2l0aW9uJ1xuICAgIDogJ3RyYW5zaXRpb24nXG4gIGV4cG9ydHMudHJhbnNpdGlvbkVuZEV2ZW50ID0gaXNXZWJraXRUcmFuc1xuICAgID8gJ3dlYmtpdFRyYW5zaXRpb25FbmQnXG4gICAgOiAndHJhbnNpdGlvbmVuZCdcbiAgZXhwb3J0cy5hbmltYXRpb25Qcm9wID0gaXNXZWJraXRBbmltXG4gICAgPyAnV2Via2l0QW5pbWF0aW9uJ1xuICAgIDogJ2FuaW1hdGlvbidcbiAgZXhwb3J0cy5hbmltYXRpb25FbmRFdmVudCA9IGlzV2Via2l0QW5pbVxuICAgID8gJ3dlYmtpdEFuaW1hdGlvbkVuZCdcbiAgICA6ICdhbmltYXRpb25lbmQnXG59XG59LHt9XSw1OTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4vZGVidWcnKVxuXG4vKipcbiAqIFJlc29sdmUgcmVhZCAmIHdyaXRlIGZpbHRlcnMgZm9yIGEgdm0gaW5zdGFuY2UuIFRoZVxuICogZmlsdGVycyBkZXNjcmlwdG9yIEFycmF5IGNvbWVzIGZyb20gdGhlIGRpcmVjdGl2ZSBwYXJzZXIuXG4gKlxuICogVGhpcyBpcyBleHRyYWN0ZWQgaW50byBpdHMgb3duIHV0aWxpdHkgc28gaXQgY2FuXG4gKiBiZSB1c2VkIGluIG11bHRpcGxlIHNjZW5hcmlvcy5cbiAqXG4gKiBAcGFyYW0ge1Z1ZX0gdm1cbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gZmlsdGVyc1xuICogQHBhcmFtIHtPYmplY3R9IFt0YXJnZXRdXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZXhwb3J0cy5yZXNvbHZlRmlsdGVycyA9IGZ1bmN0aW9uICh2bSwgZmlsdGVycywgdGFyZ2V0KSB7XG4gIGlmICghZmlsdGVycykge1xuICAgIHJldHVyblxuICB9XG4gIHZhciByZXMgPSB0YXJnZXQgfHwge31cbiAgLy8gdmFyIHJlZ2lzdHJ5ID0gdm0uJG9wdGlvbnMuZmlsdGVyc1xuICBmaWx0ZXJzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICB2YXIgZGVmID0gdm0uJG9wdGlvbnMuZmlsdGVyc1tmLm5hbWVdXG4gICAgXy5hc3NlcnRBc3NldChkZWYsICdmaWx0ZXInLCBmLm5hbWUpXG4gICAgaWYgKCFkZWYpIHJldHVyblxuICAgIHZhciBhcmdzID0gZi5hcmdzXG4gICAgdmFyIHJlYWRlciwgd3JpdGVyXG4gICAgaWYgKHR5cGVvZiBkZWYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJlYWRlciA9IGRlZlxuICAgIH0gZWxzZSB7XG4gICAgICByZWFkZXIgPSBkZWYucmVhZFxuICAgICAgd3JpdGVyID0gZGVmLndyaXRlXG4gICAgfVxuICAgIGlmIChyZWFkZXIpIHtcbiAgICAgIGlmICghcmVzLnJlYWQpIHJlcy5yZWFkID0gW11cbiAgICAgIHJlcy5yZWFkLnB1c2goZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBhcmdzXG4gICAgICAgICAgPyByZWFkZXIuYXBwbHkodm0sIFt2YWx1ZV0uY29uY2F0KGFyZ3MpKVxuICAgICAgICAgIDogcmVhZGVyLmNhbGwodm0sIHZhbHVlKVxuICAgICAgfSlcbiAgICB9XG4gICAgaWYgKHdyaXRlcikge1xuICAgICAgaWYgKCFyZXMud3JpdGUpIHJlcy53cml0ZSA9IFtdXG4gICAgICByZXMud3JpdGUucHVzaChmdW5jdGlvbiAodmFsdWUsIG9sZFZhbCkge1xuICAgICAgICByZXR1cm4gYXJnc1xuICAgICAgICAgID8gd3JpdGVyLmFwcGx5KHZtLCBbdmFsdWUsIG9sZFZhbF0uY29uY2F0KGFyZ3MpKVxuICAgICAgICAgIDogd3JpdGVyLmNhbGwodm0sIHZhbHVlLCBvbGRWYWwpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcbiAgcmV0dXJuIHJlc1xufVxuXG4vKipcbiAqIEFwcGx5IGZpbHRlcnMgdG8gYSB2YWx1ZVxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEBwYXJhbSB7QXJyYXl9IGZpbHRlcnNcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHsqfSBvbGRWYWxcbiAqIEByZXR1cm4geyp9XG4gKi9cblxuZXhwb3J0cy5hcHBseUZpbHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIGZpbHRlcnMsIHZtLCBvbGRWYWwpIHtcbiAgaWYgKCFmaWx0ZXJzKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBmaWx0ZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhbHVlID0gZmlsdGVyc1tpXS5jYWxsKHZtLCB2YWx1ZSwgb2xkVmFsKVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxufSx7XCIuL2RlYnVnXCI6NTZ9XSw2MDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgbGFuZyAgID0gcmVxdWlyZSgnLi9sYW5nJylcbnZhciBleHRlbmQgPSBsYW5nLmV4dGVuZFxuXG5leHRlbmQoZXhwb3J0cywgbGFuZylcbmV4dGVuZChleHBvcnRzLCByZXF1aXJlKCcuL2VudicpKVxuZXh0ZW5kKGV4cG9ydHMsIHJlcXVpcmUoJy4vZG9tJykpXG5leHRlbmQoZXhwb3J0cywgcmVxdWlyZSgnLi9maWx0ZXInKSlcbmV4dGVuZChleHBvcnRzLCByZXF1aXJlKCcuL2RlYnVnJykpXG59LHtcIi4vZGVidWdcIjo1NixcIi4vZG9tXCI6NTcsXCIuL2VudlwiOjU4LFwiLi9maWx0ZXJcIjo1OSxcIi4vbGFuZ1wiOjYxfV0sNjE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLyoqXG4gKiBDaGVjayBpcyBhIHN0cmluZyBzdGFydHMgd2l0aCAkIG9yIF9cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbmV4cG9ydHMuaXNSZXNlcnZlZCA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgdmFyIGMgPSBzdHIuY2hhckNvZGVBdCgwKVxuICByZXR1cm4gYyA9PT0gMHgyNCB8fCBjID09PSAweDVGXG59XG5cbi8qKlxuICogR3VhcmQgdGV4dCBvdXRwdXQsIG1ha2Ugc3VyZSB1bmRlZmluZWQgb3V0cHV0c1xuICogZW1wdHkgc3RyaW5nXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmV4cG9ydHMudG9TdHJpbmcgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09IG51bGxcbiAgICA/ICcnXG4gICAgOiB2YWx1ZS50b1N0cmluZygpXG59XG5cbi8qKlxuICogQ2hlY2sgYW5kIGNvbnZlcnQgcG9zc2libGUgbnVtZXJpYyBudW1iZXJzIGJlZm9yZVxuICogc2V0dGluZyBiYWNrIHRvIGRhdGFcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJuIHsqfE51bWJlcn1cbiAqL1xuXG5leHBvcnRzLnRvTnVtYmVyID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiAoXG4gICAgaXNOYU4odmFsdWUpIHx8XG4gICAgdmFsdWUgPT09IG51bGwgfHxcbiAgICB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJ1xuICApID8gdmFsdWVcbiAgICA6IE51bWJlcih2YWx1ZSlcbn1cblxuLyoqXG4gKiBTdHJpcCBxdW90ZXMgZnJvbSBhIHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge1N0cmluZyB8IGZhbHNlfVxuICovXG5cbmV4cG9ydHMuc3RyaXBRdW90ZXMgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHZhciBhID0gc3RyLmNoYXJDb2RlQXQoMClcbiAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChzdHIubGVuZ3RoIC0gMSlcbiAgcmV0dXJuIGEgPT09IGIgJiYgKGEgPT09IDB4MjIgfHwgYSA9PT0gMHgyNylcbiAgICA/IHN0ci5zbGljZSgxLCAtMSlcbiAgICA6IGZhbHNlXG59XG5cbi8qKlxuICogQ2FtZWxpemUgYSBoeXBoZW4tZGVsbWl0ZWQgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG52YXIgY2FtZWxSRSA9IC9bLV9dKFxcdykvZ1xudmFyIGNhcGl0YWxDYW1lbFJFID0gLyg/Ol58Wy1fXSkoXFx3KS9nXG5cbmV4cG9ydHMuY2FtZWxpemUgPSBmdW5jdGlvbiAoc3RyLCBjYXApIHtcbiAgdmFyIFJFID0gY2FwID8gY2FwaXRhbENhbWVsUkUgOiBjYW1lbFJFXG4gIHJldHVybiBzdHIucmVwbGFjZShSRSwgZnVuY3Rpb24gKF8sIGMpIHtcbiAgICByZXR1cm4gYyA/IGMudG9VcHBlckNhc2UgKCkgOiAnJ1xuICB9KVxufVxuXG4vKipcbiAqIFNpbXBsZSBiaW5kLCBmYXN0ZXIgdGhhbiBuYXRpdmVcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtPYmplY3R9IGN0eFxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblxuZXhwb3J0cy5iaW5kID0gZnVuY3Rpb24gKGZuLCBjdHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZm4uYXBwbHkoY3R4LCBhcmd1bWVudHMpXG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIEFycmF5LWxpa2Ugb2JqZWN0IHRvIGEgcmVhbCBBcnJheS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5LWxpa2V9IGxpc3RcbiAqIEBwYXJhbSB7TnVtYmVyfSBbc3RhcnRdIC0gc3RhcnQgaW5kZXhcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5cbmV4cG9ydHMudG9BcnJheSA9IGZ1bmN0aW9uIChsaXN0LCBzdGFydCkge1xuICBzdGFydCA9IHN0YXJ0IHx8IDBcbiAgdmFyIGkgPSBsaXN0Lmxlbmd0aCAtIHN0YXJ0XG4gIHZhciByZXQgPSBuZXcgQXJyYXkoaSlcbiAgd2hpbGUgKGktLSkge1xuICAgIHJldFtpXSA9IGxpc3RbaSArIHN0YXJ0XVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuLyoqXG4gKiBNaXggcHJvcGVydGllcyBpbnRvIHRhcmdldCBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICovXG5cbmV4cG9ydHMuZXh0ZW5kID0gZnVuY3Rpb24gKHRvLCBmcm9tKSB7XG4gIGZvciAodmFyIGtleSBpbiBmcm9tKSB7XG4gICAgdG9ba2V5XSA9IGZyb21ba2V5XVxuICB9XG4gIHJldHVybiB0b1xufVxuXG4vKipcbiAqIFF1aWNrIG9iamVjdCBjaGVjayAtIHRoaXMgaXMgcHJpbWFyaWx5IHVzZWQgdG8gdGVsbFxuICogT2JqZWN0cyBmcm9tIHByaW1pdGl2ZSB2YWx1ZXMgd2hlbiB3ZSBrbm93IHRoZSB2YWx1ZVxuICogaXMgYSBKU09OLWNvbXBsaWFudCB0eXBlLlxuICpcbiAqIEBwYXJhbSB7Kn0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbmV4cG9ydHMuaXNPYmplY3QgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCdcbn1cblxuLyoqXG4gKiBTdHJpY3Qgb2JqZWN0IHR5cGUgY2hlY2suIE9ubHkgcmV0dXJucyB0cnVlXG4gKiBmb3IgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3RzLlxuICpcbiAqIEBwYXJhbSB7Kn0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcbmV4cG9ydHMuaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgT2JqZWN0XSdcbn1cblxuLyoqXG4gKiBBcnJheSB0eXBlIGNoZWNrLlxuICpcbiAqIEBwYXJhbSB7Kn0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbmV4cG9ydHMuaXNBcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkob2JqKVxufVxuXG4vKipcbiAqIERlZmluZSBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHsqfSB2YWxcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2VudW1lcmFibGVdXG4gKi9cblxuZXhwb3J0cy5kZWZpbmUgPSBmdW5jdGlvbiAob2JqLCBrZXksIHZhbCwgZW51bWVyYWJsZSkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHtcbiAgICB2YWx1ZSAgICAgICAgOiB2YWwsXG4gICAgZW51bWVyYWJsZSAgIDogISFlbnVtZXJhYmxlLFxuICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgY29uZmlndXJhYmxlIDogdHJ1ZVxuICB9KVxufVxufSx7fV0sNjI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIF8gPSByZXF1aXJlKCcuL2luZGV4JylcbnZhciBleHRlbmQgPSBfLmV4dGVuZFxuXG4vKipcbiAqIE9wdGlvbiBvdmVyd3JpdGluZyBzdHJhdGVnaWVzIGFyZSBmdW5jdGlvbnMgdGhhdCBoYW5kbGVcbiAqIGhvdyB0byBtZXJnZSBhIHBhcmVudCBvcHRpb24gdmFsdWUgYW5kIGEgY2hpbGQgb3B0aW9uXG4gKiB2YWx1ZSBpbnRvIHRoZSBmaW5hbCB2YWx1ZS5cbiAqXG4gKiBBbGwgc3RyYXRlZ3kgZnVuY3Rpb25zIGZvbGxvdyB0aGUgc2FtZSBzaWduYXR1cmU6XG4gKlxuICogQHBhcmFtIHsqfSBwYXJlbnRWYWxcbiAqIEBwYXJhbSB7Kn0gY2hpbGRWYWxcbiAqIEBwYXJhbSB7VnVlfSBbdm1dXG4gKi9cblxudmFyIHN0cmF0cyA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuLyoqXG4gKiBIZWxwZXIgdGhhdCByZWN1cnNpdmVseSBtZXJnZXMgdHdvIGRhdGEgb2JqZWN0cyB0b2dldGhlci5cbiAqL1xuXG5mdW5jdGlvbiBtZXJnZURhdGEgKHRvLCBmcm9tKSB7XG4gIHZhciBrZXksIHRvVmFsLCBmcm9tVmFsXG4gIGZvciAoa2V5IGluIGZyb20pIHtcbiAgICB0b1ZhbCA9IHRvW2tleV1cbiAgICBmcm9tVmFsID0gZnJvbVtrZXldXG4gICAgaWYgKCF0by5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICB0by4kYWRkKGtleSwgZnJvbVZhbClcbiAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3QodG9WYWwpICYmIF8uaXNPYmplY3QoZnJvbVZhbCkpIHtcbiAgICAgIG1lcmdlRGF0YSh0b1ZhbCwgZnJvbVZhbClcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRvXG59XG5cbi8qKlxuICogRGF0YVxuICovXG5cbnN0cmF0cy5kYXRhID0gZnVuY3Rpb24gKHBhcmVudFZhbCwgY2hpbGRWYWwsIHZtKSB7XG4gIGlmICghdm0pIHtcbiAgICAvLyBpbiBhIFZ1ZS5leHRlbmQgbWVyZ2UsIGJvdGggc2hvdWxkIGJlIGZ1bmN0aW9uc1xuICAgIGlmICghY2hpbGRWYWwpIHtcbiAgICAgIHJldHVybiBwYXJlbnRWYWxcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBjaGlsZFZhbCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgXy53YXJuKFxuICAgICAgICAnVGhlIFwiZGF0YVwiIG9wdGlvbiBzaG91bGQgYmUgYSBmdW5jdGlvbiAnICtcbiAgICAgICAgJ3RoYXQgcmV0dXJucyBhIHBlci1pbnN0YW5jZSB2YWx1ZSBpbiBjb21wb25lbnQgJyArXG4gICAgICAgICdkZWZpbml0aW9ucy4nXG4gICAgICApXG4gICAgICByZXR1cm4gcGFyZW50VmFsXG4gICAgfVxuICAgIGlmICghcGFyZW50VmFsKSB7XG4gICAgICByZXR1cm4gY2hpbGRWYWxcbiAgICB9XG4gICAgLy8gd2hlbiBwYXJlbnRWYWwgJiBjaGlsZFZhbCBhcmUgYm90aCBwcmVzZW50LFxuICAgIC8vIHdlIG5lZWQgdG8gcmV0dXJuIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAgIC8vIG1lcmdlZCByZXN1bHQgb2YgYm90aCBmdW5jdGlvbnMuLi4gbm8gbmVlZCB0b1xuICAgIC8vIGNoZWNrIGlmIHBhcmVudFZhbCBpcyBhIGZ1bmN0aW9uIGhlcmUgYmVjYXVzZVxuICAgIC8vIGl0IGhhcyB0byBiZSBhIGZ1bmN0aW9uIHRvIHBhc3MgcHJldmlvdXMgbWVyZ2VzLlxuICAgIHJldHVybiBmdW5jdGlvbiBtZXJnZWREYXRhRm4gKCkge1xuICAgICAgcmV0dXJuIG1lcmdlRGF0YShcbiAgICAgICAgY2hpbGRWYWwuY2FsbCh0aGlzKSxcbiAgICAgICAgcGFyZW50VmFsLmNhbGwodGhpcylcbiAgICAgIClcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gaW5zdGFuY2UgbWVyZ2UsIHJldHVybiByYXcgb2JqZWN0XG4gICAgdmFyIGluc3RhbmNlRGF0YSA9IHR5cGVvZiBjaGlsZFZhbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgPyBjaGlsZFZhbC5jYWxsKHZtKVxuICAgICAgOiBjaGlsZFZhbFxuICAgIHZhciBkZWZhdWx0RGF0YSA9IHR5cGVvZiBwYXJlbnRWYWwgPT09ICdmdW5jdGlvbidcbiAgICAgID8gcGFyZW50VmFsLmNhbGwodm0pXG4gICAgICA6IHVuZGVmaW5lZFxuICAgIGlmIChpbnN0YW5jZURhdGEpIHtcbiAgICAgIHJldHVybiBtZXJnZURhdGEoaW5zdGFuY2VEYXRhLCBkZWZhdWx0RGF0YSlcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRlZmF1bHREYXRhXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRWxcbiAqL1xuXG5zdHJhdHMuZWwgPSBmdW5jdGlvbiAocGFyZW50VmFsLCBjaGlsZFZhbCwgdm0pIHtcbiAgaWYgKCF2bSAmJiBjaGlsZFZhbCAmJiB0eXBlb2YgY2hpbGRWYWwgIT09ICdmdW5jdGlvbicpIHtcbiAgICBfLndhcm4oXG4gICAgICAnVGhlIFwiZWxcIiBvcHRpb24gc2hvdWxkIGJlIGEgZnVuY3Rpb24gJyArXG4gICAgICAndGhhdCByZXR1cm5zIGEgcGVyLWluc3RhbmNlIHZhbHVlIGluIGNvbXBvbmVudCAnICtcbiAgICAgICdkZWZpbml0aW9ucy4nXG4gICAgKVxuICAgIHJldHVyblxuICB9XG4gIHZhciByZXQgPSBjaGlsZFZhbCB8fCBwYXJlbnRWYWxcbiAgLy8gaW52b2tlIHRoZSBlbGVtZW50IGZhY3RvcnkgaWYgdGhpcyBpcyBpbnN0YW5jZSBtZXJnZVxuICByZXR1cm4gdm0gJiYgdHlwZW9mIHJldCA9PT0gJ2Z1bmN0aW9uJ1xuICAgID8gcmV0LmNhbGwodm0pXG4gICAgOiByZXRcbn1cblxuLyoqXG4gKiBIb29rcyBhbmQgcGFyYW0gYXR0cmlidXRlcyBhcmUgbWVyZ2VkIGFzIGFycmF5cy5cbiAqL1xuXG5zdHJhdHMuY3JlYXRlZCA9XG5zdHJhdHMucmVhZHkgPVxuc3RyYXRzLmF0dGFjaGVkID1cbnN0cmF0cy5kZXRhY2hlZCA9XG5zdHJhdHMuYmVmb3JlQ29tcGlsZSA9XG5zdHJhdHMuY29tcGlsZWQgPVxuc3RyYXRzLmJlZm9yZURlc3Ryb3kgPVxuc3RyYXRzLmRlc3Ryb3llZCA9XG5zdHJhdHMucGFyYW1BdHRyaWJ1dGVzID0gZnVuY3Rpb24gKHBhcmVudFZhbCwgY2hpbGRWYWwpIHtcbiAgcmV0dXJuIGNoaWxkVmFsXG4gICAgPyBwYXJlbnRWYWxcbiAgICAgID8gcGFyZW50VmFsLmNvbmNhdChjaGlsZFZhbClcbiAgICAgIDogXy5pc0FycmF5KGNoaWxkVmFsKVxuICAgICAgICA/IGNoaWxkVmFsXG4gICAgICAgIDogW2NoaWxkVmFsXVxuICAgIDogcGFyZW50VmFsXG59XG5cbi8qKlxuICogQXNzZXRzXG4gKlxuICogV2hlbiBhIHZtIGlzIHByZXNlbnQgKGluc3RhbmNlIGNyZWF0aW9uKSwgd2UgbmVlZCB0byBkb1xuICogYSB0aHJlZS13YXkgbWVyZ2UgYmV0d2VlbiBjb25zdHJ1Y3RvciBvcHRpb25zLCBpbnN0YW5jZVxuICogb3B0aW9ucyBhbmQgcGFyZW50IG9wdGlvbnMuXG4gKi9cblxuc3RyYXRzLmRpcmVjdGl2ZXMgPVxuc3RyYXRzLmZpbHRlcnMgPVxuc3RyYXRzLnBhcnRpYWxzID1cbnN0cmF0cy50cmFuc2l0aW9ucyA9XG5zdHJhdHMuY29tcG9uZW50cyA9IGZ1bmN0aW9uIChwYXJlbnRWYWwsIGNoaWxkVmFsLCB2bSwga2V5KSB7XG4gIHZhciByZXQgPSBPYmplY3QuY3JlYXRlKFxuICAgIHZtICYmIHZtLiRwYXJlbnRcbiAgICAgID8gdm0uJHBhcmVudC4kb3B0aW9uc1trZXldXG4gICAgICA6IF8uVnVlLm9wdGlvbnNba2V5XVxuICApXG4gIGlmIChwYXJlbnRWYWwpIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBhcmVudFZhbClcbiAgICB2YXIgaSA9IGtleXMubGVuZ3RoXG4gICAgdmFyIGZpZWxkXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgZmllbGQgPSBrZXlzW2ldXG4gICAgICByZXRbZmllbGRdID0gcGFyZW50VmFsW2ZpZWxkXVxuICAgIH1cbiAgfVxuICBpZiAoY2hpbGRWYWwpIGV4dGVuZChyZXQsIGNoaWxkVmFsKVxuICByZXR1cm4gcmV0XG59XG5cbi8qKlxuICogRXZlbnRzICYgV2F0Y2hlcnMuXG4gKlxuICogRXZlbnRzICYgd2F0Y2hlcnMgaGFzaGVzIHNob3VsZCBub3Qgb3ZlcndyaXRlIG9uZVxuICogYW5vdGhlciwgc28gd2UgbWVyZ2UgdGhlbSBhcyBhcnJheXMuXG4gKi9cblxuc3RyYXRzLndhdGNoID1cbnN0cmF0cy5ldmVudHMgPSBmdW5jdGlvbiAocGFyZW50VmFsLCBjaGlsZFZhbCkge1xuICBpZiAoIWNoaWxkVmFsKSByZXR1cm4gcGFyZW50VmFsXG4gIGlmICghcGFyZW50VmFsKSByZXR1cm4gY2hpbGRWYWxcbiAgdmFyIHJldCA9IHt9XG4gIGV4dGVuZChyZXQsIHBhcmVudFZhbClcbiAgZm9yICh2YXIga2V5IGluIGNoaWxkVmFsKSB7XG4gICAgdmFyIHBhcmVudCA9IHJldFtrZXldXG4gICAgdmFyIGNoaWxkID0gY2hpbGRWYWxba2V5XVxuICAgIHJldFtrZXldID0gcGFyZW50XG4gICAgICA/IHBhcmVudC5jb25jYXQoY2hpbGQpXG4gICAgICA6IFtjaGlsZF1cbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbi8qKlxuICogT3RoZXIgb2JqZWN0IGhhc2hlcy5cbiAqL1xuXG5zdHJhdHMubWV0aG9kcyA9XG5zdHJhdHMuY29tcHV0ZWQgPSBmdW5jdGlvbiAocGFyZW50VmFsLCBjaGlsZFZhbCkge1xuICBpZiAoIWNoaWxkVmFsKSByZXR1cm4gcGFyZW50VmFsXG4gIGlmICghcGFyZW50VmFsKSByZXR1cm4gY2hpbGRWYWxcbiAgdmFyIHJldCA9IE9iamVjdC5jcmVhdGUocGFyZW50VmFsKVxuICBleHRlbmQocmV0LCBjaGlsZFZhbClcbiAgcmV0dXJuIHJldFxufVxuXG4vKipcbiAqIERlZmF1bHQgc3RyYXRlZ3kuXG4gKi9cblxudmFyIGRlZmF1bHRTdHJhdCA9IGZ1bmN0aW9uIChwYXJlbnRWYWwsIGNoaWxkVmFsKSB7XG4gIHJldHVybiBjaGlsZFZhbCA9PT0gdW5kZWZpbmVkXG4gICAgPyBwYXJlbnRWYWxcbiAgICA6IGNoaWxkVmFsXG59XG5cbi8qKlxuICogTWFrZSBzdXJlIGNvbXBvbmVudCBvcHRpb25zIGdldCBjb252ZXJ0ZWQgdG8gYWN0dWFsXG4gKiBjb25zdHJ1Y3RvcnMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudHNcbiAqL1xuXG5mdW5jdGlvbiBndWFyZENvbXBvbmVudHMgKGNvbXBvbmVudHMpIHtcbiAgaWYgKGNvbXBvbmVudHMpIHtcbiAgICB2YXIgZGVmXG4gICAgZm9yICh2YXIga2V5IGluIGNvbXBvbmVudHMpIHtcbiAgICAgIGRlZiA9IGNvbXBvbmVudHNba2V5XVxuICAgICAgaWYgKF8uaXNQbGFpbk9iamVjdChkZWYpKSB7XG4gICAgICAgIGRlZi5uYW1lID0ga2V5XG4gICAgICAgIGNvbXBvbmVudHNba2V5XSA9IF8uVnVlLmV4dGVuZChkZWYpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogTWVyZ2UgdHdvIG9wdGlvbiBvYmplY3RzIGludG8gYSBuZXcgb25lLlxuICogQ29yZSB1dGlsaXR5IHVzZWQgaW4gYm90aCBpbnN0YW50aWF0aW9uIGFuZCBpbmhlcml0YW5jZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyZW50XG4gKiBAcGFyYW0ge09iamVjdH0gY2hpbGRcbiAqIEBwYXJhbSB7VnVlfSBbdm1dIC0gaWYgdm0gaXMgcHJlc2VudCwgaW5kaWNhdGVzIHRoaXMgaXNcbiAqICAgICAgICAgICAgICAgICAgICAgYW4gaW5zdGFudGlhdGlvbiBtZXJnZS5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1lcmdlT3B0aW9ucyAocGFyZW50LCBjaGlsZCwgdm0pIHtcbiAgZ3VhcmRDb21wb25lbnRzKGNoaWxkLmNvbXBvbmVudHMpXG4gIHZhciBvcHRpb25zID0ge31cbiAgdmFyIGtleVxuICBpZiAoY2hpbGQubWl4aW5zKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjaGlsZC5taXhpbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBwYXJlbnQgPSBtZXJnZU9wdGlvbnMocGFyZW50LCBjaGlsZC5taXhpbnNbaV0sIHZtKVxuICAgIH1cbiAgfVxuICBmb3IgKGtleSBpbiBwYXJlbnQpIHtcbiAgICBtZXJnZShrZXkpXG4gIH1cbiAgZm9yIChrZXkgaW4gY2hpbGQpIHtcbiAgICBpZiAoIShwYXJlbnQuaGFzT3duUHJvcGVydHkoa2V5KSkpIHtcbiAgICAgIG1lcmdlKGtleSlcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gbWVyZ2UgKGtleSkge1xuICAgIHZhciBzdHJhdCA9IHN0cmF0c1trZXldIHx8IGRlZmF1bHRTdHJhdFxuICAgIG9wdGlvbnNba2V5XSA9IHN0cmF0KHBhcmVudFtrZXldLCBjaGlsZFtrZXldLCB2bSwga2V5KVxuICB9XG4gIHJldHVybiBvcHRpb25zXG59XG59LHtcIi4vaW5kZXhcIjo2MH1dLDYzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBfID0gcmVxdWlyZSgnLi91dGlsJylcbnZhciBleHRlbmQgPSBfLmV4dGVuZFxuXG4vKipcbiAqIFRoZSBleHBvc2VkIFZ1ZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBBUEkgY29udmVudGlvbnM6XG4gKiAtIHB1YmxpYyBBUEkgbWV0aG9kcy9wcm9wZXJ0aWVzIGFyZSBwcmVmaWV4ZWQgd2l0aCBgJGBcbiAqIC0gaW50ZXJuYWwgbWV0aG9kcy9wcm9wZXJ0aWVzIGFyZSBwcmVmaXhlZCB3aXRoIGBfYFxuICogLSBub24tcHJlZml4ZWQgcHJvcGVydGllcyBhcmUgYXNzdW1lZCB0byBiZSBwcm94aWVkIHVzZXJcbiAqICAgZGF0YS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBWdWUgKG9wdGlvbnMpIHtcbiAgdGhpcy5faW5pdChvcHRpb25zKVxufVxuXG4vKipcbiAqIE1peGluIGdsb2JhbCBBUElcbiAqL1xuXG5leHRlbmQoVnVlLCByZXF1aXJlKCcuL2FwaS9nbG9iYWwnKSlcblxuLyoqXG4gKiBWdWUgYW5kIGV2ZXJ5IGNvbnN0cnVjdG9yIHRoYXQgZXh0ZW5kcyBWdWUgaGFzIGFuXG4gKiBhc3NvY2lhdGVkIG9wdGlvbnMgb2JqZWN0LCB3aGljaCBjYW4gYmUgYWNjZXNzZWQgZHVyaW5nXG4gKiBjb21waWxhdGlvbiBzdGVwcyBhcyBgdGhpcy5jb25zdHJ1Y3Rvci5vcHRpb25zYC5cbiAqXG4gKiBUaGVzZSBjYW4gYmUgc2VlbiBhcyB0aGUgZGVmYXVsdCBvcHRpb25zIG9mIGV2ZXJ5XG4gKiBWdWUgaW5zdGFuY2UuXG4gKi9cblxuVnVlLm9wdGlvbnMgPSB7XG4gIGRpcmVjdGl2ZXMgIDogcmVxdWlyZSgnLi9kaXJlY3RpdmVzJyksXG4gIGZpbHRlcnMgICAgIDogcmVxdWlyZSgnLi9maWx0ZXJzJyksXG4gIHBhcnRpYWxzICAgIDoge30sXG4gIHRyYW5zaXRpb25zIDoge30sXG4gIGNvbXBvbmVudHMgIDoge31cbn1cblxuLyoqXG4gKiBCdWlsZCB1cCB0aGUgcHJvdG90eXBlXG4gKi9cblxudmFyIHAgPSBWdWUucHJvdG90eXBlXG5cbi8qKlxuICogJGRhdGEgaGFzIGEgc2V0dGVyIHdoaWNoIGRvZXMgYSBidW5jaCBvZlxuICogdGVhcmRvd24vc2V0dXAgd29ya1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwLCAnJGRhdGEnLCB7XG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9kYXRhXG4gIH0sXG4gIHNldDogZnVuY3Rpb24gKG5ld0RhdGEpIHtcbiAgICB0aGlzLl9zZXREYXRhKG5ld0RhdGEpXG4gIH1cbn0pXG5cbi8qKlxuICogTWl4aW4gaW50ZXJuYWwgaW5zdGFuY2UgbWV0aG9kc1xuICovXG5cbmV4dGVuZChwLCByZXF1aXJlKCcuL2luc3RhbmNlL2luaXQnKSlcbmV4dGVuZChwLCByZXF1aXJlKCcuL2luc3RhbmNlL2V2ZW50cycpKVxuZXh0ZW5kKHAsIHJlcXVpcmUoJy4vaW5zdGFuY2Uvc2NvcGUnKSlcbmV4dGVuZChwLCByZXF1aXJlKCcuL2luc3RhbmNlL2NvbXBpbGUnKSlcblxuLyoqXG4gKiBNaXhpbiBwdWJsaWMgQVBJIG1ldGhvZHNcbiAqL1xuXG5leHRlbmQocCwgcmVxdWlyZSgnLi9hcGkvZGF0YScpKVxuZXh0ZW5kKHAsIHJlcXVpcmUoJy4vYXBpL2RvbScpKVxuZXh0ZW5kKHAsIHJlcXVpcmUoJy4vYXBpL2V2ZW50cycpKVxuZXh0ZW5kKHAsIHJlcXVpcmUoJy4vYXBpL2NoaWxkJykpXG5leHRlbmQocCwgcmVxdWlyZSgnLi9hcGkvbGlmZWN5Y2xlJykpXG5cbm1vZHVsZS5leHBvcnRzID0gXy5WdWUgPSBWdWVcbn0se1wiLi9hcGkvY2hpbGRcIjozLFwiLi9hcGkvZGF0YVwiOjQsXCIuL2FwaS9kb21cIjo1LFwiLi9hcGkvZXZlbnRzXCI6NixcIi4vYXBpL2dsb2JhbFwiOjcsXCIuL2FwaS9saWZlY3ljbGVcIjo4LFwiLi9kaXJlY3RpdmVzXCI6MjMsXCIuL2ZpbHRlcnNcIjozOSxcIi4vaW5zdGFuY2UvY29tcGlsZVwiOjQwLFwiLi9pbnN0YW5jZS9ldmVudHNcIjo0MSxcIi4vaW5zdGFuY2UvaW5pdFwiOjQyLFwiLi9pbnN0YW5jZS9zY29wZVwiOjQzLFwiLi91dGlsXCI6NjB9XSw2NDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKVxudmFyIE9ic2VydmVyID0gcmVxdWlyZSgnLi9vYnNlcnZlcicpXG52YXIgZXhwUGFyc2VyID0gcmVxdWlyZSgnLi9wYXJzZXJzL2V4cHJlc3Npb24nKVxudmFyIGJhdGNoZXIgPSByZXF1aXJlKCcuL2JhdGNoZXInKVxudmFyIHVpZCA9IDBcblxuLyoqXG4gKiBBIHdhdGNoZXIgcGFyc2VzIGFuIGV4cHJlc3Npb24sIGNvbGxlY3RzIGRlcGVuZGVuY2llcyxcbiAqIGFuZCBmaXJlcyBjYWxsYmFjayB3aGVuIHRoZSBleHByZXNzaW9uIHZhbHVlIGNoYW5nZXMuXG4gKiBUaGlzIGlzIHVzZWQgZm9yIGJvdGggdGhlICR3YXRjaCgpIGFwaSBhbmQgZGlyZWN0aXZlcy5cbiAqXG4gKiBAcGFyYW0ge1Z1ZX0gdm1cbiAqIEBwYXJhbSB7U3RyaW5nfSBleHByZXNzaW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqICAgICAgICAgICAgICAgICAtIHtBcnJheX0gZmlsdGVyc1xuICogICAgICAgICAgICAgICAgIC0ge0Jvb2xlYW59IHR3b1dheVxuICogICAgICAgICAgICAgICAgIC0ge0Jvb2xlYW59IGRlZXBcbiAqICAgICAgICAgICAgICAgICAtIHtCb29sZWFufSB1c2VyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG5mdW5jdGlvbiBXYXRjaGVyICh2bSwgZXhwcmVzc2lvbiwgY2IsIG9wdGlvbnMpIHtcbiAgdGhpcy52bSA9IHZtXG4gIHZtLl93YXRjaGVyTGlzdC5wdXNoKHRoaXMpXG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb25cbiAgdGhpcy5jYnMgPSBbY2JdXG4gIHRoaXMuaWQgPSArK3VpZCAvLyB1aWQgZm9yIGJhdGNoaW5nXG4gIHRoaXMuYWN0aXZlID0gdHJ1ZVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICB0aGlzLmRlZXAgPSBvcHRpb25zLmRlZXBcbiAgdGhpcy51c2VyID0gb3B0aW9ucy51c2VyXG4gIHRoaXMuZGVwcyA9IE9iamVjdC5jcmVhdGUobnVsbClcbiAgLy8gc2V0dXAgZmlsdGVycyBpZiBhbnkuXG4gIC8vIFdlIGRlbGVnYXRlIGRpcmVjdGl2ZSBmaWx0ZXJzIGhlcmUgdG8gdGhlIHdhdGNoZXJcbiAgLy8gYmVjYXVzZSB0aGV5IG5lZWQgdG8gYmUgaW5jbHVkZWQgaW4gdGhlIGRlcGVuZGVuY3lcbiAgLy8gY29sbGVjdGlvbiBwcm9jZXNzLlxuICBpZiAob3B0aW9ucy5maWx0ZXJzKSB7XG4gICAgdGhpcy5yZWFkRmlsdGVycyA9IG9wdGlvbnMuZmlsdGVycy5yZWFkXG4gICAgdGhpcy53cml0ZUZpbHRlcnMgPSBvcHRpb25zLmZpbHRlcnMud3JpdGVcbiAgfVxuICAvLyBwYXJzZSBleHByZXNzaW9uIGZvciBnZXR0ZXIvc2V0dGVyXG4gIHZhciByZXMgPSBleHBQYXJzZXIucGFyc2UoZXhwcmVzc2lvbiwgb3B0aW9ucy50d29XYXkpXG4gIHRoaXMuZ2V0dGVyID0gcmVzLmdldFxuICB0aGlzLnNldHRlciA9IHJlcy5zZXRcbiAgdGhpcy52YWx1ZSA9IHRoaXMuZ2V0KClcbn1cblxudmFyIHAgPSBXYXRjaGVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEFkZCBhIGRlcGVuZGVuY3kgdG8gdGhpcyBkaXJlY3RpdmUuXG4gKlxuICogQHBhcmFtIHtEZXB9IGRlcFxuICovXG5cbnAuYWRkRGVwID0gZnVuY3Rpb24gKGRlcCkge1xuICB2YXIgaWQgPSBkZXAuaWRcbiAgaWYgKCF0aGlzLm5ld0RlcHNbaWRdKSB7XG4gICAgdGhpcy5uZXdEZXBzW2lkXSA9IGRlcFxuICAgIGlmICghdGhpcy5kZXBzW2lkXSkge1xuICAgICAgdGhpcy5kZXBzW2lkXSA9IGRlcFxuICAgICAgZGVwLmFkZFN1Yih0aGlzKVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEV2YWx1YXRlIHRoZSBnZXR0ZXIsIGFuZCByZS1jb2xsZWN0IGRlcGVuZGVuY2llcy5cbiAqL1xuXG5wLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5iZWZvcmVHZXQoKVxuICB2YXIgdm0gPSB0aGlzLnZtXG4gIHZhciB2YWx1ZVxuICB0cnkge1xuICAgIHZhbHVlID0gdGhpcy5nZXR0ZXIuY2FsbCh2bSwgdm0pXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBfLndhcm4oXG4gICAgICAnRXJyb3Igd2hlbiBldmFsdWF0aW5nIGV4cHJlc3Npb24gXCInICtcbiAgICAgIHRoaXMuZXhwcmVzc2lvbiArICdcIjpcXG4gICAnICsgZVxuICAgIClcbiAgfVxuICAvLyBcInRvdWNoXCIgZXZlcnkgcHJvcGVydHkgc28gdGhleSBhcmUgYWxsIHRyYWNrZWQgYXNcbiAgLy8gZGVwZW5kZW5jaWVzIGZvciBkZWVwIHdhdGNoaW5nXG4gIGlmICh0aGlzLmRlZXApIHtcbiAgICB0cmF2ZXJzZSh2YWx1ZSlcbiAgfVxuICB2YWx1ZSA9IF8uYXBwbHlGaWx0ZXJzKHZhbHVlLCB0aGlzLnJlYWRGaWx0ZXJzLCB2bSlcbiAgdGhpcy5hZnRlckdldCgpXG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIFNldCB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZSB3aXRoIHRoZSBzZXR0ZXIuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICovXG5cbnAuc2V0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHZhciB2bSA9IHRoaXMudm1cbiAgdmFsdWUgPSBfLmFwcGx5RmlsdGVycyhcbiAgICB2YWx1ZSwgdGhpcy53cml0ZUZpbHRlcnMsIHZtLCB0aGlzLnZhbHVlXG4gIClcbiAgdHJ5IHtcbiAgICB0aGlzLnNldHRlci5jYWxsKHZtLCB2bSwgdmFsdWUpXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBfLndhcm4oXG4gICAgICAnRXJyb3Igd2hlbiBldmFsdWF0aW5nIHNldHRlciBcIicgK1xuICAgICAgdGhpcy5leHByZXNzaW9uICsgJ1wiOlxcbiAgICcgKyBlXG4gICAgKVxuICB9XG59XG5cbi8qKlxuICogUHJlcGFyZSBmb3IgZGVwZW5kZW5jeSBjb2xsZWN0aW9uLlxuICovXG5cbnAuYmVmb3JlR2V0ID0gZnVuY3Rpb24gKCkge1xuICBPYnNlcnZlci50YXJnZXQgPSB0aGlzXG4gIHRoaXMubmV3RGVwcyA9IHt9XG59XG5cbi8qKlxuICogQ2xlYW4gdXAgZm9yIGRlcGVuZGVuY3kgY29sbGVjdGlvbi5cbiAqL1xuXG5wLmFmdGVyR2V0ID0gZnVuY3Rpb24gKCkge1xuICBPYnNlcnZlci50YXJnZXQgPSBudWxsXG4gIGZvciAodmFyIGlkIGluIHRoaXMuZGVwcykge1xuICAgIGlmICghdGhpcy5uZXdEZXBzW2lkXSkge1xuICAgICAgdGhpcy5kZXBzW2lkXS5yZW1vdmVTdWIodGhpcylcbiAgICB9XG4gIH1cbiAgdGhpcy5kZXBzID0gdGhpcy5uZXdEZXBzXG59XG5cbi8qKlxuICogU3Vic2NyaWJlciBpbnRlcmZhY2UuXG4gKiBXaWxsIGJlIGNhbGxlZCB3aGVuIGEgZGVwZW5kZW5jeSBjaGFuZ2VzLlxuICovXG5cbnAudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICBpZiAoIWNvbmZpZy5hc3luYyB8fCBjb25maWcuZGVidWcpIHtcbiAgICB0aGlzLnJ1bigpXG4gIH0gZWxzZSB7XG4gICAgYmF0Y2hlci5wdXNoKHRoaXMpXG4gIH1cbn1cblxuLyoqXG4gKiBCYXRjaGVyIGpvYiBpbnRlcmZhY2UuXG4gKiBXaWxsIGJlIGNhbGxlZCBieSB0aGUgYmF0Y2hlci5cbiAqL1xuXG5wLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuYWN0aXZlKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5nZXQoKVxuICAgIGlmIChcbiAgICAgICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB8fFxuICAgICAgdmFsdWUgIT09IHRoaXMudmFsdWVcbiAgICApIHtcbiAgICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMudmFsdWVcbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZVxuICAgICAgdmFyIGNicyA9IHRoaXMuY2JzXG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNicy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgY2JzW2ldKHZhbHVlLCBvbGRWYWx1ZSlcbiAgICAgICAgLy8gaWYgYSBjYWxsYmFjayBhbHNvIHJlbW92ZWQgb3RoZXIgY2FsbGJhY2tzLFxuICAgICAgICAvLyB3ZSBuZWVkIHRvIGFkanVzdCB0aGUgbG9vcCBhY2NvcmRpbmdseS5cbiAgICAgICAgdmFyIHJlbW92ZWQgPSBsIC0gY2JzLmxlbmd0aFxuICAgICAgICBpZiAocmVtb3ZlZCkge1xuICAgICAgICAgIGkgLT0gcmVtb3ZlZFxuICAgICAgICAgIGwgLT0gcmVtb3ZlZFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQWRkIGEgY2FsbGJhY2suXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2JcbiAqL1xuXG5wLmFkZENiID0gZnVuY3Rpb24gKGNiKSB7XG4gIHRoaXMuY2JzLnB1c2goY2IpXG59XG5cbi8qKlxuICogUmVtb3ZlIGEgY2FsbGJhY2suXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2JcbiAqL1xuXG5wLnJlbW92ZUNiID0gZnVuY3Rpb24gKGNiKSB7XG4gIHZhciBjYnMgPSB0aGlzLmNic1xuICBpZiAoY2JzLmxlbmd0aCA+IDEpIHtcbiAgICB2YXIgaSA9IGNicy5pbmRleE9mKGNiKVxuICAgIGlmIChpID4gLTEpIHtcbiAgICAgIGNicy5zcGxpY2UoaSwgMSlcbiAgICB9XG4gIH0gZWxzZSBpZiAoY2IgPT09IGNic1swXSkge1xuICAgIHRoaXMudGVhcmRvd24oKVxuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlIHNlbGYgZnJvbSBhbGwgZGVwZW5kZW5jaWVzJyBzdWJjcmliZXIgbGlzdC5cbiAqL1xuXG5wLnRlYXJkb3duID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5hY3RpdmUpIHtcbiAgICAvLyByZW1vdmUgc2VsZiBmcm9tIHZtJ3Mgd2F0Y2hlciBsaXN0XG4gICAgLy8gd2UgY2FuIHNraXAgdGhpcyBpZiB0aGUgdm0gaWYgYmVpbmcgZGVzdHJveWVkXG4gICAgLy8gd2hpY2ggY2FuIGltcHJvdmUgdGVhcmRvd24gcGVyZm9ybWFuY2UuXG4gICAgaWYgKCF0aGlzLnZtLl9pc0JlaW5nRGVzdHJveWVkKSB7XG4gICAgICB2YXIgbGlzdCA9IHRoaXMudm0uX3dhdGNoZXJMaXN0XG4gICAgICBsaXN0LnNwbGljZShsaXN0LmluZGV4T2YodGhpcykpXG4gICAgfVxuICAgIGZvciAodmFyIGlkIGluIHRoaXMuZGVwcykge1xuICAgICAgdGhpcy5kZXBzW2lkXS5yZW1vdmVTdWIodGhpcylcbiAgICB9XG4gICAgdGhpcy5hY3RpdmUgPSBmYWxzZVxuICAgIHRoaXMudm0gPSB0aGlzLmNicyA9IHRoaXMudmFsdWUgPSBudWxsXG4gIH1cbn1cblxuXG4vKipcbiAqIFJlY3J1c2l2ZWx5IHRyYXZlcnNlIGFuIG9iamVjdCB0byBldm9rZSBhbGwgY29udmVydGVkXG4gKiBnZXR0ZXJzLCBzbyB0aGF0IGV2ZXJ5IG5lc3RlZCBwcm9wZXJ0eSBpbnNpZGUgdGhlIG9iamVjdFxuICogaXMgY29sbGVjdGVkIGFzIGEgXCJkZWVwXCIgZGVwZW5kZW5jeS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuZnVuY3Rpb24gdHJhdmVyc2UgKG9iaikge1xuICB2YXIga2V5LCB2YWwsIGlcbiAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgdmFsID0gb2JqW2tleV1cbiAgICBpZiAoXy5pc0FycmF5KHZhbCkpIHtcbiAgICAgIGkgPSB2YWwubGVuZ3RoXG4gICAgICB3aGlsZSAoaS0tKSB0cmF2ZXJzZSh2YWxbaV0pXG4gICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KHZhbCkpIHtcbiAgICAgIHRyYXZlcnNlKHZhbClcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXYXRjaGVyXG59LHtcIi4vYmF0Y2hlclwiOjksXCIuL2NvbmZpZ1wiOjEzLFwiLi9vYnNlcnZlclwiOjQ2LFwiLi9wYXJzZXJzL2V4cHJlc3Npb25cIjo0OSxcIi4vdXRpbFwiOjYwfV0sNjU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xucmVxdWlyZShcImluc2VydC1jc3NcIikoXCIucmVke2NvbG9yOnJlZH1cIik7XG52YXIgX192dWVfdGVtcGxhdGVfXyA9IFwiPGgxIGNsYXNzPVxcXCJyZWRcXFwiPnt7bXNnfX08L2gxPlwiO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBtc2c6ICdIZWxsbyB3b3JsZCFobydcbiAgICB9O1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy50ZW1wbGF0ZSA9IF9fdnVlX3RlbXBsYXRlX187XG5cbn0se1wiaW5zZXJ0LWNzc1wiOjJ9XX0se30sWzFdKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==