const redis = require('redis');

// Create Redis client
const redisClient = () => {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Connected to Redis');
  });

  return client;
};

module.exports = redisClient; 