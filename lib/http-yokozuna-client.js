var HttpSearchMeta = require('./http-search-meta');

/**
 * Initialize a Riak Yokozuna Search client.
 * Expects only a callback that's call to execute a search query, e.g.
 * in the HttpClient, therefore doesn't have any coupling to the
 * underlying transport.
 *
 * @param {Object} options
 * @param {Function} callback(meta)
 */
var HttpYokozunaClient = function HttpYokozunaClient(options, callback) {
  this._execute = callback;
  this._defaults = {resource: 'search/query', method: 'get'};

  // need to add the options to the defaults object so as to not overwrite them
  // for the calling http-client

  if (options.host) {
    this._defaults.host = options.host;
  }

  if (options.port) {
    this._defaults.port = options.port;
  }

  if (options.client) {
    this._defaults.client = options.client;
  }
};

/**
 * Add a solr schema to yokozuna
 *
 * @param {String} schemaName
 * @param {String} schemaXML
 * @param {Function} callback(err)
 *
 * @api public
 */
HttpYokozunaClient.prototype.createSchema = function(schemaName, schemaXML, callback) {
  var meta = new HttpSearchMeta(this._defaults, {resource: 'search'}, {contentType: "application/xml", method: 'put', callback: callback, index: 'schema', operation: schemaName, data: schemaXML});

  this._execute(meta);
};

/**
 * Add a search index to yokozuna
 *
 * @param {String} index
 * @param {String} schema
 * @param {Function} callback(err)
 *
 * @api public
 */
HttpYokozunaClient.prototype.createIndex = function(index, schema, callback) {
  if (typeof schema === 'function') {
    callback = schema;
    schema = "_yz_default";
  }

  var meta = new HttpSearchMeta(this._defaults, {resource: 'search'}, {method: 'put', callback: callback, index: 'index', operation: index, data: {schema: schema}});

  this._execute(meta);
};

/**
 * Remove a search index from yokozuna
 *
 * @param {String} index
 * @param {String} schema
 * @param {Function} callback(err)
 *
 * @api public
 */
HttpYokozunaClient.prototype.destroyIndex = function(index, callback) {
  var meta = new HttpSearchMeta(this._defaults, {resource: 'search'}, {method: "delete", callback: callback, index: 'index', operation: index});

  this._execute(meta);
};

/**
 * Associate a search index with a bucket
 *
 * @param {String} index
 * @param {String} bucket
 * @param {Function} callback(err)
 *
 * @api public
 */
HttpYokozunaClient.prototype.associateIndexWithBucket = function(index, bucket, callback) {
  var meta = new HttpSearchMeta(this._defaults, {resource: 'buckets'}, {method: 'put', callback: callback, index: bucket, operation: 'props', data: {props:{search_index: index}}});

  this._execute(meta);
};

/**
 * Clear a bucket's search index
 *
 * @param {String} bucket
 * @param {Function} callback(err)
 *
 * @api public
 */
HttpYokozunaClient.prototype.disassociateIndexFromBucket = function(bucket, callback) {
  var meta = new HttpSearchMeta(this._defaults, {resource: 'buckets'}, {method: 'put', callback: callback, index: bucket, operation: 'props', data: {props:{search_index: "_dont_index_"}}});

  this._execute(meta);
};

/**
 * Find a set of documents in Riak Yokozuna in the specified index.
 * The query must be a valid query string as described in the Riak Yokozuna
 * documentation.
 *
 * The options can include all query options supported by Riak Yokozuna.
 *
 * @param {String} index
 * @param {String} query
 * @param {Object} options
 * @param {Function} callback(err, data, meta
 */
HttpYokozunaClient.prototype.find = function(index, query, options, callback) {
  var meta = new HttpSearchMeta(this._defaults, options, {callback: callback, index: index, q: query, wt: 'json' });
  this._run(meta);
};


HttpYokozunaClient.prototype._run = function(meta) {
  var callback = meta.callback;
  meta.callback = function(err, data, meta) {
    if (err) {
      return callback(err, data, meta);
    }

    try {
      data = JSON.parse(data.toString());
    } catch (e) {
      return callback(e, e, meta);
    }
     if ( !data.response) data.response = {};

     data.response.facet_counts = data.facet_counts;
     data.response.stats = data.stats;
     data.response.grouped = data.grouped;

    callback(err, data.response,  meta);
  };
  this._execute(meta);
};

module.exports = HttpYokozunaClient;
