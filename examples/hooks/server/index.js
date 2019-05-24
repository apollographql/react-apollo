const express = require('express');
const { createServer } = require('http');
const { PubSub } = require('apollo-server');
const { ApolloServer, gql } = require('apollo-server-express');

const typeDefs = gql`
  type RocketInventory {
    id: ID!
    model: String!
    year: Int!
    stock: Int!
  }

  input RocketInput {
    model: String!
    year: Int!
    stock: Int!
  }

  type Message {
    id: ID!
    content: String!
  }

  type Query {
    rocketInventory: [RocketInventory]
  }

  type Mutation {
    saveRocket(rocket: RocketInput!): RocketInventory
  }

  type Subscription {
    latestNews: Message
  }
`;

const rocketInventoryData = [
  { id: 1, model: 'Titan I', year: 1965, stock: 3 },
  { id: 2, model: 'Saturn I', year: 1962, stock: 6 },
  { id: 3, model: 'Pegasus', year: 1990, stock: 2 },
  { id: 4, model: 'Falcon I', year: 2006, stock: 12 }
];
let counter = rocketInventoryData.length;

const messages = [
  { id: 0, content: 'Heads up - big demand for "Delta 5000"\'s!' },
  { id: 1, content: '"Atlas I" popularity seems to be decreasing.' },
  {
    id: 2,
    content:
      'If anyone can find a 1965 "Thor-Burner", let John in Department 51 know!'
  },
  {
    id: 3,
    content:
      'Demand for "Juno II"\'s might spike after an upcoming Netflix documentary launches. Stock up!'
  },
  {
    id: 4,
    content:
      'Hold all sales of "Minotaur I"\'s - NASA might be trying to undercut us.'
  }
];

const pubsub = new PubSub();
const LATEST_NEWS = 'LATEST_NEWS';

const resolvers = {
  Query: {
    rocketInventory() {
      return rocketInventoryData;
    }
  },

  Mutation: {
    saveRocket(_root, { rocket }) {
      if (rocket) {
        counter += 1;
        const data = {
          ...{ id: counter },
          ...rocket
        };
        rocketInventoryData.push(data);
        return data;
      } else {
        throw new Error(`Couldn't save rocket - variables: ${rocket})}`);
      }
    }
  },

  Subscription: {
    latestNews: {
      subscribe() {
        return pubsub.asyncIterator(LATEST_NEWS);
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers
});

const app = express();
server.applyMiddleware({ app });
const httpServer = createServer(app);
server.installSubscriptionHandlers(httpServer);

httpServer.listen(4000, () => {
  console.log('Server ready');

  let messageId = 0;
  pubsub.publish(LATEST_NEWS, {
    latestNews: messages[messageId]
  });
  setInterval(() => {
    messageId = messageId === 4 ? 0 : messageId + 1;
    pubsub.publish(LATEST_NEWS, {
      latestNews: messages[messageId]
    });
  }, 5000);
});
