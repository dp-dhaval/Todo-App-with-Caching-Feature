const mongoose = require('mongoose');
const redis = require('redis');
const redisURL = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisURL);
const util = require('util');
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');
    return this;
}

mongoose.Query.prototype.exec = async function(){
// client.flushall();
// return;
    const key = JSON.stringify(Object.assign({},this.getQuery(),{
        collection:this.mongooseCollection.name
    }));

    const cacheValue = await client.hget(this.hashKey,key);

    if(cacheValue){
        const doc = JSON.parse(cacheValue);
        console.log('From Cache');
        return Array.isArray(doc) ? doc.map( ( d ) => new this.model(doc) ): new this.model(doc);
    }

    const result = await exec.apply(this,arguments);

    client.hset(this.hashKey,key,JSON.stringify(result),'EX',10);
    return result;

}

module.exports = {clearHash(hashKey){
    client.del(JSON.stringify(hashKey));
}};